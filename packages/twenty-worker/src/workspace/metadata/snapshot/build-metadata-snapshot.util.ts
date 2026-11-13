import { type MetadataCollectionHash } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import {
  type IndexFieldMetadataRow,
  type IndexMetadataRow,
  type MetadataRow,
  type ObjectMetadataRow,
} from '@/workspace/metadata/types/metadata-row.type';

export type IndexMetadataSnapshot = IndexMetadataRow & {
  indexFields: IndexFieldMetadataRow[];
};

export type ObjectMetadataSnapshot = ObjectMetadataRow & {
  fields: FieldMetadataRow[];
  indexes: IndexMetadataSnapshot[];
  searchFields: MetadataRow<'searchFieldMetadata'>[];
};

export type MetadataSnapshot = {
  version: string;
  objects: ObjectMetadataSnapshot[];
};

// Collections the snapshot is built from; any change to them is a new version.
const SNAPSHOT_COLLECTION_NAMES = [
  'objectMetadata',
  'fieldMetadata',
  'index',
  'searchFieldMetadata',
];

export const computeMetadataSnapshotVersion = (
  collectionHashes: MetadataCollectionHash[],
) =>
  collectionHashes
    .filter(({ collectionName }) =>
      SNAPSHOT_COLLECTION_NAMES.includes(collectionName),
    )
    .map(({ hash }) => hash)
    .join(':');

const groupBy = <TItem>(items: TItem[], key: (item: TItem) => string) => {
  const groups = new Map<string, TItem[]>();

  for (const item of items) {
    const group = groups.get(key(item)) ?? [];

    group.push(item);
    groups.set(key(item), group);
  }

  return groups;
};

export const buildMetadataSnapshot = (
  store: MetadataStore,
  version: string,
): MetadataSnapshot => {
  const fieldsByObjectId = groupBy(
    store.findMany('fieldMetadata') as FieldMetadataRow[],
    (field) => field.objectMetadataId,
  );
  const indexFieldsByIndexId = groupBy(
    store.findMany('indexFieldMetadata'),
    (indexField) => indexField.indexMetadataId,
  );
  const indexesByObjectId = groupBy(
    store.findMany('indexMetadata'),
    (index) => index.objectMetadataId,
  );
  const searchFieldsByObjectId = groupBy(
    store.findMany('searchFieldMetadata'),
    (searchField) => searchField.objectMetadataId,
  );

  return {
    version,
    objects: store.findMany('objectMetadata').map((object) => ({
      ...object,
      fields: fieldsByObjectId.get(object.id) ?? [],
      indexes: (indexesByObjectId.get(object.id) ?? []).map((index) => ({
        ...index,
        indexFields: (indexFieldsByIndexId.get(index.id) ?? []).sort(
          (left, right) => left.order - right.order,
        ),
      })),
      searchFields: (searchFieldsByObjectId.get(object.id) ?? []).sort(
        (left, right) => left.position - right.position,
      ),
    })),
  };
};
