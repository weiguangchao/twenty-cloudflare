import { Buffer } from 'node:buffer';

import { isPlainObject } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import {
  recordField,
  relationTarget,
} from '@/workspace/record-api/record-catalog.util';
import {
  enumValuesForField,
  fieldExpression,
} from '@/workspace/record-api/sql/record-field-expression.util';
import { sqlValue } from '@/workspace/record-api/sql/record-sql.util';
import {
  type OrderLeaf,
  type RecordData,
  type RecordObject,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';

export const compileRecordOrder = (
  context: RecordQueryContext,
  object: RecordObject,
  orderBy: unknown,
  alias = 'record',
): OrderLeaf[] => {
  if (orderBy !== undefined && orderBy !== null && !Array.isArray(orderBy))
    throw apiError('Invalid ordering');
  const leaves: OrderLeaf[] = [];
  const walk = (input: unknown, target: RecordObject, path: string[] = []) => {
    if (!isPlainObject(input) || path.length > 5)
      throw apiError('Invalid ordering');
    for (const [name, direction] of Object.entries(input)) {
      if (direction === null) continue;
      const field = recordField(
        target,
        path.length && !target.fieldsByName.has(name) ? path[0] : name,
      );
      if (isPlainObject(direction)) {
        if (field.relationTargetObjectMetadataId)
          walk(direction, relationTarget(context.catalog, field), [
            ...path,
            name,
          ]);
        else
          for (const [subField, order] of Object.entries(direction))
            append(
              [...path, name, subField],
              order,
              field.options?.map((option) => option.value),
            );
      } else
        append(
          [...path, name],
          direction,
          ['SELECT', 'MULTI_SELECT', 'RATING'].includes(field.type)
            ? field.options?.map((option) => option.value)
            : undefined,
          field.type === 'MULTI_SELECT',
        );
    }
  };
  const append = (
    path: string[],
    value: unknown,
    values?: string[],
    isArray = false,
  ) => {
    if (
      typeof value !== 'string' ||
      ![
        'AscNullsFirst',
        'AscNullsLast',
        'DescNullsFirst',
        'DescNullsLast',
      ].includes(value)
    )
      throw apiError('Invalid order direction');
    const cursorExpression = fieldExpression(context, object, path, alias);
    values = enumValuesForField(context, object, path) ?? values;
    const cases = values
      ?.map(
        (option, position) =>
          `WHEN '${option.replaceAll("'", "''")}' THEN ${position}`,
      )
      .join(' ');
    const expression = values?.length
      ? isArray
        ? `CASE WHEN ${cursorExpression} IS NULL THEN NULL ELSE coalesce((SELECT group_concat(printf('%08d', CASE value ${cases} END), '') FROM json_each(${cursorExpression})), '') END`
        : `CASE ${cursorExpression} ${cases} END`
      : cursorExpression;
    leaves.push({
      path,
      expression,
      cursorExpression,
      values,
      isArray,
      direction: value.startsWith('Asc') ? 'ASC' : 'DESC',
      nulls: value.endsWith('First') ? 'FIRST' : 'LAST',
    });
  };
  for (const input of (orderBy as unknown[] | undefined) ?? [])
    walk(input, object);
  if (!leaves.some((leaf) => leaf.path.length === 1 && leaf.path[0] === 'id'))
    append(['id'], 'AscNullsFirst');
  return leaves;
};

export const orderSql = (leaves: OrderLeaf[], reverse = false) =>
  leaves
    .map(
      (leaf) =>
        `${leaf.expression} ${reverse ? (leaf.direction === 'ASC' ? 'DESC' : 'ASC') : leaf.direction} NULLS ${reverse ? (leaf.nulls === 'FIRST' ? 'LAST' : 'FIRST') : leaf.nulls}`,
    )
    .join(', ');

const pathValue = (record: RecordData, path: string[]) => {
  let value: unknown = record;
  for (const name of path)
    value = isPlainObject(value) ? value[name] : undefined;
  return value;
};

export const cursorCondition = (
  leaves: OrderLeaf[],
  cursor: string,
  before: boolean,
  bindings: SqlStorageValue[],
) => {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw apiError('Invalid cursor');
  }
  if (!isPlainObject(decoded) || typeof decoded.id !== 'string')
    throw apiError('Invalid cursor');
  const conditions: string[] = [];
  for (let index = 0; index < leaves.length; index++) {
    const terms: string[] = [];
    for (let prefix = 0; prefix <= index; prefix++) {
      const leaf = leaves[prefix];
      const value = pathValue(decoded, leaf.path);
      if (value === undefined)
        throw apiError('Cursor does not match the requested ordering');
      const ordered =
        leaf.values && value !== null
          ? leaf.isArray
            ? (JSON.parse(String(value)) as string[])
                .map((item) =>
                  String(leaf.values!.indexOf(item)).padStart(8, '0'),
                )
                .join('')
            : leaf.values.indexOf(String(value))
          : value;
      if (prefix < index) {
        if (value === null) terms.push(`${leaf.expression} IS NULL`);
        else {
          bindings.push(sqlValue(ordered));
          terms.push(`${leaf.expression} = ?`);
        }
      } else {
        const nullsBefore = leaf.nulls === 'FIRST';
        if (value === null)
          terms.push(
            nullsBefore !== before ? `${leaf.expression} IS NOT NULL` : '0',
          );
        else {
          bindings.push(sqlValue(ordered));
          const operator = (leaf.direction === 'ASC') !== before ? '>' : '<';
          terms.push(
            `(${leaf.expression} ${operator} ?${nullsBefore === before ? ` OR ${leaf.expression} IS NULL` : ''})`,
          );
        }
      }
    }
    conditions.push(`(${terms.join(' AND ')})`);
  }
  return `(${conditions.join(' OR ')})`;
};

export const encodeRecordCursor = (record: RecordData, leaves: OrderLeaf[]) => {
  const data: RecordData = { id: record.id };
  leaves.forEach((leaf, index) => {
    let parent = data;
    leaf.path.slice(0, -1).forEach((name) => {
      if (!isPlainObject(parent[name])) parent[name] = {};
      parent = parent[name] as RecordData;
    });
    parent[leaf.path.at(-1)!] = record[`__cursor_${index}`] ?? null;
  });
  return Buffer.from(JSON.stringify(data)).toString('base64url');
};
