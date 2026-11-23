import { isPlainObject } from 'crm-shared/utils';

import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import { RecordQueryEngine } from '@/workspace/record-api/record-query-engine';
import { selectedRecordFields } from '@/workspace/record-api/record-field-values.util';
import { compileRecordFilter } from '@/workspace/record-api/sql/compile-record-filter.util';
import { compileRecordOrder } from '@/workspace/record-api/sql/compile-record-order.util';
import {
  assertReadable,
  quoteIdentifier,
} from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordObject,
  type RecordQueryContext,
  type RecordSelection,
} from '@/workspace/record-api/types/record-query.type';
import {
  type QuerySignature,
  type RecordEvent,
} from '@/workspace/subscriptions/event-stream.type';

export const matchesRecordEvent = (
  context: RecordQueryContext,
  object: RecordObject,
  signature: QuerySignature,
  event: RecordEvent,
) => {
  if (signature.objectNameSingular !== object.nameSingular) return false;
  assertReadable(context, object);
  const filter = signature.variables.filter ?? {};
  compileRecordOrder(context, object, signature.variables.orderBy);
  if (isPlainObject(filter) && !Object.keys(filter).length) return true;
  const compiled = compileRecordFilter(
    context,
    object,
    ['DELETED', 'RESTORED'].includes(event.action)
      ? {
          and: [
            filter,
            {
              or: [
                { deletedAt: { is: 'NULL' } },
                { deletedAt: { is: 'NOT_NULL' } },
              ],
            },
          ],
        }
      : filter,
  );
  const candidates =
    event.action === 'UPDATED'
      ? [event.properties.after, event.properties.before]
      : [event.properties.after ?? event.properties.before];
  const columns = object.fields.flatMap((field) => {
    const column = computeFieldColumn(field);
    return column ? [column.columnName] : [];
  });
  return candidates.some(
    (record) =>
      record &&
      context.sql
        .exec(
          `WITH "eventData" AS (SELECT ? AS value), "eventRecord" AS (SELECT ${columns.map((column) => `json_extract(value, '$.${column}') AS ${quoteIdentifier(column)}`).join(', ')} FROM "eventData") SELECT 1 FROM "eventRecord" AS "record" WHERE ${compiled.expression}`,
          JSON.stringify(record),
          ...compiled.bindings,
        )
        .toArray().length > 0,
  );
};

const materialize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(materialize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    [
      ...Object.entries(value),
      ...(selectedRecordFields(value)?.entries() ?? []),
    ].map(([key, entry]) => [key, materialize(entry)]),
  );
};

export const readableRecordEvent = (
  context: RecordQueryContext,
  object: RecordObject,
  event: RecordEvent,
): RecordEvent | undefined => {
  const permission = context.permissions.objectRecordsPermissions.find(
    (permission) => permission.objectMetadataId === object.id,
  );
  if (!permission?.canReadAllRecords) return undefined;
  const unreadable = new Set(permission.unreadableFields);
  const readableFields = object.fields.filter(
    (field) => !unreadable.has(field.id),
  );
  const readableColumns = new Set(
    readableFields.flatMap((field) =>
      [field.name, computeFieldColumn(field)?.columnName].filter(
        (key): key is string => typeof key === 'string',
      ),
    ),
  );
  if (object.nameSingular === 'timelineActivity')
    readableColumns.delete('properties');
  const selection: RecordSelection = new Map();
  for (const field of readableFields) {
    const target = context.catalog.objectsById.get(
      field.relationTargetObjectMetadataId ?? '',
    );
    const targetPermission = context.permissions.objectRecordsPermissions.find(
      (permission) => permission.objectMetadataId === target?.id,
    );
    if (!target || !targetPermission?.canReadAllRecords) continue;
    const label = target.fields.find(
      (field) => field.id === target.labelIdentifierFieldMetadataId,
    );
    const targetSelection: RecordSelection = new Map([
      ['id', { name: 'id', arguments: {}, selection: new Map() }],
    ]);
    if (label && !targetPermission.unreadableFields.includes(label.id))
      targetSelection.set(label.name, {
        name: label.name,
        arguments: {},
        selection: new Map(),
      });
    selection.set(field.name, {
      name: field.name,
      arguments: {},
      selection:
        field.settings?.relationType === 'ONE_TO_MANY'
          ? new Map([
              [
                'edges',
                {
                  name: 'edges',
                  arguments: {},
                  selection: new Map([
                    [
                      'node',
                      {
                        name: 'node',
                        arguments: {},
                        selection: targetSelection,
                      },
                    ],
                  ]),
                },
              ],
            ])
          : targetSelection,
    });
  }
  const project = (record: Record<string, unknown> | undefined) => {
    if (!record) return undefined;
    const row = Object.fromEntries(
      Object.entries(record).filter(([key]) => readableColumns.has(key)),
    );
    // Timeline diffs can contain values of fields hidden on another object.
    if (object.nameSingular === 'timelineActivity') delete row.properties;
    return materialize(
      new RecordQueryEngine(context).hydrate(object, [row], selection)[0],
    ) as Record<string, unknown>;
  };
  const updatedFields = event.properties.updatedFields?.filter((key) =>
    readableColumns.has(key),
  );
  const diff = event.properties.diff
    ? Object.fromEntries(
        Object.entries(event.properties.diff).filter(([key]) =>
          readableColumns.has(key),
        ),
      )
    : undefined;
  return {
    ...event,
    properties: {
      before: project(event.properties.before),
      after: project(event.properties.after),
      updatedFields,
      diff,
    },
  };
};
