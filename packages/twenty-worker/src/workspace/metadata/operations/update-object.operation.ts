import { type FailedMetadataValidationError } from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import { capitalize } from 'twenty-shared/utils';

import { CUSTOM_OBJECT_RELATION_TARGETS } from '@/workspace/metadata/constants/custom-object-relation-targets.constant';
import {
  renameFieldColumn,
  renameRecordTable,
} from '@/workspace/metadata/ddl/record-table-ddl.util';
import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import { computeSystemMorphTargetFieldName } from '@/workspace/metadata/operations/create-object.operation';
import { computeJoinColumnName } from '@/workspace/metadata/operations/utils/field-schema.util';
import {
  findObjectFields,
  findObjectOrThrow,
  isStandardMetadataRow,
} from '@/workspace/metadata/operations/utils/metadata-lookups.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type ObjectMetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { type UpdateObjectInput } from '@/workspace/metadata/types/object-metadata-inputs.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';
import {
  validateObjectLabels,
  validateObjectNames,
} from '@/workspace/metadata/validation/validate-object-names.util';

// From the old server's flat-object-metadata-editable-properties.
const STANDARD_OBJECT_EDITABLE_PROPERTIES = [
  'color',
  'openRecordIn',
  'description',
  'icon',
  'isActive',
  'isSearchable',
  'labelPlural',
  'labelSingular',
  'imageIdentifierFieldMetadataId',
];
const CUSTOM_OBJECT_EDITABLE_PROPERTIES = [
  ...STANDARD_OBJECT_EDITABLE_PROPERTIES,
  'isLabelSyncedWithName',
  'namePlural',
  'nameSingular',
  'labelIdentifierFieldMetadataId',
  'shortcut',
];

// The target<Object> fields created with the object follow its renames, as
// in the old server; user-created inverse relations keep their names.
const renameSystemMorphTargetFields = (
  context: MetadataOperationContext,
  object: ObjectMetadataRow,
  nextNameSingular: string,
) => {
  for (const relationTarget of CUSTOM_OBJECT_RELATION_TARGETS) {
    const targetObject = context.store.findMany('objectMetadata', {
      nameSingular: relationTarget.objectNameSingular,
    })[0];

    if (targetObject === undefined) continue;

    const systemField = (
      context.store.findMany('fieldMetadata', {
        objectMetadataId: targetObject.id,
        relationTargetObjectMetadataId: object.id,
        name: computeSystemMorphTargetFieldName(object.nameSingular),
      }) as FieldMetadataRow[]
    ).find((field) => field.type === FieldMetadataType.MORPH_RELATION);

    if (systemField === undefined) continue;

    const nextName = computeSystemMorphTargetFieldName(nextNameSingular);

    renameFieldColumn(
      context.sql,
      targetObject.nameSingular,
      systemField.settings?.joinColumnName ??
        computeJoinColumnName(systemField.name),
      computeJoinColumnName(nextName),
    );
    context.store.update('fieldMetadata', systemField.id, {
      name: nextName,
      label: relationTarget.reverseLabel ?? capitalize(nextNameSingular),
      settings: {
        ...systemField.settings,
        joinColumnName: computeJoinColumnName(nextName),
      },
      updatedAt: new Date().toISOString(),
    });
  }
};

export const updateObject = (
  context: MetadataOperationContext,
  { id, update }: { id: string; update: UpdateObjectInput },
): ObjectMetadataRow => {
  const { store, sql } = context;
  const failureContext = {
    metadataName: 'objectMetadata',
    type: 'update',
  } as const;
  const object = findObjectOrThrow(store, id, failureContext);
  const fail = (errors: FailedMetadataValidationError[]): never => {
    throw MetadataValidationException.single({
      ...failureContext,
      errors,
      flatEntityMinimalInformation: {
        id: object.id,
        nameSingular: object.nameSingular,
      },
    });
  };

  if (object.isSystem) {
    fail([
      metadataValidationError(
        'INVALID_OBJECT_INPUT',
        'System objects cannot be updated directly. Use overrides for cosmetic changes.',
      ),
    ]);
  }

  const editableProperties = isStandardMetadataRow(object)
    ? STANDARD_OBJECT_EDITABLE_PROPERTIES
    : CUSTOM_OBJECT_EDITABLE_PROPERTIES;
  const forbiddenProperties = Object.entries(update)
    .filter(([, value]) => value !== undefined)
    .map(([property]) => property)
    .filter((property) => !editableProperties.includes(property));

  if (forbiddenProperties.length > 0) {
    fail([
      metadataValidationError(
        'INVALID_OBJECT_INPUT',
        `Cannot update properties of object "${object.nameSingular}": ${forbiddenProperties.join(', ')}`,
        forbiddenProperties,
      ),
    ]);
  }

  const next = {
    nameSingular: update.nameSingular ?? object.nameSingular,
    namePlural: update.namePlural ?? object.namePlural,
    labelSingular: update.labelSingular ?? object.labelSingular,
    labelPlural: update.labelPlural ?? object.labelPlural,
    isLabelSyncedWithName:
      update.isLabelSyncedWithName ?? object.isLabelSyncedWithName,
  };
  const namesChanged =
    next.nameSingular !== object.nameSingular ||
    next.namePlural !== object.namePlural;
  const errors = [
    ...(namesChanged
      ? validateObjectNames(store, { ...next, excludedObjectId: object.id })
      : []),
    ...validateObjectLabels(next),
  ];
  const objectFieldIds = new Set(
    findObjectFields(store, object.id).map((field) => field.id),
  );

  for (const identifierProperty of [
    'labelIdentifierFieldMetadataId',
    'imageIdentifierFieldMetadataId',
  ] as const) {
    const fieldId = update[identifierProperty];

    if (
      fieldId !== undefined &&
      fieldId !== null &&
      !objectFieldIds.has(fieldId)
    ) {
      errors.push(
        metadataValidationError(
          'INVALID_OBJECT_INPUT',
          `${identifierProperty} must reference a field of this object`,
          fieldId,
        ),
      );
    }
  }

  if (errors.length > 0) fail(errors);

  if (next.nameSingular !== object.nameSingular) {
    renameRecordTable(sql, object.nameSingular, next.nameSingular);
    renameSystemMorphTargetFields(context, object, next.nameSingular);
  }

  store.update('objectMetadata', object.id, {
    ...next,
    description:
      update.description === undefined
        ? object.description
        : update.description,
    icon: update.icon === undefined ? object.icon : update.icon,
    shortcut: update.shortcut === undefined ? object.shortcut : update.shortcut,
    color: update.color === undefined ? object.color : update.color,
    isActive: update.isActive ?? object.isActive,
    isSearchable: update.isSearchable ?? object.isSearchable,
    openRecordIn: update.openRecordIn ?? object.openRecordIn,
    labelIdentifierFieldMetadataId:
      update.labelIdentifierFieldMetadataId ??
      object.labelIdentifierFieldMetadataId,
    imageIdentifierFieldMetadataId:
      update.imageIdentifierFieldMetadataId === undefined
        ? object.imageIdentifierFieldMetadataId
        : update.imageIdentifierFieldMetadataId,
    updatedAt: new Date().toISOString(),
  });

  return store.findById('objectMetadata', object.id) as ObjectMetadataRow;
};
