import {
  type FailedMetadataValidationError,
  computeMetadataNameFromLabel,
} from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import { capitalize, isMorphRelationHead } from 'twenty-shared/utils';

import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import {
  computeOptionValueChanges,
  migrateOptionValues,
} from '@/workspace/metadata/ddl/migrate-option-values.util';
import { renameFieldColumn } from '@/workspace/metadata/ddl/record-table-ddl.util';
import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import { buildIndexRows } from '@/workspace/metadata/operations/utils/build-metadata-rows.util';
import {
  assertFieldNameAvailable,
  computeJoinColumnName,
  insertIndex,
} from '@/workspace/metadata/operations/utils/field-schema.util';
import {
  findFieldOrThrow,
  findObjectFields,
  findObjectOrThrow,
  isStandardMetadataRow,
} from '@/workspace/metadata/operations/utils/metadata-lookups.util';
import { normalizeFieldOptions } from '@/workspace/metadata/operations/utils/normalize-field-options.util';
import {
  addSearchField,
  removeSearchField,
} from '@/workspace/metadata/operations/utils/search-field.util';
import { type UpdateFieldInput } from '@/workspace/metadata/types/field-metadata-inputs.type';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type ObjectMetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';
import { validateFieldOptions } from '@/workspace/metadata/validation/validate-field-options.util';
import { validateMetadataName } from '@/workspace/metadata/validation/validate-metadata-name.util';

// Editable properties per kind of field, from the old server's
// flat-field-metadata-editable-properties and relation-properties-to-compare.
const STANDARD_FIELD_EDITABLE_PROPERTIES = [
  'defaultValue',
  'description',
  'icon',
  'isActive',
  'isAuditLogged',
  'label',
  'options',
  'settings',
  'isSearchable',
  'isUnique',
];
const CUSTOM_FIELD_EDITABLE_PROPERTIES = [
  ...STANDARD_FIELD_EDITABLE_PROPERTIES,
  'isLabelSyncedWithName',
  'name',
  'isNullable',
];
const SYSTEM_FIELD_EDITABLE_PROPERTIES = ['isActive', 'settings'];
const SYSTEM_SIDE_EFFECT_FIELD_EDITABLE_PROPERTIES = ['isActive'];
const RELATION_FIELD_EDITABLE_PROPERTIES = [
  'label',
  'description',
  'isActive',
  'icon',
  'name',
  'isAuditLogged',
  'isNullable',
  'isLabelSyncedWithName',
];

const ENUM_FIELD_TYPES: string[] = [
  FieldMetadataType.SELECT,
  FieldMetadataType.MULTI_SELECT,
  FieldMetadataType.RATING,
];

const isRelationField = (field: FieldMetadataRow) =>
  field.type === FieldMetadataType.RELATION ||
  field.type === FieldMetadataType.MORPH_RELATION;

const computeEditableProperties = (field: FieldMetadataRow) => {
  const editableProperties = field.isSystem
    ? SYSTEM_FIELD_EDITABLE_PROPERTIES
    : field.isSystemSideEffect && !isMorphRelationHead(field)
      ? SYSTEM_SIDE_EFFECT_FIELD_EDITABLE_PROPERTIES
      : isStandardMetadataRow(field)
        ? STANDARD_FIELD_EDITABLE_PROPERTIES
        : CUSTOM_FIELD_EDITABLE_PROPERTIES;

  return isRelationField(field)
    ? editableProperties.filter((property) =>
        RELATION_FIELD_EDITABLE_PROPERTIES.includes(property),
      )
    : editableProperties;
};

const unquoteDefault = (defaultValue: unknown) =>
  typeof defaultValue === 'string' && /^'.*'$/.test(defaultValue)
    ? defaultValue.slice(1, -1)
    : undefined;

