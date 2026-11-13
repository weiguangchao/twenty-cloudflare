import {
  type FailedMetadataValidationError,
  computeMetadataNameFromLabel,
} from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import { capitalize } from 'twenty-shared/utils';

import { MAX_FIELDS_PER_OBJECT } from '@/workspace/metadata/constants/max-fields-per-object.constant';
import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import {
  buildFieldRow,
  buildIndexRows,
} from '@/workspace/metadata/operations/utils/build-metadata-rows.util';
import {
  assertFieldNameAvailable,
  buildRelationPair,
  computeJoinColumnName,
  insertFields,
  insertIndex,
} from '@/workspace/metadata/operations/utils/field-schema.util';
import {
  findObjectFields,
  findObjectOrThrow,
} from '@/workspace/metadata/operations/utils/metadata-lookups.util';
import { normalizeFieldOptions } from '@/workspace/metadata/operations/utils/normalize-field-options.util';
import { addSearchField } from '@/workspace/metadata/operations/utils/search-field.util';
import {
  type CreateFieldInput,
  type RelationCreationPayload,
} from '@/workspace/metadata/types/field-metadata-inputs.type';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type ObjectMetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';
import { validateFieldOptions } from '@/workspace/metadata/validation/validate-field-options.util';
import { validateMetadataName } from '@/workspace/metadata/validation/validate-metadata-name.util';

const ENUM_FIELD_TYPES: string[] = [
  FieldMetadataType.SELECT,
  FieldMetadataType.MULTI_SELECT,
  FieldMetadataType.RATING,
];

const SYSTEM_ONLY_FIELD_TYPES: string[] = [FieldMetadataType.TS_VECTOR];

const failCreate = (
  input: CreateFieldInput,
  errors: FailedMetadataValidationError[],
): never => {
  throw MetadataValidationException.single({
    metadataName: 'fieldMetadata',
    type: 'create',
    errors,
    flatEntityMinimalInformation: {
      name: input.name,
      objectMetadataId: input.objectMetadataId,
    },
  });
};

const validateCreateFieldInput = (
  context: MetadataOperationContext,
  object: ObjectMetadataRow,
  input: CreateFieldInput,
) => {
  const errors = validateMetadataName(input.name, 'INVALID_FIELD_INPUT');

  if (
    input.isLabelSyncedWithName === true &&
    computeMetadataNameFromLabel({ label: input.label }) !== input.name
  ) {
    errors.push(
      metadataValidationError(
        'NAME_NOT_SYNCED_WITH_LABEL',
        'Name is not synced with label',
        input.name,
      ),
    );
  }
  if (SYSTEM_ONLY_FIELD_TYPES.includes(input.type)) {
    errors.push(
      metadataValidationError(
        'INVALID_FIELD_INPUT',
        `${input.type} fields are managed by the system`,
        input.type,
      ),
    );
  }
  if (
    findObjectFields(context.store, object.id).length >= MAX_FIELDS_PER_OBJECT
  ) {
    errors.push(
      metadataValidationError(
        'INVALID_FIELD_INPUT',
        `Objects cannot have more than ${MAX_FIELDS_PER_OBJECT} fields`,
        object.nameSingular,
      ),
    );
  }
  if (
    input.type === FieldMetadataType.RELATION &&
    !input.relationCreationPayload
  ) {
    errors.push(
      metadataValidationError(
        'INVALID_FIELD_INPUT',
        'Relation creation payload is required',
      ),
    );
  }
  if (
    input.type === FieldMetadataType.MORPH_RELATION &&
    (input.morphRelationsCreationPayload ?? []).length === 0
  ) {
    errors.push(
      metadataValidationError(
        'INVALID_FIELD_INPUT',
        'Morph relations creation payload is required',
      ),
    );
  }

  if (errors.length > 0) failCreate(input, errors);
};

