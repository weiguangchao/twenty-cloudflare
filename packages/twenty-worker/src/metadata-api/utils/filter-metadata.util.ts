import { isPlainObject } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';

export type MetadataFilter = {
  and?: MetadataFilter[];
  or?: MetadataFilter[];
  [fieldName: string]: unknown;
};

export const matchesMetadataFilter = (
  row: object,
  filter: MetadataFilter = {},
): boolean =>
  Object.entries(filter).every(([name, comparison]) => {
    if (name === 'and')
      return (comparison as MetadataFilter[]).every((condition) =>
        matchesMetadataFilter(row, condition),
      );
    if (name === 'or')
      return (comparison as MetadataFilter[]).some((condition) =>
        matchesMetadataFilter(row, condition),
      );
    if (!isPlainObject(comparison)) throw apiError('Invalid metadata filter');
    const value = (row as Record<string, unknown>)[name];

    return Object.entries(comparison).every(([operator, expected]) => {
      switch (operator) {
        case 'eq':
        case 'is':
        case 'like':
        case 'iLike':
          return value === expected;
        case 'neq':
        case 'isNot':
        case 'notLike':
        case 'notILike':
          return value !== expected;
        case 'in':
          return Array.isArray(expected) && expected.includes(value);
        case 'notIn':
          return Array.isArray(expected) && !expected.includes(value);
        case 'gt':
          return String(value) > String(expected);
        case 'gte':
          return String(value) >= String(expected);
        case 'lt':
          return String(value) < String(expected);
        case 'lte':
          return String(value) <= String(expected);
        default:
          throw apiError(`Unsupported metadata filter: ${operator}`);
      }
    });
  });