const renameMorphSiblings = (
  context: MetadataOperationContext,
  object: ObjectMetadataRow,
  head: FieldMetadataRow,
  nextName: string,
) => {
  const siblings = findObjectFields(context.store, object.id).filter(
    (candidate) =>
      candidate.morphId === head.morphId && candidate.id !== head.id,
  );

  for (const sibling of siblings) {
    const targetObject = findObjectOrThrow(
      context.store,
      sibling.relationTargetObjectMetadataId as string,
      { metadataName: 'fieldMetadata', type: 'update' },
    );
    const siblingName = `${nextName}${capitalize(
      sibling.settings?.relationType === 'MANY_TO_ONE'
        ? targetObject.nameSingular
        : targetObject.namePlural,
    )}`;

    renameRelationField(context, object, sibling, siblingName);
  }
};

const renameRelationField = (
  context: MetadataOperationContext,
  object: ObjectMetadataRow,
  field: FieldMetadataRow,
  nextName: string,
) => {
  assertFieldNameAvailable(context, object, nextName, {
    excludedFieldIds: [field.id],
    failureType: 'update',
  });

  const previousColumn = computeFieldColumn(field);
  const settings =
    previousColumn === null
      ? field.settings
      : { ...field.settings, joinColumnName: computeJoinColumnName(nextName) };

  if (previousColumn !== null) {
    renameFieldColumn(
      context.sql,
      object.nameSingular,
      previousColumn.columnName,
      computeJoinColumnName(nextName),
    );
  }
  context.store.update('fieldMetadata', field.id, {
    name: nextName,
    settings,
    updatedAt: new Date().toISOString(),
  });
};

