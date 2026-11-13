import { isPlainObject } from 'twenty-shared/utils';
import {
  compileSearchMatch,
  readableSearchFields,
  searchTerms,
} from '@/workspace/search/search-match.util';

import { apiError } from '@/shared/errors/api-error.util';
import { RECORD_COMPOSITE_NULL_EQUIVALENTS } from '@/workspace/record-api/record-null-equivalents.constant';
import {
  COMPOSITE_GRAPHQL_TYPES,
  recordField,
  relationTarget,
} from '@/workspace/record-api/record-catalog.util';
import {
  enumValuesForField,
  fieldExpression,
} from '@/workspace/record-api/sql/record-field-expression.util';
import {
  assertReadable,
  quoteIdentifier,
  recordTable,
  sqlValue,
} from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordObject,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';

const mentionsDeletedAt = (filter: unknown): boolean => {
  if (Array.isArray(filter)) return filter.some(mentionsDeletedAt);
  return (
    isPlainObject(filter) &&
    Object.entries(filter).some(
      ([key, value]) =>
        key === 'deletedAt' ||
        (['and', 'or', 'not'].includes(key) && mentionsDeletedAt(value)),
    )
  );
};

export const compileTextPattern = (
  expression: string,
  pattern: string,
  insensitive: boolean,
  bindings: SqlStorageValue[],
) => {
  const input = insensitive ? `lower(${expression})` : expression;
  const value = insensitive
    ? pattern.replace(/[A-Z]/g, (character) => character.toLowerCase())
    : pattern;
  const start = value.startsWith('%'),
    end = value.endsWith('%');
  const text = value.slice(start ? 1 : 0, end ? -1 : undefined);
  if (!/[%_\\]/.test(text)) {
    bindings.push(text);
    if (start && end) return `instr(${input}, ?) > 0`;
    if (!start && !end) return `${input} = ?`;
    if (start) {
      bindings.push(text);
      return `substr(${input}, -length(?)) = ?`;
    }
    bindings.push(text);
    return `substr(${input}, 1, length(?)) = ?`;
  }
  if (pattern.length > 2048) throw apiError('Text pattern is too long');
  const tokens: { kind: string; value?: string }[] = [];
  const characters = [...value];
  for (let index = 0; index < characters.length; index++) {
    const character = characters[index];
    if (character === '\\') {
      if (index + 1 === characters.length)
        throw apiError('Invalid escaped text pattern');
      tokens.push({ kind: 'literal', value: characters[++index] });
    } else
      tokens.push(
        character === '%'
          ? { kind: 'many' }
          : character === '_'
            ? { kind: 'any' }
            : { kind: 'literal', value: character },
      );
  }
  bindings.push(JSON.stringify(tokens));
  // Preserve SQL wildcards without SQLite's 50-byte LIKE pattern limit.
  return `EXISTS (WITH RECURSIVE tokens AS (SELECT CAST(key AS INTEGER) + 1 AS position, value ->> '$.kind' AS kind, value ->> '$.value' AS literal FROM json_each(?)), matches(patternPosition, textPosition) AS (VALUES (1, 1) UNION SELECT patternPosition + 1, textPosition + 1 FROM matches JOIN tokens ON tokens.position = patternPosition WHERE kind != 'many' AND (kind = 'any' OR literal = substr(${input}, textPosition, 1)) AND textPosition <= length(${input}) UNION SELECT patternPosition + 1, textPosition FROM matches JOIN tokens ON tokens.position = patternPosition WHERE kind = 'many' UNION SELECT patternPosition, textPosition + 1 FROM matches JOIN tokens ON tokens.position = patternPosition WHERE kind = 'many' AND textPosition <= length(${input})) SELECT 1 FROM matches WHERE patternPosition = ${tokens.length + 1} AND textPosition = length(${input}) + 1)`;
};

