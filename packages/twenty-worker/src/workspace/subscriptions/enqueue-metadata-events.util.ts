import { enqueueOutbox } from '@/workspace/events/enqueue-outbox.util';
import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { getMetadataCollectionHashes } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { type MetadataChange } from '@/workspace/subscriptions/event-stream.type';

export const enqueueMetadataEvents = (
  sql: SqlStorage,
  store: MetadataStore,
) => {
  const hashes = new Map(
    getMetadataCollectionHashes(sql).map((entry) => [
      entry.collectionName as string,
      entry.hash,
    ]),
  );
  const events: MetadataChange[] = [];
  for (const [entityName, beforeRows] of store.originalRowsByEntityName) {
    if (!store.touchedEntityNames.has(entityName)) continue;
    const afterRows = new Map(
      store
        .findMany(entityName)
        .map((row) => [row.id, row as Record<string, unknown>]),
    );
    const beforeById = new Map(beforeRows.map((row) => [String(row.id), row]));
    const metadataName = entityName === 'indexMetadata' ? 'index' : entityName;
    for (const id of new Set([...beforeById.keys(), ...afterRows.keys()])) {
      const before = beforeById.get(id),
        after = afterRows.get(id);
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      const updatedFields =
        before && after
          ? Object.keys(after).filter(
              (key) =>
                JSON.stringify(before[key]) !== JSON.stringify(after[key]),
            )
          : [];
      events.push({
        metadataName,
        recordId: id,
        type: !before ? 'CREATED' : !after ? 'DELETED' : 'UPDATED',
        updatedCollectionHash: hashes.get(metadataName),
        properties: {
          before,
          after,
          updatedFields,
          diff: Object.fromEntries(
            updatedFields.map((key) => [
              key,
              { before: before?.[key], after: after?.[key] },
            ]),
          ),
        },
      });
    }
  }
  // Index field rows live inside the index payload on the client.
  for (const indexField of events.filter(
    (event) => event.metadataName === 'indexFieldMetadata',
  )) {
    const id = String(
      (indexField.properties.after ?? indexField.properties.before)
        ?.indexMetadataId,
    );
    const index = store.findById('indexMetadata', id);
    if (
      index &&
      !events.some(
        (event) => event.metadataName === 'index' && event.recordId === id,
      )
    )
      events.push({
        metadataName: 'index',
        recordId: id,
        type: 'UPDATED',
        updatedCollectionHash: hashes.get('index'),
        properties: { after: index },
      });
  }
  const visibleEvents = events.filter(
    (event) => !['indexFieldMetadata', 'file'].includes(event.metadataName),
  );
  if (visibleEvents.length) enqueueOutbox(sql, 'metadata-event', visibleEvents);
};
