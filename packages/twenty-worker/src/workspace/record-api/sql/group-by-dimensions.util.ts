import { isPlainObject } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import {
  recordField,
  relationTarget,
} from '@/workspace/record-api/record-catalog.util';
import { fieldExpression } from '@/workspace/record-api/sql/record-field-expression.util';
import { timeZoneModifier } from '@/workspace/record-api/sql/time-zone-modifier.util';
import {
  type RecordObject,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';

const dateDimension = (
  context: RecordQueryContext,
  object: RecordObject,
  column: string,
  value: Record<string, unknown>,
  dateOnly: boolean,
) => {
  const granularity = value.granularity ?? 'NONE';
  if (granularity === 'NONE') return column;
  let expression = column;
  if (
    !dateOnly &&
    ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'].includes(String(granularity))
  ) {
    if (typeof value.timeZone !== 'string')
      throw apiError('A time zone is required for date grouping');
    expression = `datetime(${column}, ${timeZoneModifier(context, object, column, value.timeZone)})`;
  }
  const date = (modifier = '') =>
    `strftime('%Y-%m-%d', ${expression}${modifier})`;
  switch (granularity) {
    case 'DAY':
      return date();
    case 'MONTH':
      return date(", 'start of month'");
    case 'YEAR':
      return date(", 'start of year'");
    case 'QUARTER':
      return date(
        `, 'start of month', '-' || ((CAST(strftime('%m', ${expression}) AS INTEGER) - 1) % 3) || ' months'`,
      );
    case 'WEEK': {
      if (
        value.weekStartDay !== undefined &&
        !['MONDAY', 'SUNDAY', 'SATURDAY'].includes(String(value.weekStartDay))
      )
        throw apiError('Invalid week start');
      const start =
        value.weekStartDay === 'SUNDAY'
          ? 0
          : value.weekStartDay === 'SATURDAY'
            ? 6
            : 1;
      return date(
        `, '-' || ((CAST(strftime('%w', ${expression}) AS INTEGER) - ${start} + 7) % 7) || ' days'`,
      );
    }
    case 'DAY_OF_THE_WEEK':
      return `CASE strftime('%w', ${expression}) ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => `WHEN '${index}' THEN '${day}'`).join(' ')} END`;
    case 'MONTH_OF_THE_YEAR':
      return `CASE strftime('%m', ${expression}) ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => `WHEN '${String(index + 1).padStart(2, '0')}' THEN '${month}'`).join(' ')} END`;
    case 'QUARTER_OF_THE_YEAR':
      return `'Q' || (CAST((CAST(strftime('%m', ${expression}) AS INTEGER) - 1) / 3 AS INTEGER) + 1)`;
    default:
      throw apiError('Invalid date granularity');
  }
};

export const groupByDimensions = (
  context: RecordQueryContext,
  object: RecordObject,
  input: unknown,
) => {
  if (!Array.isArray(input) || !input.length || input.length > 5)
    throw apiError('Specify one to five group dimensions');
  const dimensions: {
    path: string[];
    expression: string;
    orderExpression: string;
    isBoolean: boolean;
  }[] = [];
  let from = '';
  const walk = (target: RecordObject, group: unknown, path: string[] = []) => {
    if (
      !isPlainObject(group) ||
      Object.keys(group).length !== 1 ||
      path.length > 5
    )
      throw apiError('Each group dimension must have one field');
    const [name, value] = Object.entries(group)[0];
    const field = recordField(target, name);
    const current = [...path, name];
    if (field.relationTargetObjectMetadataId) {
      walk(relationTarget(context.catalog, field), value, current);
      return;
    }
    let expression: string;
    if (['DATE', 'DATE_TIME'].includes(field.type)) {
      if (!isPlainObject(value)) throw apiError('Invalid date group');
      expression = dateDimension(
        context,
        object,
        fieldExpression(context, object, current),
        value,
        field.type === 'DATE',
      );
    } else if (isPlainObject(value)) {
      if (Object.keys(value).length !== 1 || Object.values(value)[0] !== true)
        throw apiError('Invalid composite group');
      current.push(Object.keys(value)[0]);
      expression = fieldExpression(context, object, current);
    } else {
      if (value !== true) throw apiError('Invalid group dimension');
      expression = fieldExpression(context, object, current);
      if (['MULTI_SELECT', 'ARRAY'].includes(field.type)) {
        const alias = `dimension_${dimensions.length}`;
        from += ` LEFT JOIN json_each(${expression}) AS "${alias}" ON 1`;
        expression = `"${alias}"."value"`;
      }
    }
    const orderExpression =
      ['SELECT', 'MULTI_SELECT', 'RATING'].includes(field.type) &&
      field.options?.length
        ? `CASE ${expression} ${field.options.map((option, index) => `WHEN '${option.value.replaceAll("'", "''")}' THEN ${index}`).join(' ')} END`
        : expression;
    dimensions.push({
      path: current,
      expression,
      orderExpression,
      isBoolean: field.type === 'BOOLEAN',
    });
  };
  input.forEach((group) => walk(object, group));
  return { dimensions, from };
};
