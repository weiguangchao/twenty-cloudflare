import {
  type FieldColumn,
  computeFieldColumn,
} from '@/workspace/metadata/ddl/compute-field-column.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { computeRecordTableName } from '@/workspace/metadata/utils/compute-record-table-name.util';

const ON_DELETE_SQL = {
  CASCADE: 'CASCADE',
  SET_NULL: 'SET NULL',
  RESTRICT: 'RESTRICT',
  NO_ACTION: 'NO ACTION',
} as const;

export type ResolveObjectNameSingular = (objectMetadataId: string) => string;

const buildColumnSql = (
  column: FieldColumn,
  resolveObjectNameSingular: ResolveObjectNameSingular,
) => {
  if (column.columnName === 'id') {
    return '"id" TEXT PRIMARY KEY NOT NULL';
  }

  const parts = [`"${column.columnName}"`, column.sqlType];

  if (column.references !== undefined) {
    parts.push(
      `REFERENCES "${computeRecordTableName(resolveObjectNameSingular(column.references.objectMetadataId))}"("id") ON DELETE ${ON_DELETE_SQL[column.references.onDelete]}`,
    );
  }

  return parts.join(' ');
};

export const createRecordTable = (
  sql: SqlStorage,
  objectNameSingular: string,
  fields: FieldMetadataRow[],
  resolveObjectNameSingular: ResolveObjectNameSingular,
) => {
  const columns = fields
    .map(computeFieldColumn)
    .filter((column): column is FieldColumn => column !== null);

  sql.exec(
    `CREATE TABLE "${computeRecordTableName(objectNameSingular)}" (${columns
      .map((column) => buildColumnSql(column, resolveObjectNameSingular))
      .join(', ')})`,
  );
};

export const addFieldColumn = (
  sql: SqlStorage,
  objectNameSingular: string,
  field: FieldMetadataRow,
  resolveObjectNameSingular: ResolveObjectNameSingular,
) => {
  const column = computeFieldColumn(field);

  if (column === null) return;

  sql.exec(
    `ALTER TABLE "${computeRecordTableName(objectNameSingular)}" ADD COLUMN ${buildColumnSql(column, resolveObjectNameSingular)}`,
  );
};

export const renameFieldColumn = (
  sql: SqlStorage,
  objectNameSingular: string,
  previousColumnName: string,
  nextColumnName: string,
) => {
  if (previousColumnName === nextColumnName) return;

  sql.exec(
    `ALTER TABLE "${computeRecordTableName(objectNameSingular)}" RENAME COLUMN "${previousColumnName}" TO "${nextColumnName}"`,
  );
};

export const dropFieldColumn = (
  sql: SqlStorage,
  objectNameSingular: string,
  field: FieldMetadataRow,
) => {
  const column = computeFieldColumn(field);

  if (column === null) return;

  sql.exec(
    `ALTER TABLE "${computeRecordTableName(objectNameSingular)}" DROP COLUMN "${column.columnName}"`,
  );
};

export const renameRecordTable = (
  sql: SqlStorage,
  previousObjectNameSingular: string,
  nextObjectNameSingular: string,
) => {
  sql.exec(
    `ALTER TABLE "${computeRecordTableName(previousObjectNameSingular)}" RENAME TO "${computeRecordTableName(nextObjectNameSingular)}"`,
  );
};

export const dropRecordTable = (
  sql: SqlStorage,
  objectNameSingular: string,
) => {
  sql.exec(`DROP TABLE "${computeRecordTableName(objectNameSingular)}"`);
};
