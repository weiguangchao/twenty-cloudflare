import { capitalize, isPlainObject } from 'twenty-shared/utils';

import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { enqueueOutbox } from '@/workspace/events/enqueue-outbox.util';
import {
  type RecordChangeAction,
  type RecordChangeEvent,
} from '@/workspace/events/types/record-change-event.type';
import {
  type RecordData,
  type RecordObject,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';
import {
  quoteIdentifier,
  executeRecordSql,
  recordTable,
} from '@/workspace/record-api/sql/record-sql.util';
import { bumpMetadataCollectionHashes } from '@/workspace/metadata/storage/metadata-collection-hashes.util';

const insertTimeline = (
  context: RecordQueryContext,
  target: RecordObject,
  targetId: string,
  typeName: string,
  properties: RecordData,
  linked?: { object: RecordObject; record: RecordData },
) => {
  const timelineObject = context.catalog.objects.find(
    (object) => object.nameSingular === 'timelineActivity',
  );
  const join = timelineObject?.fields.find(
    (field) =>
      field.relationTargetObjectMetadataId === target.id &&
      field.settings?.relationType === 'MANY_TO_ONE',
  );
  if (!timelineObject || !join) return;
  const type = new MetadataStore(context.sql).findMany('timelineActivityType', {
    name: typeName,
  })[0];
  if (!type) return;
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    position: 0,
    createdAt: now,
    updatedAt: now,
    happensAt: now,
    createdBy: context.mutation!.actor,
    updatedBy: context.mutation!.actor,
    workspaceMemberId: context.mutation!.actor.workspaceMemberId ?? null,
    timelineActivityTypeId: type.id,
    timelineActivityTypeSnapshot: {
      id: type.id,
      universalIdentifier: type.universalIdentifier,
      name: type.name,
      label: type.label,
      icon: type.icon,
      action: type.action,
      objectUniversalIdentifier: type.objectUniversalIdentifier,
      frontComponentUniversalIdentifier: type.frontComponentUniversalIdentifier,
    },
    properties,
    [join.settings?.joinColumnName ?? `${join.name}Id`]: targetId,
    linkedObjectMetadataId: linked?.object.id ?? null,
    linkedRecordId: linked?.record.id ?? null,
    linkedRecordCachedName: linked?.record.title ?? linked?.record.name ?? null,
  };
  executeRecordSql(
    context.sql,
    `INSERT INTO "rec_timelineActivity" (${Object.keys(record).map(quoteIdentifier).join(', ')}) VALUES (${Object.keys(
      record,
    )
      .map(() => '?')
      .join(', ')})`,
    Object.values(record).map((value) =>
      value !== null && typeof value === 'object'
        ? JSON.stringify(value)
        : (value as SqlStorageValue),
    ),
  );
};

