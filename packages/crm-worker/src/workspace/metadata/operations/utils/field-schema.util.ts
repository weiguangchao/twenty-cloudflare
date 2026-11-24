import { FieldMetadataType } from 'crm-shared/types';
import { capitalize } from 'crm-shared/utils';

import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import {
  createRecordIndex,
  dropRecordIndex,
} from '@/workspace/metadata/ddl/record-index-ddl.util';
import {
  addFieldColumn,
  dropFieldColumn,
} from '@/workspace/metadata/ddl/record-table-ddl.util';
import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import {
  buildFieldRow,
  buildIndexRows,
} from '@/workspace/metadata/operations/utils/build-metadata-rows.util';
import {
  findObjectFields,
  resolveObjectNameSingular,
} from '@/workspace/metadata/operations/utils/metadata-lookups.util';
import {
  type FieldMetadataRow,
  type RelationType,
} from '@/workspace/metadata/types/field-metadata-row.type';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import {
  type IndexFieldMetadataRow,
  type IndexMetadataRow,
  type ObjectMetadataRow,
} from '@/workspace/metadata/types/metadata-row.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';

export const computeJoinColumnName = (fieldName: string) => `${fieldName}Id`;

export const assertFieldNameAvailable = (
  { store }: MetadataOperationContext,
  object: ObjectMetadataRow,
  name: string,
  {
    excludedFieldIds = [],
    failureType = 'create',
  }: {
    excludedFieldIds?: string[];
    failureType?: 'create' | 'update';
  } = {},
) => {
  const otherFields = findObjectFields(store, object.id).filter(
    (field) => !excludedFieldIds.includes(field.id),
  );
  const errors = [];

  if (otherFields.some((field) => field.name === name)) {
    errors.push(
      metadataValidationError(
        'NOT_AVAILABLE',
        `Name "${name}" is not available as it is already used by another field`,
        name,
      ),
    );
  }
  if (
    otherFields.some(
      (field) =>
        computeFieldColumn(field)?.columnName === name && field.name !== name,
    )
  ) {
    errors.push(
      metadataValidationError(
        'NOT_AVAILABLE',
        `Name "${name}" is not available as it is already used by another join column name`,
        name,
      ),
    );
  }

  if (errors.length > 0) {
    throw MetadataValidationException.single({
      metadataName: 'fieldMetadata',
      type: failureType,
      errors,
      flatEntityMinimalInformation: { name, objectMetadataId: object.id },
    });
  }
};

// Inserts field rows, then their columns. Relation pairs point at each other,
// so the cross references are written once both rows exist.
export const insertFields = (
  context: MetadataOperationContext,
  fields: FieldMetadataRow[],
  { withColumns = true }: { withColumns?: boolean } = {},
) => {
  const { sql, store } = context;

  for (const field of fields) {
    store.insert('fieldMetadata', {
      ...field,
      relationTargetFieldMetadataId: null,
    });
  }
  for (const field of fields) {
    if (field.relationTargetFieldMetadataId !== null) {
      store.update('fieldMetadata', field.id, {
        relationTargetFieldMetadataId: field.relationTargetFieldMetadataId,
      });
    }
  }

  if (!withColumns) return;

  for (const field of fields) {
    addFieldColumn(
      sql,
      resolveObjectNameSingular(store)(field.objectMetadataId),
      field,
      resolveObjectNameSingular(store),
    );
  }
};

export const insertIndex = (
  { sql, store }: MetadataOperationContext,
  {
    index,
    indexFields,
  }: { index: IndexMetadataRow; indexFields: IndexFieldMetadataRow[] },
) => {
  store.insert('indexMetadata', index);
  for (const indexField of indexFields) {
    store.insert('indexFieldMetadata', indexField);
  }
  try {
    createRecordIndex(
      sql,
      resolveObjectNameSingular(store)(index.objectMetadataId),
      index,
      indexFields,
      (fieldMetadataId) =>
        store.findById('fieldMetadata', fieldMetadataId) as FieldMetadataRow,
    );
  } catch (error) {
    if (!String(error).includes('UNIQUE constraint failed')) throw error;

    throw MetadataValidationException.single({
      metadataName: 'index',
      type: 'create',
      errors: [
        metadataValidationError(
          'INVALID_INDEX_INPUT',
          'Existing records contain duplicate values, so the field cannot be made unique',
          index.name,
        ),
      ],
    });
  }
};

