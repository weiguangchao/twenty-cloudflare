import {
  FieldMetadataType,
  type compositeTypeDefinitions as CompositeTypeDefinitions,
} from 'twenty-shared/types';

import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import {
  type IndexFieldMetadataRow,
  type IndexMetadataRow,
} from '@/workspace/metadata/types/metadata-row.type';
import { computeRecordTableName } from '@/workspace/metadata/utils/compute-record-table-name.util';

let compositeTypeDefinitions: typeof CompositeTypeDefinitions;

export const initializeRecordIndexTypes = async () => {
  ({ compositeTypeDefinitions } =
    await import('twenty-shared/composite-type-definitions'));
};

const jsonPathExpression = (columnName: string, subFieldName: string) =>
  `("${columnName}" ->> '$.${subFieldName}')`;

const computeIndexFieldExpressions = (
  indexField: IndexFieldMetadataRow,
  field: FieldMetadataRow,
): string[] | null => {
  const column = computeFieldColumn(field);

  if (column === null) return null;

  const compositeType = compositeTypeDefinitions.get(field.type);

  if (compositeType === undefined) {
    return [`"${column.columnName}"`];
  }

  if (indexField.subFieldName !== null) {
    return [jsonPathExpression(column.columnName, indexField.subFieldName)];
  }

  const uniqueProperties = compositeType.properties.filter(
    (property) => property.isIncludedInUniqueConstraint === true,
  );

  return uniqueProperties.length === 0
    ? [`"${column.columnName}"`]
    : uniqueProperties.map((property) =>
        jsonPathExpression(column.columnName, property.name),
      );
};

// Returns false when the index has no physical counterpart: TS_VECTOR (GIN)
// indexes become FTS5 tables instead.
export const createRecordIndex = (
  sql: SqlStorage,
  objectNameSingular: string,
  index: IndexMetadataRow,
  indexFields: IndexFieldMetadataRow[],
  findFieldById: (fieldMetadataId: string) => FieldMetadataRow,
): boolean => {
  const expressions: string[] = [];

  for (const indexField of [...indexFields].sort(
    (left, right) => left.order - right.order,
  )) {
    const field = findFieldById(indexField.fieldMetadataId);

    if (field.type === FieldMetadataType.TS_VECTOR) return false;

    const fieldExpressions = computeIndexFieldExpressions(indexField, field);

    if (fieldExpressions === null) {
      throw new Error(
        `Field ${field.name} has no column to index in ${index.name}`,
      );
    }
    expressions.push(...fieldExpressions);
  }

  sql.exec(
    `CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX "${index.name}" ON "${computeRecordTableName(objectNameSingular)}" (${expressions.join(', ')})${index.indexWhereClause ? ` WHERE ${index.indexWhereClause}` : ''}`,
  );

  return true;
};

export const dropRecordIndex = (sql: SqlStorage, indexName: string) => {
  sql.exec(`DROP INDEX IF EXISTS "${indexName}"`);
};
