import {
  buildMetadataSnapshot,
  type ObjectMetadataSnapshot,
} from '@/workspace/metadata/snapshot/build-metadata-snapshot.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { quoteIdentifier } from '@/workspace/record-api/sql/record-sql.util';
import {
  searchColumn,
  searchFields,
  searchFieldText,
} from '@/workspace/search/search-field-text.util';

type SearchIndex = {
  objectMetadataId: string;
  nameSingular: string;
  signature: string;
};

export const searchTable = (object: { nameSingular: string }) =>
  quoteIdentifier(`fts_${object.nameSingular}`);

const triggerNames = (object: { nameSingular: string }) =>
  ['insert', 'update', 'delete'].map(
    (action) => `fts_${object.nameSingular}_${action}`,
  );

const dropTriggers = (sql: SqlStorage, object: { nameSingular: string }) => {
  for (const name of triggerNames(object))
    sql.exec(`DROP TRIGGER IF EXISTS ${quoteIdentifier(name)}`);
};

// DDL may remove columns referenced by triggers; the surrounding transaction restores them on failure.
export const suspendSearchIndexes = (sql: SqlStorage) => {
  for (const index of sql.exec<SearchIndex>('SELECT * FROM "sys_searchIndex"'))
    dropTriggers(sql, index);
};

const installTriggers = (sql: SqlStorage, object: ObjectMetadataSnapshot) => {
  const fields = searchFields(object);
  const table = searchTable(object);
  const recordTable = quoteIdentifier(`rec_${object.nameSingular}`);
  const columns = ['"rowid"', '"recordId"', ...fields.map(searchColumn)];
  const values = [
    'new."rowid"',
    'new."id"',
    ...fields.map((field) => searchFieldText(field, 'new')),
  ];
  const insert = `INSERT INTO ${table} (${columns.join(', ')}) SELECT ${values.join(', ')} WHERE new."deletedAt" IS NULL;`;
  const remove = `DELETE FROM ${table} WHERE "rowid" = old."rowid";`;
  const [insertName, updateName, deleteName] =
    triggerNames(object).map(quoteIdentifier);
  sql.exec(
    `CREATE TRIGGER IF NOT EXISTS ${insertName} AFTER INSERT ON ${recordTable} BEGIN ${insert} END`,
  );
  sql.exec(
    `CREATE TRIGGER IF NOT EXISTS ${updateName} AFTER UPDATE ON ${recordTable} BEGIN ${remove} ${insert} END`,
  );
  sql.exec(
    `CREATE TRIGGER IF NOT EXISTS ${deleteName} AFTER DELETE ON ${recordTable} BEGIN ${remove} END`,
  );
};

export const synchronizeSearchIndexes = (sql: SqlStorage) => {
  const snapshot = buildMetadataSnapshot(new MetadataStore(sql), '');
  const previous = sql
    .exec<SearchIndex>('SELECT * FROM "sys_searchIndex"')
    .toArray();
  for (const index of previous) {
    const object = snapshot.objects.find(
      (object) => object.id === index.objectMetadataId,
    );
    if (!object || object.nameSingular !== index.nameSingular) {
      dropTriggers(sql, index);
      sql.exec(`DROP TABLE IF EXISTS ${searchTable(index)}`);
      sql.exec(
        'DELETE FROM "sys_searchIndex" WHERE "objectMetadataId" = ?',
        index.objectMetadataId,
      );
    }
  }
  for (const object of snapshot.objects) {
    const fields = searchFields(object);
    const signature = JSON.stringify({
      label: object.labelIdentifierFieldMetadataId,
      fields: fields.map(({ id, name, type }) => ({ id, name, type })),
    });
    const existing = previous.find(
      (index) =>
        index.objectMetadataId === object.id &&
        index.nameSingular === object.nameSingular,
    );
    if (existing?.signature !== signature) {
      dropTriggers(sql, object);
      sql.exec(`DROP TABLE IF EXISTS ${searchTable(object)}`);
      sql.exec(
        `CREATE VIRTUAL TABLE ${searchTable(object)} USING fts5("recordId" UNINDEXED, ${fields.length ? fields.map(searchColumn).join(', ') : '"empty"'}, tokenize = 'trigram remove_diacritics 1')`,
      );
      sql.exec(
        `INSERT INTO ${searchTable(object)} ("rowid", "recordId"${fields.map((field) => `, ${searchColumn(field)}`).join('')}) SELECT "record"."rowid", "record"."id"${fields.map((field) => `, ${searchFieldText(field, 'record')}`).join('')} FROM ${quoteIdentifier(`rec_${object.nameSingular}`)} AS "record" WHERE "deletedAt" IS NULL`,
      );
      sql.exec(
        'INSERT INTO "sys_searchIndex" ("objectMetadataId", "nameSingular", "signature") VALUES (?, ?, ?) ON CONFLICT ("objectMetadataId") DO UPDATE SET "nameSingular" = excluded."nameSingular", "signature" = excluded."signature"',
        object.id,
        object.nameSingular,
        signature,
      );
    }
    installTriggers(sql, object);
  }
};

export const createSearchIndexes = (sql: SqlStorage) => {
  sql.exec(
    'CREATE TABLE "sys_searchIndex" ("objectMetadataId" TEXT PRIMARY KEY NOT NULL, "nameSingular" TEXT NOT NULL, "signature" TEXT NOT NULL)',
  );
  synchronizeSearchIndexes(sql);
};
