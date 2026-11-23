import { METADATA_COLLECTION_NAMES } from '@/workspace/metadata/constants/metadata-collection-names.constant';

export type MetadataCollectionHash = {
  collectionName: string;
  hash: string;
};

const COLLECTION_NAMES_BY_ENTITY_NAME: Record<string, string[]> = {
  fieldMetadata: ['fieldMetadata', 'fieldMetadataOption'],
  indexMetadata: ['index'],
  indexFieldMetadata: ['index'],
};

const collectionNamesForEntity = (entityName: string): string[] =>
  COLLECTION_NAMES_BY_ENTITY_NAME[entityName] ??
  ((METADATA_COLLECTION_NAMES as readonly string[]).includes(entityName)
    ? [entityName]
    : []);

export const createMetadataCollectionHashTable = (sql: SqlStorage) => {
  sql.exec(
    'CREATE TABLE "sys_metadataCollectionHash" ("collectionName" TEXT PRIMARY KEY NOT NULL, "hash" TEXT NOT NULL)',
  );
  for (const collectionName of METADATA_COLLECTION_NAMES) {
    sql.exec(
      'INSERT INTO "sys_metadataCollectionHash" ("collectionName", "hash") VALUES (?, ?)',
      collectionName,
      crypto.randomUUID(),
    );
  }
};

export const bumpMetadataCollectionHashes = (
  sql: SqlStorage,
  touchedEntityNames: Iterable<string>,
) => {
  const collectionNames = new Set(
    [...touchedEntityNames].flatMap(collectionNamesForEntity),
  );

  for (const collectionName of collectionNames) {
    sql.exec(
      'UPDATE "sys_metadataCollectionHash" SET "hash" = ? WHERE "collectionName" = ?',
      crypto.randomUUID(),
      collectionName,
    );
  }
};

export const getMetadataCollectionHashes = (
  sql: SqlStorage,
): MetadataCollectionHash[] => {
  const hashByCollectionName = new Map(
    sql
      .exec<MetadataCollectionHash>(
        'SELECT "collectionName", "hash" FROM "sys_metadataCollectionHash"',
      )
      .toArray()
      .map((row) => [row.collectionName, row.hash]),
  );

  return METADATA_COLLECTION_NAMES.map((collectionName) => ({
    collectionName,
    hash: hashByCollectionName.get(collectionName) as string,
  }));
};