const createRelationField = (
  context: MetadataOperationContext,
  object: ObjectMetadataRow,
  input: CreateFieldInput,
  payload: RelationCreationPayload,
  sourceFieldOverrides: Partial<FieldMetadataRow> = {},
) => {
  const targetObject = findObjectOrThrow(
    context.store,
    payload.targetObjectMetadataId,
    { metadataName: 'fieldMetadata', type: 'create' },
  );
  const targetFieldName = computeMetadataNameFromLabel({
    label: payload.targetFieldLabel,
  });

  assertFieldNameAvailable(context, targetObject, targetFieldName);
  // The join column lives on the MANY_TO_ONE side and must not shadow a field.
  if (payload.type === 'MANY_TO_ONE') {
    assertFieldNameAvailable(
      context,
      object,
      computeJoinColumnName(input.name),
    );
  } else {
    assertFieldNameAvailable(
      context,
      targetObject,
      computeJoinColumnName(targetFieldName),
    );
  }

  return buildRelationPair({
    sourceObject: object,
    targetObject,
    relationType: payload.type,
    sourceField: {
      name: input.name,
      label: input.label,
      isLabelSyncedWithName: input.isLabelSyncedWithName ?? false,
      ...(input.icon ? { icon: input.icon } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...sourceFieldOverrides,
    },
    targetField: {
      name: targetFieldName,
      label: payload.targetFieldLabel,
      ...(payload.targetFieldIcon ? { icon: payload.targetFieldIcon } : {}),
    },
  });
};

const computeMorphTargetFieldName = (
  fieldName: string,
  relationType: RelationCreationPayload['type'],
  targetObject: ObjectMetadataRow,
) =>
  `${fieldName}${capitalize(
    relationType === 'MANY_TO_ONE'
      ? targetObject.nameSingular
      : targetObject.namePlural,
  )}`;

// Returns every created field; the requested one comes first.
export const createField = (
  context: MetadataOperationContext,
  input: CreateFieldInput,
): FieldMetadataRow[] => {
  const object = findObjectOrThrow(context.store, input.objectMetadataId, {
    metadataName: 'fieldMetadata',
    type: 'create',
  });

  validateCreateFieldInput(context, object, input);
  assertFieldNameAvailable(context, object, input.name);

  if (input.type === FieldMetadataType.RELATION) {
    const { fields, joinColumnIndex } = createRelationField(
      context,
      object,
      input,
      input.relationCreationPayload as RelationCreationPayload,
      input.id ? { id: input.id } : {},
    );

    insertFields(context, fields);
    insertIndex(context, joinColumnIndex);

    return fields;
  }

  if (input.type === FieldMetadataType.MORPH_RELATION) {
    const payloads =
      input.morphRelationsCreationPayload as RelationCreationPayload[];
    const morphId = crypto.randomUUID();
    const relationType = payloads[0].type;
    const head = buildFieldRow({
      id: input.id ?? crypto.randomUUID(),
      universalIdentifier: morphId,
      morphId,
      objectMetadataId: object.id,
      type: FieldMetadataType.MORPH_RELATION,
      name: input.name,
      label: input.label,
      icon: input.icon ?? 'IconRelationManyToOne',
      description: input.description ?? null,
      isSystemSideEffect: true,
      settings:
        relationType === 'MANY_TO_ONE'
          ? { relationType, onDelete: 'SET_NULL' }
          : { relationType },
    });
    const pairs = payloads.map((payload) => {
      const targetObject = findObjectOrThrow(
        context.store,
        payload.targetObjectMetadataId,
        { metadataName: 'fieldMetadata', type: 'create' },
      );
      const siblingName = computeMorphTargetFieldName(
        input.name,
        relationType,
        targetObject,
      );

      assertFieldNameAvailable(context, object, siblingName);

      return createRelationField(
        context,
        object,
        { ...input, name: siblingName },
        { ...payload, type: relationType },
        {
          type: FieldMetadataType.MORPH_RELATION,
          morphId,
          icon: input.icon ?? 'IconRelationManyToOne',
        },
      );
    });

    insertFields(context, [head, ...pairs.flatMap((pair) => pair.fields)]);
    for (const pair of pairs) {
      insertIndex(context, pair.joinColumnIndex);
    }

    return [head, ...pairs.flatMap((pair) => pair.fields)];
  }

  const options = ENUM_FIELD_TYPES.includes(input.type)
    ? normalizeFieldOptions(input.type, input.options ?? null)
    : null;

  if (ENUM_FIELD_TYPES.includes(input.type)) {
    const optionErrors = validateFieldOptions(options);

    if (optionErrors.length > 0) failCreate(input, optionErrors);
  }

  const field = buildFieldRow({
    ...(input.id ? { id: input.id } : {}),
    objectMetadataId: object.id,
    type: input.type,
    name: input.name,
    label: input.label,
    description: input.description ?? null,
    icon: input.icon ?? null,
    isActive: input.isActive ?? true,
    isNullable: input.isNullable ?? true,
    isLabelSyncedWithName: input.isLabelSyncedWithName ?? false,
    defaultValue: input.defaultValue ?? null,
    options,
    settings: input.settings ?? null,
  });

  insertFields(context, [field]);

  if (input.isUnique === true) {
    insertIndex(
      context,
      buildIndexRows({
        objectMetadataId: object.id,
        columns: [{ fieldMetadataId: field.id }],
        isUnique: true,
        indexWhereClause: '"deletedAt" IS NULL',
      }),
    );
  }
  if (input.isSearchable === true) {
    addSearchField(context, field);
  }

  return [field];
};