// Deletes indexes (metadata and physical) that cover any of the fields; a
// partial index would no longer describe the same thing.
export const removeIndexesCoveringFields = (
  { sql, store }: MetadataOperationContext,
  fieldIds: string[],
) => {
  const indexIds = new Set(
    fieldIds.flatMap((fieldMetadataId) =>
      store
        .findMany('indexFieldMetadata', { fieldMetadataId })
        .map((indexField) => indexField.indexMetadataId),
    ),
  );

  for (const indexId of indexIds) {
    const index = store.findById('indexMetadata', indexId);

    if (index !== undefined) dropRecordIndex(sql, index.name);
  }
  store.delete('indexMetadata', [...indexIds]);
};

export const removeFields = (
  context: MetadataOperationContext,
  fields: FieldMetadataRow[],
  { droppedObjectIds = [] }: { droppedObjectIds?: string[] } = {},
) => {
  const { sql, store } = context;

  removeIndexesCoveringFields(
    context,
    fields.map((field) => field.id),
  );

  for (const field of fields) {
    if (!droppedObjectIds.includes(field.objectMetadataId)) {
      dropFieldColumn(
        sql,
        resolveObjectNameSingular(store)(field.objectMetadataId),
        field,
      );
    }
  }

  // One statement, because relation pairs reference each other.
  store.delete(
    'fieldMetadata',
    fields.map((field) => field.id),
  );
};

type RelationPairInput = {
  sourceObject: ObjectMetadataRow;
  targetObject: ObjectMetadataRow;
  relationType: RelationType;
  sourceField: Pick<FieldMetadataRow, 'name' | 'label'> &
    Partial<FieldMetadataRow>;
  targetField: Pick<FieldMetadataRow, 'name' | 'label'> &
    Partial<FieldMetadataRow>;
  isSystemSideEffect?: boolean;
};

const relationSettings = (relationType: RelationType, fieldName: string) =>
  relationType === 'MANY_TO_ONE'
    ? {
        relationType,
        onDelete: 'SET_NULL' as const,
        joinColumnName: computeJoinColumnName(fieldName),
      }
    : { relationType };

// Builds both sides of a relation plus the index on the MANY_TO_ONE side's
// join column, following generate-morph-or-relation-flat-field-metadata-pair.
export const buildRelationPair = ({
  sourceObject,
  targetObject,
  relationType,
  sourceField,
  targetField,
  isSystemSideEffect = false,
}: RelationPairInput) => {
  const sourceFieldId = crypto.randomUUID();
  const targetFieldId = crypto.randomUUID();
  const inverseRelationType: RelationType =
    relationType === 'MANY_TO_ONE' ? 'ONE_TO_MANY' : 'MANY_TO_ONE';

  const source = buildFieldRow({
    type: FieldMetadataType.RELATION,
    icon: 'IconRelationOneToMany',
    description: `${capitalize(sourceObject.namePlural)} tied to the ${targetObject.labelSingular}`,
    isSystemSideEffect,
    ...sourceField,
    id: sourceFieldId,
    objectMetadataId: sourceObject.id,
    settings: relationSettings(relationType, sourceField.name),
    relationTargetObjectMetadataId: targetObject.id,
    relationTargetFieldMetadataId: targetFieldId,
  });
  const target = buildFieldRow({
    type: FieldMetadataType.RELATION,
    icon: 'Icon123',
    description: `${capitalize(targetObject.namePlural)} ${sourceObject.labelSingular}`,
    isSystemSideEffect,
    ...targetField,
    id: targetFieldId,
    objectMetadataId: targetObject.id,
    settings: relationSettings(inverseRelationType, targetField.name),
    relationTargetObjectMetadataId: sourceObject.id,
    relationTargetFieldMetadataId: sourceFieldId,
  });
  const manyToOneField = relationType === 'MANY_TO_ONE' ? source : target;

  return {
    fields: [source, target],
    joinColumnIndex: buildIndexRows({
      objectMetadataId: manyToOneField.objectMetadataId,
      columns: [{ fieldMetadataId: manyToOneField.id }],
    }),
  };
};
