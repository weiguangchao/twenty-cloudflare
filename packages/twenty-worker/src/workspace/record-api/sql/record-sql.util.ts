import { apiError } from '@/shared/errors/api-error.util';
import {
  type RecordQueryContext,
  type RecordObject,
} from '@/workspace/record-api/types/record-query.type';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';

export const quoteIdentifier = (name: string) =>
  `"${name.replaceAll('"', '""')}"`;
export const recordTable = (object: RecordObject) =>
  quoteIdentifier(`rec_${object.nameSingular}`);

export const executeRecordSql = (
  sql: SqlStorage,
  statement: string,
  bindings: SqlStorageValue[] = [],
) => {
  if (
    bindings.length > 100 ||
    new TextEncoder().encode(statement).length > 100_000
  )
    throw apiError('Query exceeds SQLite statement limits');
  return sql
    .exec<Record<string, SqlStorageValue>>(statement, ...bindings)
    .toArray();
};

export const assertReadable = (
  context: RecordQueryContext,
  object: RecordObject,
  field?: FieldMetadataRow,
) => {
  const permissions = context.permissions.objectRecordsPermissions.find(
    (item) => item.objectMetadataId === object.id,
  );
  if (
    !permissions?.canReadAllRecords ||
    (field && permissions.unreadableFields.includes(field.id))
  )
    throw apiError('Permission denied', 'FORBIDDEN', 'PERMISSION_DENIED');
};

export const sqlValue = (value: unknown): SqlStorageValue => {
  if (value === null) return null;
  if (typeof value === 'boolean') return Number(value);
  if (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return value;
  throw apiError('Invalid filter value');
};
