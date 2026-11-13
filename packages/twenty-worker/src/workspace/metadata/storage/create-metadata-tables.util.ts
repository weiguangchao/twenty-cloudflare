import { METADATA_TABLE_DEFINITIONS } from '@/workspace/metadata/constants/metadata-table-definitions.constant';
import {
  type MetadataColumnDefinition,
  type MetadataColumnKind,
} from '@/workspace/metadata/types/metadata-table-definition.type';
import { computeMetadataTableName } from '@/workspace/metadata/utils/compute-metadata-table-name.util';

const SQL_TYPE_BY_COLUMN_KIND: Record<MetadataColumnKind, string> = {
  text: 'TEXT',
  json: 'TEXT',
  boolean: 'INTEGER',
  integer: 'INTEGER',
  real: 'REAL',
};

const ON_DELETE_SQL = {
  CASCADE: ' ON DELETE CASCADE',
  SET_NULL: ' ON DELETE SET NULL',
  NO_ACTION: '',
} as const;

const buildColumnSql = (column: MetadataColumnDefinition) => {
  const parts = [`"${column.name}"`, SQL_TYPE_BY_COLUMN_KIND[column.kind]];

  if (column.name === 'id') {
    parts.push('PRIMARY KEY NOT NULL');
  } else if (!column.isNullable) {
    parts.push('NOT NULL');
  }

  if (column.references !== undefined) {
    parts.push(
      `REFERENCES "${computeMetadataTableName(column.references.entityName)}"("id")${ON_DELETE_SQL[column.references.onDelete]}`,
    );
  }

  return parts.join(' ');
};

export const createMetadataTables = (sql: SqlStorage) => {
  for (const definition of METADATA_TABLE_DEFINITIONS) {
    const columns = definition.columns as readonly MetadataColumnDefinition[];

    sql.exec(
      `CREATE TABLE "${computeMetadataTableName(definition.entityName)}" (${columns
        .map(buildColumnSql)
        .join(', ')})`,
    );

    for (const column of columns) {
      if (column.references !== undefined) {
        sql.exec(
          `CREATE INDEX "${computeMetadataTableName(definition.entityName)}_${column.name}" ON "${computeMetadataTableName(definition.entityName)}" ("${column.name}")`,
        );
      }
    }
  }
};
