import { type RecordAggregation } from '@/workspace/record-api/schema/record-aggregations.util';
import { fieldExpression } from '@/workspace/record-api/sql/record-field-expression.util';
import { assertReadable } from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordObject,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';

const AGGREGATE_SUB_FIELDS: Record<string, string[]> = {
  CURRENCY: ['amountMicros', 'currencyCode'],
  FULL_NAME: ['firstName', 'lastName'],
  ADDRESS: [
    'addressStreet1',
    'addressStreet2',
    'addressCity',
    'addressPostcode',
    'addressState',
    'addressCountry',
    'addressLat',
    'addressLng',
  ],
  LINKS: ['primaryLinkUrl'],
  ACTOR: ['workspaceMemberId', 'source'],
  EMAILS: ['primaryEmail'],
  PHONES: [
    'primaryPhoneNumber',
    'primaryPhoneCountryCode',
    'primaryPhoneCallingCode',
  ],
  RICH_TEXT: ['blocknote', 'markdown', 'tiptap'],
};

export const recordAggregateExpression = (
  context: RecordQueryContext,
  object: RecordObject,
  aggregation: RecordAggregation,
) => {
  if (!aggregation.field) return 'COUNT(*)';
  const { field, operation } = aggregation;
  assertReadable(context, object, field);
  if (field.type === 'TS_VECTOR')
    return operation === 'countEmpty'
      ? 'COUNT(*)'
      : operation === 'percentageEmpty'
        ? 'CASE WHEN COUNT(*) > 0 THEN 1.0 END'
        : 'CASE WHEN COUNT(*) > 0 THEN 0 END';
  const column = fieldExpression(context, object, [
    field.name,
    ...(aggregation.subField ? [aggregation.subField] : []),
  ]);
  if (['min', 'max', 'avg', 'sum'].includes(operation))
    return `${operation}(${field.type === 'RATING' ? `CAST(substr(${column}, 8) AS REAL)` : column})`;
  const parts = AGGREGATE_SUB_FIELDS[field.type]?.map((name) =>
    fieldExpression(context, object, [field.name, name]),
  ) ?? [column];
  const value = `NULLIF(${parts.map((part) => `coalesce(CAST(${part} AS TEXT), '')`).join(' || ')}, '')`;
  const expressions: Record<string, string> = {
    countUniqueValues: `COUNT(DISTINCT ${value})`,
    countEmpty: `COUNT(*) - COUNT(${value})`,
    countNotEmpty: `COUNT(${value})`,
    percentageEmpty: `1.0 * (COUNT(*) - COUNT(${value})) / COUNT(*)`,
    percentageNotEmpty: `1.0 * COUNT(${value}) / COUNT(*)`,
    countTrue: `SUM(CASE WHEN ${column} = 1 THEN 1 ELSE 0 END)`,
    countFalse: `SUM(CASE WHEN ${column} = 0 THEN 1 ELSE 0 END)`,
  };
  return `CASE WHEN COUNT(*) > 0 THEN ${expressions[operation]} END`;
};
