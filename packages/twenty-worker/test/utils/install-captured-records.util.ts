import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import {
  addFieldColumn,
  createRecordTable,
} from '@/workspace/metadata/ddl/record-table-ddl.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { bumpMetadataCollectionHashes } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { type MetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { type JsonValue } from '@/workspace/metadata/types/json-value.type';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import { synchronizeSearchIndexes } from '@/workspace/search/synchronize-search-indexes.util';
import { WorkspaceFileStore } from '@/files/workspace-file-store';

import { type readRecordFixtures } from '../config/read-record-fixtures.util';
import { createRecordIdentity, insertRecord } from './record-query-test.util';

export const installCapturedRecords = (
  storage: DurableObjectStorage,
  instance: WorkspaceDurableObject,
  contracts: ReturnType<typeof readRecordFixtures>,
) => {
  const { sql } = storage;
  storage.transactionSync(() => {
    sql.exec('PRAGMA defer_foreign_keys = ON');
    const store = new MetadataStore(sql);
    const object = contracts.customObject;
    store.insert('objectMetadata', {
      ...object,
      labelIdentifierFieldMetadataId: null,
      imageIdentifierFieldMetadataId: null,
    });
    for (const field of contracts.customFields)
      store.insert('fieldMetadata', field as MetadataRow<'fieldMetadata'>);
    const objectName = (id: string) =>
      store.findById('objectMetadata', id)!.nameSingular;
    createRecordTable(
      sql,
      object.nameSingular,
      contracts.customFields.filter(
        (field) => field.objectMetadataId === object.id,
      ),
      objectName,
    );
    for (const field of contracts.customFields.filter(
      (field) => field.objectMetadataId !== object.id,
    ))
      addFieldColumn(
        sql,
        objectName(field.objectMetadataId),
        field,
        objectName,
      );
    store.update('objectMetadata', object.id, {
      labelIdentifierFieldMetadataId: object.labelIdentifierFieldMetadataId,
      imageIdentifierFieldMetadataId: object.imageIdentifierFieldMetadataId,
    });
    for (const field of contracts.customSearchFields)
      store.insert(
        'searchFieldMetadata',
        field as MetadataRow<'searchFieldMetadata'>,
      );
    synchronizeSearchIndexes(sql);
    bumpMetadataCollectionHashes(sql, store.touchedEntityNames);
  });
  const identity = createRecordIdentity(instance);
  const fileStore = new WorkspaceFileStore(sql);
  for (const upload of contracts.fileUploads.filter(
    (file) => file.input.fileFolder === 'FilesField',
  )) {
    if (fileStore.find(upload.id)) continue;
    const file = fileStore.create(
      { ...upload.input, workspaceId: crypto.randomUUID() },
      identity,
    );
    sql.exec(
      'UPDATE "meta_file" SET "id" = ?, "status" = \'UPLOADED\' WHERE "id" = ?',
      upload.id,
      file.id,
    );
  }
  const snapshot = instance.getMetadataSnapshot();
  const pending: {
    table: string;
    id: string;
    column: string;
    value: string;
  }[] = [];
  const recordIds = new Set(
    contracts.records.map((record) => record.values.id),
  );
  for (const { objectName, values } of contracts.records) {
    const object = snapshot.objects.find(
      (object) => object.nameSingular === objectName,
    )!;
    const data: Record<string, JsonValue> = {};
    for (const field of object.fields) {
      const column = computeFieldColumn(field);
      if (!column || !(column.columnName in values)) continue;
      const value = values[column.columnName];
      if (column.references) {
        if (typeof value === 'string' && recordIds.has(value))
          pending.push({
            table: objectName,
            id: String(values.id),
            column: column.columnName,
            value,
          });
      } else
        data[column.columnName] = (
          typeof value === 'object' &&
          value !== null &&
          field.type !== 'RAW_JSON'
            ? JSON.parse(JSON.stringify(value), (name, entry: unknown) =>
                name === '__typename' ? undefined : entry,
              )
            : value
        ) as JsonValue;
    }
    if (objectName === 'workspaceMember') {
      data.userEmail = `${data.id}@fixture.example`;
      data.userId ??= crypto.randomUUID();
    }
    data.deletedAt = null;
    insertRecord(sql, objectName, data);
  }
  for (const update of pending)
    sql.exec(
      `UPDATE "rec_${update.table}" SET "${update.column}" = ? WHERE "id" = ?`,
      update.value,
      update.id,
    );
  return identity;
};
