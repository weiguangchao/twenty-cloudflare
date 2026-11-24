import { isPlainObject } from 'crm-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';

const splitConditions = (value: string) => {
  const conditions: string[] = [];
  let depth = 0;
  let start = 0;
  let quote = '';
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== '\\') quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '(' || character === '[' || character === '{') depth++;
    if (character === ')' || character === ']' || character === '}') depth--;
    if (character === ',' && depth === 0) {
      conditions.push(value.slice(start, index));
      start = index + 1;
    }
    if (depth < 0) throw apiError('Invalid REST filter');
  }
  if (depth || quote) throw apiError('Invalid REST filter');
  conditions.push(value.slice(start));
  return conditions;
};

export const parseRestFilter = (
  value: string | undefined,
  depth = 0,
): Record<string, unknown> => {
  if (!value) return {};
  if (value.length > 16_000 || depth > 12)
    throw apiError('REST filter is too complex');
  if (value.trim().startsWith('{')) {
    const parsed: unknown = JSON.parse(value);
    if (!isPlainObject(parsed)) throw apiError('Invalid REST filter');
    return parsed;
  }
  const conjunction = /^(and|or|not)\((.*)\)$/.exec(value);
  if (conjunction) {
    const children = splitConditions(conjunction[2]).map((condition) =>
      parseRestFilter(condition, depth + 1),
    );
    if (conjunction[1] === 'not' && children.length !== 1)
      throw apiError('REST not filter requires one condition');
    return {
      [conjunction[1]]: conjunction[1] === 'not' ? children[0] : children,
    };
  }
  const conditions = splitConditions(value);
  if (conditions.length > 1)
    return {
      and: conditions.map((condition) => parseRestFilter(condition, depth + 1)),
    };
  const condition = /^([A-Za-z][A-Za-z0-9_.]*)\[([A-Za-z]+)\]:(.*)$/.exec(
    value,
  );
  if (!condition) throw apiError('Invalid REST filter');
  let parsed: unknown = condition[3];
  try {
    parsed = JSON.parse(condition[3]);
  } catch {
    // Unquoted strings are valid in REST filters.
  }
  if (
    (condition[2] === 'in' || condition[2] === 'containsAny') &&
    typeof parsed === 'string'
  )
    parsed = parsed.replace(/^\[|\]$/g, '').split(',');
  return condition[1]
    .split('.')
    .reverse()
    .reduce<Record<string, unknown>>((nested, field) => ({ [field]: nested }), {
      [condition[2]]: parsed,
    });
};
