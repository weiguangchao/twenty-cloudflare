import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import { dropRecordIndex } from '@/workspace/metadata/ddl/record-index-ddl.util';
import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import { buildIndexRows } from '@/workspace/metadata/operations/utils/build-metadata-rows.util';
import { insertIndex } from '@/workspace/metadata/operations/utils/field-schema.util';
import {
  findObjectFields,
  findObjectOrThrow,
  isStandardMetadataRow,
} from '@/workspace/metadata/operations/utils/metadata-lookups.util';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type IndexMetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';

export type CreateIndexInput = {
  objectMetadataId: string;
  fields: { fieldMetadataId: string; subFieldName?: string | null }[];
  isUnique?: boolean;
  indexWhereClause?: string | null;
};

export const createIndex = (
  context: MetadataOperationContext,
  input: CreateIndexInput,
): IndexMetadataRow => {
  const failureContext = { metadataName: 'index', type: 'create' } as const;
  const object = findObjectOrThrow(
    context.store,
    input.objectMetadataId,
    failureContext,
  );
  const objectFieldById = new Map(
    findObjectFields(context.store, object.id).map((field) => [
      field.id,
      field,
    ]),
  );
  const unindexableFieldIds = input.fields
    .map((indexField) => indexField.fieldMetadataId)
    .filter((fieldId) => {
      const field = objectFieldById.get(fieldId);

      return field === undefined || computeFieldColumn(field) === null;
    });

  if (input.fields.length === 0 || unindexableFieldIds.length > 0) {
    throw MetadataValidationException.single({
      ...failureContext,
      errors: [
        metadataValidationError(
          'INVALID_INDEX_INPUT',
          'An index needs at least one field with a column on this object',
          unindexableFieldIds,
        ),
      ],
    });
  }

  const rows = buildIndexRows({
    objectMetadataId: object.id,
    columns: input.fields,
    isUnique: input.isUnique ?? false,
    indexWhereClause: input.indexWhereClause ?? null,
    isSystemSideEffect: false,
  });

  insertIndex(context, rows);

  return rows.index;
};

export const deleteIndex = (
  context: MetadataOperationContext,
  { id }: { id: string },
): IndexMetadataRow => {
  const failureContext = { metadataName: 'index', type: 'delete' } as const;
  const index = context.store.findById('indexMetadata', id);

  if (index === undefined) {
    throw MetadataValidationException.single({
      ...failureContext,
      errors: [
        metadataValidationError('INDEX_NOT_FOUND', 'Index not found', id),
      ],
    });
  }
  if (isStandardMetadataRow(index) || index.isSystemSideEffect) {
    throw MetadataValidationException.single({
      ...failureContext,
      errors: [
        metadataValidationError(
          'INDEX_MUTATION_NOT_ALLOWED',
          'System indexes are required for Twenty to work and cannot be deleted.',
          index.name,
        ),
      ],
    });
  }

  dropRecordIndex(context.sql, index.name);
  context.store.delete('indexMetadata', [index.id]);

  return index;
};