export const compileRecordFilter = (
  context: RecordQueryContext,
  object: RecordObject,
  filter: unknown = {},
  alias = 'record',
  bindings: SqlStorageValue[] = [],
  depth = 0,
): { expression: string; bindings: SqlStorageValue[] } => {
  filter ??= {};
  if (depth > 20 || !isPlainObject(filter))
    throw apiError('Invalid record filter');
  assertReadable(context, object);
  const compile = (
    input: Record<string, unknown>,
    path: string[] = [],
  ): string => {
    const conditions: string[] = [];
    for (const [name, comparison] of Object.entries(input)) {
      if (comparison === null || comparison === undefined) continue;
      if (path.length === 0 && ['and', 'or', 'not'].includes(name)) {
        if (name === 'not') {
          if (!isPlainObject(comparison))
            throw apiError('Invalid logical filter');
          conditions.push(`NOT (${compile(comparison)})`);
        } else {
          if (
            !Array.isArray(comparison) ||
            comparison.some((item) => !isPlainObject(item))
          )
            throw apiError('Invalid logical filter');
          const children = comparison.map(
            (item) => `(${compile(item as Record<string, unknown>)})`,
          );
          conditions.push(
            children.length
              ? children.join(name === 'and' ? ' AND ' : ' OR ')
              : name === 'and'
                ? '1'
                : '0',
          );
        }
        continue;
      }
      const field = recordField(object, path[0] ?? name);
      assertReadable(context, object, field);
      if (
        path.length === 0 &&
        field.relationTargetObjectMetadataId &&
        field.name === name
      ) {
        const target = relationTarget(context.catalog, field);
        const targetAlias = `${alias}_${name}`;
        const joinColumn = field.settings?.joinColumnName ?? `${field.name}Id`;
        const nested = compileRecordFilter(
          context,
          target,
          comparison,
          targetAlias,
          bindings,
          depth + 1,
        );
        conditions.push(
          `EXISTS (SELECT 1 FROM ${recordTable(target)} AS ${quoteIdentifier(targetAlias)} WHERE ${quoteIdentifier(targetAlias)}."id" = ${quoteIdentifier(alias)}.${quoteIdentifier(joinColumn)} AND (${nested.expression}))`,
        );
        continue;
      }
      if (!isPlainObject(comparison)) throw apiError('Invalid field filter');
      if (path.length === 0 && COMPOSITE_GRAPHQL_TYPES[field.type]) {
        conditions.push(compile(comparison, [name]));
        continue;
      }
      if (field.type === 'TS_VECTOR') {
        if (Object.keys(comparison).some((operator) => operator !== 'search'))
          throw apiError('Invalid search filter');
        const search = comparison.search;
        if (typeof search !== 'string') throw apiError('Invalid search term');
        conditions.push(
          compileSearchMatch(
            object,
            readableSearchFields(context, object),
            searchTerms(search),
            alias,
            bindings,
          ),
        );
        continue;
      }
      const expression = fieldExpression(
        context,
        object,
        [...path, name],
        alias,
      );
      const array = field.type === 'MULTI_SELECT' || field.type === 'ARRAY';
      const nullEquivalent = array
        ? []
        : path.length
          ? RECORD_COMPOSITE_NULL_EQUIVALENTS[field.type]?.[name]
          : field.type === 'TEXT'
            ? ''
            : undefined;
      for (const [operator, expected] of Object.entries(comparison)) {
        if (expected === undefined) continue;
        const operators: Record<string, string> = {
          eq: '=',
          neq: '!=',
          gt: '>',
          gte: '>=',
          lt: '<',
          lte: '<=',
        };
        if (operators[operator]) {
          if (expected === null)
            conditions.push(
              `${expression} IS ${operator === 'neq' ? 'NOT ' : ''}NULL`,
            );
          else if (array && ['eq', 'neq'].includes(operator)) {
            bindings.push(sqlValue(expected));
            conditions.push(
              `${operator === 'neq' ? 'NOT ' : ''}EXISTS (SELECT 1 FROM json_each(${expression}) WHERE value = ?)`,
            );
          } else {
            const enumOrder =
              ['gt', 'gte', 'lt', 'lte'].includes(operator) && !array
                ? enumValuesForField(context, object, [...path, name])
                : undefined;
            const comparisonExpression = enumOrder
              ? `CASE ${expression} ${enumOrder.map((option, index) => `WHEN '${option.replaceAll("'", "''")}' THEN ${index}`).join(' ')} END`
              : expression;
            bindings.push(
              enumOrder
                ? enumOrder.indexOf(String(expected))
                : sqlValue(expected),
            );
            conditions.push(
              `(${comparisonExpression} ${operators[operator]} ?${operator === 'neq' && expected !== '' ? ` OR ${expression} IS NULL` : operator === 'eq' && expected === '' && nullEquivalent === '' ? ` OR ${expression} IS NULL` : ''})`,
            );
          }
        } else if (
          ['gtField', 'gteField', 'ltField', 'lteField'].includes(operator)
        ) {
          if (typeof expected !== 'string')
            throw apiError('Invalid reference field');
          conditions.push(
            `${expression} ${operators[operator.slice(0, -5)]} ${fieldExpression(context, object, expected.split('.'), alias)}`,
          );
        } else if (operator === 'is') {
          if (expected !== 'NULL' && expected !== 'NOT_NULL')
            throw apiError('Invalid null filter');
          conditions.push(
            `(${expression} IS ${expected === 'NOT_NULL' ? 'NOT ' : ''}NULL${expected === 'NULL' && nullEquivalent !== undefined ? (Array.isArray(nullEquivalent) ? ` OR json_array_length(${expression}) = 0` : ` OR ${expression} = ''`) : ''})`,
          );
        } else if (operator === 'in' || operator === 'containsAny') {
          if (!Array.isArray(expected))
            throw apiError('Expected a filter list');
          expected.forEach(sqlValue);
          bindings.push(JSON.stringify(expected));
          conditions.push(
            array
              ? `EXISTS (SELECT 1 FROM json_each(${expression}) AS member WHERE member.value IN (SELECT value FROM json_each(?)))`
              : `${expression} IN (SELECT value FROM json_each(?))`,
          );
        } else if (operator === 'isEmptyArray') {
          if (typeof expected !== 'boolean')
            throw apiError('Invalid array filter');
          conditions.push(
            expected
              ? `(${expression} IS NULL OR json_array_length(${expression}) = 0)`
              : `json_array_length(${expression}) > 0`,
          );
        } else if (
          ['startsWith', 'endsWith', 'like', 'ilike', 'containsIlike'].includes(
            operator,
          )
        ) {
          if (typeof expected !== 'string')
            throw apiError('Invalid text filter');
          if (operator === 'endsWith' && expected === '') {
            conditions.push(`${expression} IS NOT NULL`);
            continue;
          }
          if (operator === 'startsWith' || operator === 'endsWith') {
            bindings.push(expected, expected);
            conditions.push(
              operator === 'startsWith'
                ? `substr(${expression}, 1, length(?)) = ?`
                : `substr(${expression}, -length(?)) = ?`,
            );
            continue;
          }
          const pattern =
            operator === 'startsWith'
              ? `${expected}%`
              : operator === 'endsWith'
                ? `%${expected}`
                : expected;
          conditions.push(
            operator === 'containsIlike'
              ? `EXISTS (SELECT 1 FROM json_each(${expression}) AS member WHERE ${compileTextPattern('member.value', pattern, true, bindings)})`
              : compileTextPattern(
                  expression,
                  pattern,
                  operator === 'ilike',
                  bindings,
                ),
          );
        } else throw apiError(`Unsupported filter operator ${operator}`);
      }
    }
    return conditions.length
      ? conditions.map((condition) => `(${condition})`).join(' AND ')
      : '1';
  };
  const expression = compile(filter);
  return {
    expression: `${mentionsDeletedAt(filter) ? '' : `${quoteIdentifier(alias)}."deletedAt" IS NULL AND `}(${expression})`,
    bindings,
  };
};
