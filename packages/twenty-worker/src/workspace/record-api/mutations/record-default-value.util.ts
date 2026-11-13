import { isPlainObject } from 'twenty-shared/utils';

import { type JsonValue } from '@/workspace/metadata/types/json-value.type';

export const recordDefaultValue = (value: JsonValue): JsonValue => {
  if (typeof value === 'string') {
    if (value === 'now') return new Date().toISOString();
    if (value === 'uuid') return crypto.randomUUID();
    if (value.startsWith("'") && value.endsWith("'"))
      return value.slice(1, -1).replaceAll("''", "'");
  }
  if (Array.isArray(value)) return value.map(recordDefaultValue);
  if (isPlainObject(value))
    return Object.fromEntries(
      Object.entries(value).map(([name, entry]) => [
        name,
        recordDefaultValue(entry as JsonValue),
      ]),
    );
  return value;
};