export const recordChangeEffects = (
  context: RecordQueryContext,
  object: RecordObject,
  action: RecordChangeAction,
  before: RecordData | undefined,
  after: RecordData | undefined,
) => {
  const mutation = context.mutation!;
  mutation.changed = true;
  const record = after ?? before!;
  const updatedFields =
    before && after
      ? Object.keys(after).filter(
          (name) =>
            JSON.stringify(before[name]) !== JSON.stringify(after[name]),
        )
      : [];
  const diff = Object.fromEntries(
    updatedFields.map((name) => [
      name,
      { before: before?.[name], after: after?.[name] },
    ]),
  );
  const base = {
    recordId: String(record.id),
    ...(mutation.identity.userId ? mutation.identity : {}),
  };
  const event: RecordChangeEvent =
    action === 'created'
      ? { ...base, properties: { after: after! } }
      : action === 'destroyed'
        ? { ...base, properties: { before: before! } }
        : {
            ...base,
            properties: { before: before!, after: after!, updatedFields, diff },
          };
  enqueueOutbox(context.sql, 'record-event', {
    name: `${object.nameSingular}.${action}`,
    objectMetadata: { id: object.id, nameSingular: object.nameSingular },
    event,
  });
  if (action === 'deleted' || action === 'destroyed') {
    const store = new MetadataStore(context.sql);
    store.delete(
      'navigationMenuItem',
      store
        .findMany('navigationMenuItem', { targetRecordId: String(record.id) })
        .map((item) => item.id),
    );
    if (store.touchedEntityNames.size)
      bumpMetadataCollectionHashes(context.sql, store.touchedEntityNames);
  }
  const files = (row: RecordData | undefined) =>
    object.fields
      .filter((field) => field.type === 'FILES')
      .flatMap((field) =>
        Array.isArray(row?.[field.name])
          ? (row[field.name] as unknown[]).flatMap((file) =>
              isPlainObject(file) && typeof file.fileId === 'string'
                ? [file.fileId]
                : [],
            )
          : [],
      );
  const retained = new Set(files(after));
  const removed = files(before).filter((id) => !retained.has(id));
  if (removed.length)
    enqueueOutbox(context.sql, 'file-cleanup', {
      fileIds: removed,
      objectMetadataId: object.id,
      recordId: record.id,
    });
  if (object.nameSingular === 'timelineActivity') return;
  const timelineDiff = Object.fromEntries(
    Object.entries(diff).map(([name, change]) => {
      const relation = object.fields.find(
        (field) =>
          field.settings?.relationType === 'MANY_TO_ONE' &&
          (field.settings.joinColumnName ?? `${field.name}Id`) === name,
      );
      return relation
        ? [
            relation.name,
            { before: { id: change.before }, after: { id: change.after } },
          ]
        : [name, change];
    }),
  );
  if (action !== 'destroyed')
    insertTimeline(
      context,
      object,
      String(record.id),
      `record${capitalize(action)}`,
      { diff: timelineDiff },
    );
  if (action === 'updated' && ['note', 'task'].includes(object.nameSingular)) {
    const junction = context.catalog.objects.find(
      (candidate) => candidate.nameSingular === `${object.nameSingular}Target`,
    );
    if (junction)
      for (const relation of context.sql
        .exec<Record<string, SqlStorageValue>>(
          `SELECT * FROM ${recordTable(junction)} WHERE ${quoteIdentifier(`${object.nameSingular}Id`)} = ? AND "deletedAt" IS NULL`,
          String(record.id),
        )
        .toArray()) {
        for (const field of junction.fields.filter(
          (field) =>
            field.name.startsWith('target') &&
            field.relationTargetObjectMetadataId,
        )) {
          const targetId =
            relation[field.settings?.joinColumnName ?? `${field.name}Id`];
          if (typeof targetId === 'string')
            insertTimeline(
              context,
              context.catalog.objectsById.get(
                field.relationTargetObjectMetadataId!,
              )!,
              targetId,
              `${object.nameSingular}Updated`,
              { diff: timelineDiff },
              { object, record },
            );
        }
      }
  }
  if (
    ['noteTarget', 'taskTarget', 'attachment'].includes(object.nameSingular)
  ) {
    const kind =
      object.nameSingular === 'noteTarget'
        ? 'note'
        : object.nameSingular === 'taskTarget'
          ? 'task'
          : 'attachment';
    const linkedObject = context.catalog.objects.find(
      (candidate) => candidate.nameSingular === kind,
    )!;
    const linkedId = kind === 'attachment' ? record.id : record[`${kind}Id`];
    const linkedRecord =
      kind === 'attachment'
        ? record
        : executeRecordSql(
            context.sql,
            `SELECT * FROM ${recordTable(linkedObject)} WHERE "id" = ?`,
            [String(linkedId)],
          )[0];
    if (!linkedRecord) return;
    for (const field of object.fields.filter(
      (field) =>
        field.name.startsWith('target') && field.relationTargetObjectMetadataId,
    )) {
      const targetId =
        record[field.settings?.joinColumnName ?? `${field.name}Id`];
      const targetObject = context.catalog.objectsById.get(
        field.relationTargetObjectMetadataId!,
      )!;
      if (typeof targetId === 'string' && action !== 'updated')
        insertTimeline(
          context,
          targetObject,
          targetId,
          `${kind}${action === 'created' || action === 'restored' ? 'Linked' : 'Unlinked'}`,
          {},
          { object: linkedObject, record: linkedRecord },
        );
    }
  }
};
