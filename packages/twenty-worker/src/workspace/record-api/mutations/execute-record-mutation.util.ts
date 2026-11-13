import { capitalize } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { RecordMutationEngine } from '@/workspace/record-api/mutations/record-mutation-engine';
import { mergeRecords } from '@/workspace/record-api/mutations/merge-records.util';
import {
  type RecordData,
  type RecordQueryContext,
  type RecordSelection,
} from '@/workspace/record-api/types/record-query.type';

export const executeRecordMutation = (
  name: string,
  arguments_: RecordData,
  context: RecordQueryContext,
  selection: RecordSelection,
) => {
  const object = context.catalog.objects.find((object) =>
    ['create', 'update', 'delete', 'restore', 'destroy', 'merge'].some(
      (operation) =>
        name === `${operation}${object.typeName}` ||
        name === `${operation}${capitalize(object.namePlural)}`,
    ),
  );
  if (!object) throw apiError('Unknown record mutation');
  const operation = name.match(
    /^(create|update|delete|restore|destroy|merge)/,
  )![0];
  const many = name === `${operation}${capitalize(object.namePlural)}`;
  const engine = new RecordMutationEngine(context);
  let rows: RecordData[];
  if (operation === 'merge')
    return engine.project(
      object,
      [mergeRecords(engine, object, arguments_)],
      selection,
    )[0];
  if (operation === 'create')
    rows = engine.createMany(
      object,
      many ? (arguments_.data as unknown[]) : [arguments_.data],
      arguments_.upsert === true,
    );
  else {
    engine.permission(
      object,
      operation === 'restore'
        ? 'update'
        : (operation as 'update' | 'delete' | 'destroy'),
    );
    const ids = many
      ? engine.matchingIds(
          object,
          arguments_.filter,
          operation === 'restore' || operation === 'destroy',
        )
      : [String(arguments_.id)];
    rows = ids.map((id) =>
      operation === 'update'
        ? engine.updateOne(object, id, arguments_.data)
        : engine.lifecycle(
            object,
            id,
            operation as 'delete' | 'destroy' | 'restore',
          ),
    );
  }
  const projected = engine.project(object, rows, selection);
  return many ? projected : (projected[0] ?? null);
};
