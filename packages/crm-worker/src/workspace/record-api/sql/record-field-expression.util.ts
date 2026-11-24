import { getNamedType, isEnumType, isObjectType } from 'graphql';

import { apiError } from '@/shared/errors/api-error.util';
import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import {
  COMPOSITE_GRAPHQL_TYPES,
  recordField,
  relationTarget,
} from '@/workspace/record-api/record-catalog.util';
import {
  assertReadable,
  quoteIdentifier,
  recordTable,
} from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordObject,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';

export const enumValuesForField = (
  context: RecordQueryContext,
  object: RecordObject,
  path: string[],
) => {
  let type = context.schema.getType(object.typeName);
  for (const name of path) {
    if (!isObjectType(type)) return undefined;
    const field = type.getFields()[name];
    if (!field) return undefined;
    type = getNamedType(field.type);
  }
  return isEnumType(type)
    ? type.getValues().map((value) => value.name)
    : undefined;
};

export const fieldExpression = (
  context: RecordQueryContext,
  object: RecordObject,
  path: string[],
  alias = 'record',
): string => {
  if (path.length === 0 || path.length > 6)
    throw apiError('Invalid field path');
  const field = recordField(object, path[0]);
  assertReadable(context, object, field);
  const column = computeFieldColumn(field);
  if (!column)
    throw apiError(`Field ${field.name} cannot be used in this query`);
  const expression = `${quoteIdentifier(alias)}.${quoteIdentifier(column.columnName)}`;
  if (path.length === 1) return expression;
  if (field.relationTargetObjectMetadataId && field.name === path[0]) {
    const target = relationTarget(context.catalog, field);
    const targetAlias = `${alias}_relation`;
    return `(SELECT ${fieldExpression(context, target, path.slice(1), targetAlias)} FROM ${recordTable(target)} AS ${quoteIdentifier(targetAlias)} WHERE ${quoteIdentifier(targetAlias)}."id" = ${expression} AND ${quoteIdentifier(targetAlias)}."deletedAt" IS NULL)`;
  }
  const compositeType = context.schema.getType(
    COMPOSITE_GRAPHQL_TYPES[field.type] ?? '',
  );
  if (
    !isObjectType(compositeType) ||
    path.length !== 2 ||
    !compositeType.getFields()[path[1]]
  )
    throw apiError('Invalid composite field path');
  return `(${expression} ->> '$.${path[1]}')`;
};
