import { createRecordIndex } from '@/workspace/metadata/ddl/record-index-ddl.util';
import { createRecordTable } from '@/workspace/metadata/ddl/record-table-ddl.util';
import { METADATA_TABLE_DEFINITIONS } from '@/workspace/metadata/constants/metadata-table-definitions.constant';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import {
  type MetadataEntityName,
  type MetadataRow,
} from '@/workspace/metadata/types/metadata-row.type';
import { type MetadataColumnDefinition } from '@/workspace/metadata/types/metadata-table-definition.type';
import { type StandardMetadataSeed } from '@/workspace/metadata/types/standard-metadata-seed.type';

const ENTITY_NAMES_IN_INSERT_ORDER = METADATA_TABLE_DEFINITIONS.map(
  (definition) => definition.entityName,
);

// Columns pointing at their own table or at a table inserted later are
// filled in a second pass so foreign keys hold on every statement.
const DEFERRED_COLUMN_NAMES_BY_ENTITY_NAME = new Map(
  METADATA_TABLE_DEFINITIONS.map((definition, position) => [
    definition.entityName,
    (definition.columns as readonly MetadataColumnDefinition[])
      .filter(
        (column) =>
          column.references !== undefined &&
          ENTITY_NAMES_IN_INSERT_ORDER.indexOf(
            column.references.entityName as MetadataEntityName,
          ) >= position,
      )
      .map((column) => column.name),
  ]),
);

export const loadStandardMetadata = (
  sql: SqlStorage,
  seed: StandardMetadataSeed,
) => {
  const store = new MetadataStore(sql);
  const now = new Date().toISOString();

  for (const entityName of ENTITY_NAMES_IN_INSERT_ORDER) {
    const deferredColumnNames =
      DEFERRED_COLUMN_NAMES_BY_ENTITY_NAME.get(entityName) ?? [];

    for (const row of seed.tables[entityName] ?? []) {
      store.insert(entityName, {
        ...row,
        ...Object.fromEntries(deferredColumnNames.map((name) => [name, null])),
      } as MetadataRow<typeof entityName>);
    }
  }

  for (const entityName of ENTITY_NAMES_IN_INSERT_ORDER) {
    const deferredColumnNames =
      DEFERRED_COLUMN_NAMES_BY_ENTITY_NAME.get(entityName) ?? [];

    if (deferredColumnNames.length === 0) continue;

    for (const row of seed.tables[entityName] ?? []) {
      store.update(
        entityName,
        row.id as string,
        Object.fromEntries(
          deferredColumnNames.map((name) => [name, row[name] ?? null]),
        ),
      );
    }
  }

  for (const featureFlag of seed.featureFlags) {
    store.insert('featureFlag', {
      id: crypto.randomUUID(),
      key: featureFlag.key,
      value: featureFlag.value,
      createdAt: now,
      updatedAt: now,
    });
  }

  const objects = store.findMany('objectMetadata');
  const fields = store.findMany('fieldMetadata') as FieldMetadataRow[];
  const objectNameById = new Map(
    objects.map((object) => [object.id, object.nameSingular]),
  );
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const resolveObjectNameSingular = (objectMetadataId: string) =>
    objectNameById.get(objectMetadataId) as string;

  for (const object of objects) {
    createRecordTable(
      sql,
      object.nameSingular,
      fields.filter((field) => field.objectMetadataId === object.id),
      resolveObjectNameSingular,
    );
  }

  const indexFields = store.findMany('indexFieldMetadata');

  for (const index of store.findMany('indexMetadata')) {
    createRecordIndex(
      sql,
      resolveObjectNameSingular(index.objectMetadataId),
      index,
      indexFields.filter(
        (indexField) => indexField.indexMetadataId === index.id,
      ),
      (fieldMetadataId) => fieldById.get(fieldMetadataId) as FieldMetadataRow,
    );
  }
};
