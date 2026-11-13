import { capitalize, isPlainObject } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { type RecordQueryEngine } from '@/workspace/record-api/record-query-engine';
import { recordTable } from '@/workspace/record-api/sql/record-sql.util';
import { COMPOSITE_GRAPHQL_TYPES } from '@/workspace/record-api/record-catalog.util';
import {
  type RecordData,
  type RecordObject,
  type RecordSelection,
} from '@/workspace/record-api/types/record-query.type';

export const findDuplicateRecords = (
  engine: RecordQueryEngine,
  object: RecordObject,
  arguments_: RecordData,
  selection: RecordSelection,
) => {
  if (arguments_.ids && arguments_.data)
    throw apiError('Specify duplicate ids or data');
  const criteria = object.duplicateCriteria as string[][] | null;
  const columns = new Map<string, string[]>();
  for (const field of object.fields) {
    const composite = engine.context.schema.getType(
      COMPOSITE_GRAPHQL_TYPES[field.type] ?? '',
    );
    if (composite && 'getFields' in composite) {
      for (const subField of Object.keys(composite.getFields()))
        columns.set(`${field.name}${capitalize(subField)}`, [
          field.name,
          subField,
        ]);
    } else columns.set(field.name, [field.name]);
  }
  let sources = (arguments_.data as RecordData[] | undefined) ?? [];
  if (Array.isArray(arguments_.ids) && arguments_.ids.length) {
    const fields: RecordSelection = new Map();
    for (const criterion of criteria ?? [])
      for (const name of criterion) {
        const path = columns.get(name);
        if (path)
          fields.set(path[0], {
            name: path[0],
            arguments: {},
            selection: new Map(),
          });
      }
    const records = engine.hydrate(
      object,
      engine.execute(
        `SELECT ${engine.projection(object, fields)} FROM ${recordTable(object)} AS "record" WHERE "id" IN (SELECT value FROM json_each(?)) AND "deletedAt" IS NULL`,
        [JSON.stringify(arguments_.ids)],
      ),
      fields,
    );
    sources = arguments_.ids.flatMap((id) =>
      records.filter((record) => record.id === id),
    );
  }
  return sources.map((source) => {
    const conditions: RecordData[] = [];
    for (const criterion of criteria ?? []) {
      const entries = criterion.map((name) => {
        const path = columns.get(name);
        const parent = source[path?.[0] ?? name];
        const value =
          path?.length === 2 && isPlainObject(parent)
            ? parent[path[1]]
            : parent;
        return { path, value };
      });
      if (
        entries.some(
          ({ path, value }) =>
            !path || typeof value !== 'string' || value.length < 3,
        )
      )
        continue;
      const filter: RecordData = {};
      for (const { path, value } of entries) {
        const existing = filter[path![0]];
        if (path!.length === 2)
          filter[path![0]] = {
            ...(isPlainObject(existing) ? existing : {}),
            [path![1]]: { eq: value },
          };
        else filter[path![0]] = { eq: value };
      }
      conditions.push(filter);
    }
    return engine
      .connections(
        object,
        {
          filter: conditions.length
            ? {
                or: conditions,
                ...(source.id ? { id: { neq: source.id } } : {}),
              }
            : { id: { in: [] } },
        },
        selection,
      )
      .get('');
  });
};