export const updateField = (
  context: MetadataOperationContext,
  { id, update }: { id: string; update: UpdateFieldInput },
): FieldMetadataRow => {
  const { store, sql } = context;
  const failureContext = {
    metadataName: 'fieldMetadata',
    type: 'update',
  } as const;
  const field = findFieldOrThrow(store, id, failureContext);
  const object = findObjectOrThrow(
    store,
    field.objectMetadataId,
    failureContext,
  );
  const fail = (errors: FailedMetadataValidationError[]): never => {
    throw MetadataValidationException.single({
      ...failureContext,
      errors,
      flatEntityMinimalInformation: { id: field.id, name: field.name },
    });
  };

  const updatedProperties = Object.entries(update)
    .filter(([, value]) => value !== undefined)
    .map(([property]) => property);
  const editableProperties = computeEditableProperties(field);
  const forbiddenProperties = updatedProperties.filter(
    (property) => !editableProperties.includes(property),
  );

  if (forbiddenProperties.length > 0) {
    fail([
      metadataValidationError(
        'FIELD_MUTATION_NOT_ALLOWED',
        `Cannot update properties of field "${field.name}": ${forbiddenProperties.join(', ')}`,
        forbiddenProperties,
      ),
    ]);
  }

  const nextName = update.name ?? field.name;
  const nextLabel = update.label ?? field.label;
  const nextIsLabelSyncedWithName =
    update.isLabelSyncedWithName ?? field.isLabelSyncedWithName;
  const nextIsNullable = update.isNullable ?? field.isNullable;
  const nextDefaultValue =
    update.defaultValue === undefined
      ? field.defaultValue
      : update.defaultValue;
  const nextOptions =
    update.options === undefined
      ? field.options
      : normalizeFieldOptions(field.type, update.options ?? null);
  const errors: FailedMetadataValidationError[] = [];

  if (nextName !== field.name) {
    errors.push(...validateMetadataName(nextName, 'INVALID_FIELD_INPUT'));
  }
  if (
    nextIsLabelSyncedWithName &&
    computeMetadataNameFromLabel({ label: nextLabel }) !== nextName
  ) {
    errors.push(
      metadataValidationError(
        'NAME_NOT_SYNCED_WITH_LABEL',
        'Name is not synced with label',
        nextName,
      ),
    );
  }
  if (
    update.isActive === false &&
    object.labelIdentifierFieldMetadataId === field.id
  ) {
    errors.push(
      metadataValidationError(
        'LABEL_IDENTIFIER_FIELD_METADATA_ID_NOT_FOUND',
        'Label identifier field metadata cannot be deactivated',
      ),
    );
  }
  if (
    !isRelationField(field) &&
    nextIsNullable === false &&
    nextDefaultValue === null
  ) {
    errors.push(
      metadataValidationError(
        'INVALID_FIELD_INPUT',
        'Default value cannot be null for non-nullable fields',
      ),
    );
  }
  if (update.options !== undefined && ENUM_FIELD_TYPES.includes(field.type)) {
    errors.push(...validateFieldOptions(nextOptions));
  }

  if (errors.length > 0) fail(errors);

  if (nextName !== field.name) {
    if (isRelationField(field)) {
      if (isMorphRelationHead(field)) {
        renameMorphSiblings(context, object, field, nextName);
      }
      renameRelationField(context, object, field, nextName);
    } else {
      assertFieldNameAvailable(context, object, nextName, {
        excludedFieldIds: [field.id],
        failureType: 'update',
      });
      renameFieldColumn(sql, object.nameSingular, field.name, nextName);
    }
  }

  let migratedDefaultValue = nextDefaultValue;

  if (
    update.options !== undefined &&
    field.options !== null &&
    nextOptions !== null
  ) {
    const changes = computeOptionValueChanges(field.options, nextOptions);

    migrateOptionValues(sql, {
      objectNameSingular: object.nameSingular,
      columnName: nextName,
      fieldType: field.type,
      changes,
    });

    const defaultOptionValue = unquoteDefault(nextDefaultValue);

    if (defaultOptionValue !== undefined) {
      if (changes.removedValues.includes(defaultOptionValue)) {
        migratedDefaultValue = null;
      } else if (changes.renamedValues.has(defaultOptionValue)) {
        migratedDefaultValue = `'${changes.renamedValues.get(defaultOptionValue)}'`;
      }
    }
  }

  if (update.isUnique !== undefined) {
    const uniqueIndexIds = store
      .findMany('indexFieldMetadata', { fieldMetadataId: field.id })
      .map((indexField) =>
        store.findById('indexMetadata', indexField.indexMetadataId),
      )
      .filter(
        (index) =>
          index !== undefined &&
          index.isUnique &&
          store.findMany('indexFieldMetadata', { indexMetadataId: index.id })
            .length === 1,
      )
      .map((index) => index?.id as string);

    if (update.isUnique && uniqueIndexIds.length === 0) {
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
    if (!update.isUnique) {
      for (const indexId of uniqueIndexIds) {
        const index = store.findById('indexMetadata', indexId);

        if (index !== undefined) {
          sql.exec(`DROP INDEX IF EXISTS "${index.name}"`);
        }
      }
      store.delete('indexMetadata', uniqueIndexIds);
    }
  }

  if (update.isSearchable === true) addSearchField(context, field);
  if (update.isSearchable === false) removeSearchField(context, field);

  store.update('fieldMetadata', field.id, {
    label: nextLabel,
    description:
      update.description === undefined ? field.description : update.description,
    icon: update.icon === undefined ? field.icon : update.icon,
    isActive: update.isActive ?? field.isActive,
    isAuditLogged: update.isAuditLogged ?? field.isAuditLogged,
    isLabelSyncedWithName: nextIsLabelSyncedWithName,
    isNullable: nextIsNullable,
    defaultValue: migratedDefaultValue,
    options: nextOptions,
    settings:
      update.settings === undefined
        ? (store.findById('fieldMetadata', field.id) as FieldMetadataRow)
            .settings
        : { ...field.settings, ...update.settings },
    updatedAt: new Date().toISOString(),
    ...(isRelationField(field) ? {} : { name: nextName }),
  });

  return store.findById('fieldMetadata', field.id) as FieldMetadataRow;
};
