import { describe, expect, it } from 'vitest';

import { METADATA_TABLE_DEFINITIONS } from '@/workspace/metadata/constants/metadata-table-definitions.constant';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import standardMetadataSeed from '@/workspace/seed/standard-metadata.json';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import { selectRows } from '../utils/select-rows.util';

type SeedRow = Record<string, unknown>;

const seedTables = standardMetadataSeed.tables as unknown as Record<
  string,
  SeedRow[]
>;

const byId = (rows: SeedRow[]) =>
  [...rows].sort((left, right) =>
    String(left.id).localeCompare(String(right.id)),
  );

// Expected column type per field type, written out independently of the
// implementation (CLOUDFLARE_MIGRATION.md 5.2).
const EXPECTED_SQL_TYPE: Record<string, string> = {
  UUID: 'TEXT',
  TEXT: 'TEXT',
  NUMBER: 'REAL',
  NUMERIC: 'REAL',
  POSITION: 'REAL',
  BOOLEAN: 'INTEGER',
  DATE_TIME: 'TEXT',
  DATE: 'TEXT',
  SELECT: 'TEXT',
  RATING: 'TEXT',
  MULTI_SELECT: 'TEXT',
  ARRAY: 'TEXT',
  RAW_JSON: 'TEXT',
  FILES: 'TEXT',
  ADDRESS: 'TEXT',
  CURRENCY: 'TEXT',
  FULL_NAME: 'TEXT',
  LINKS: 'TEXT',
  EMAILS: 'TEXT',
  PHONES: 'TEXT',
  ACTOR: 'TEXT',
  RICH_TEXT: 'TEXT',
};

const expectedColumnsForObject = (objectId: string) => {
  const objects = seedTables.objectMetadata;
  const columns: { name: string; type: string; target?: string }[] = [];

  for (const field of seedTables.fieldMetadata.filter(
    (candidate) => candidate.objectMetadataId === objectId,
  )) {
    const settings = field.settings as Record<string, string> | null;

    if (field.type === 'RELATION' || field.type === 'MORPH_RELATION') {
      if (
        settings?.relationType === 'MANY_TO_ONE' &&
        field.relationTargetObjectMetadataId !== null
      ) {
        const target = objects.find(
          (object) => object.id === field.relationTargetObjectMetadataId,
        );

        columns.push({
          name: settings.joinColumnName,
          type: 'TEXT',
          target: `rec_${target?.nameSingular}`,
        });
      }
      continue;
    }
    if (field.type === 'TS_VECTOR') continue;

    columns.push({
      name: field.name as string,
      type: EXPECTED_SQL_TYPE[field.type as string],
    });
  }

  return columns.sort((left, right) => left.name.localeCompare(right.name));
};

describe('standard metadata seed', () => {
  it('stores every seeded metadata row unchanged', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      const store = new MetadataStore(sql);

      for (const { entityName } of METADATA_TABLE_DEFINITIONS) {
        expect(byId(store.findMany(entityName) as SeedRow[])).toEqual(
          byId(
            entityName === 'featureFlag'
              ? (store.findMany('featureFlag') as SeedRow[])
              : (seedTables[entityName] ?? []),
          ),
        );
      }

      expect(
        store
          .findMany('featureFlag')
          .map(({ key, value }) => ({ key, value }))
          .sort((left, right) => left.key.localeCompare(right.key)),
      ).toEqual(
        [...standardMetadataSeed.featureFlags].sort((left, right) =>
          left.key.localeCompare(right.key),
        ),
      );
    });
  });

  it('creates one record table per object with the 5.2 column mapping', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      const recordTableNames = selectRows(
        sql,
        `SELECT "name" FROM sqlite_master WHERE "type" = 'table' AND "name" LIKE 'rec\\_%' ESCAPE '\\' ORDER BY "name"`,
      ).map((row) => row.name);

      expect(recordTableNames).toEqual(
        seedTables.objectMetadata
          .map((object) => `rec_${object.nameSingular}`)
          .sort(),
      );

      for (const object of seedTables.objectMetadata) {
        const tableName = `rec_${object.nameSingular}`;
        const foreignKeys = new Map(
          selectRows(
            sql,
            'SELECT "from", "table" FROM pragma_foreign_key_list(?)',
            tableName,
          ).map((row) => [row.from, row.table]),
        );
        const actualColumns = selectRows(
          sql,
          'SELECT "name", "type", "pk" FROM pragma_table_info(?)',
          tableName,
        )
          .map((row) => ({
            name: row.name as string,
            type: row.type as string,
            ...(foreignKeys.has(row.name)
              ? { target: foreignKeys.get(row.name) as string }
              : {}),
          }))
          .sort((left, right) => left.name.localeCompare(right.name));

        expect(actualColumns, tableName).toEqual(
          expectedColumnsForObject(object.id as string),
        );
      }
    });
  });

  it('creates a physical index for every index except the TS_VECTOR ones', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      const tsVectorFieldIds = new Set(
        seedTables.fieldMetadata
          .filter((field) => field.type === 'TS_VECTOR')
          .map((field) => field.id),
      );
      const searchIndexIds = new Set(
        seedTables.indexFieldMetadata
          .filter((indexField) =>
            tsVectorFieldIds.has(indexField.fieldMetadataId),
          )
          .map((indexField) => indexField.indexMetadataId),
      );
      const physicalIndexNames = selectRows(
        sql,
        `SELECT "name" FROM sqlite_master WHERE "type" = 'index' AND "tbl_name" LIKE 'rec\\_%' ESCAPE '\\' AND "name" NOT LIKE 'sqlite_autoindex%'`,
      ).map((row) => row.name);

      expect(physicalIndexNames.sort()).toEqual(
        seedTables.indexMetadata
          .filter((index) => !searchIndexIds.has(index.id))
          .map((index) => index.name)
          .sort(),
      );
    });
  });

  it('enforces the unique index on person.emails through the primary email', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      sql.exec(
        `INSERT INTO "rec_person" ("id", "emails") VALUES ('a', '{"primaryEmail":"x@y.z","additionalEmails":[]}')`,
      );

      expect(() =>
        sql.exec(
          `INSERT INTO "rec_person" ("id", "emails") VALUES ('b', '{"primaryEmail":"x@y.z","additionalEmails":["other@y.z"]}')`,
        ),
      ).toThrow(/UNIQUE constraint failed/);
    });
  });
});
