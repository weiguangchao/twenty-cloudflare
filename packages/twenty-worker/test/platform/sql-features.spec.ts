import { describe, expect, it } from 'vitest';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import { selectRows } from '../utils/select-rows.util';

describe('Durable Object SQLite features', () => {
  it('enforces a partial unique index on a JSON sub-field', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      sql.exec(
        'CREATE TABLE "probe_person" ("id" TEXT PRIMARY KEY NOT NULL, "emails" TEXT, "deletedAt" TEXT)',
      );
      sql.exec(
        `CREATE UNIQUE INDEX "idx_probe_person_primary_email" ON "probe_person" ("emails" ->> '$.primaryEmail') WHERE "deletedAt" IS NULL`,
      );
      sql.exec(
        `INSERT INTO "probe_person" VALUES ('a', '{"primaryEmail":"x@y.z"}', NULL)`,
      );

      expect(() =>
        sql.exec(
          `INSERT INTO "probe_person" VALUES ('b', '{"primaryEmail":"x@y.z"}', NULL)`,
        ),
      ).toThrow(/UNIQUE constraint failed/);
      expect(() =>
        sql.exec(
          `INSERT INTO "probe_person" VALUES ('c', '{"primaryEmail":"x@y.z"}', '2026-01-01T00:00:00.000Z')`,
        ),
      ).not.toThrow();
    });
  });

  it('supports RETURNING and ON CONFLICT DO UPDATE', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      sql.exec(
        'CREATE TABLE "counter" ("key" TEXT PRIMARY KEY NOT NULL, "value" INTEGER)',
      );

      expect(
        selectRows(sql, `INSERT INTO "counter" VALUES ('a', 1) RETURNING *`),
      ).toEqual([{ key: 'a', value: 1 }]);
      expect(
        selectRows(
          sql,
          `INSERT INTO "counter" VALUES ('a', 2) ON CONFLICT ("key") DO UPDATE SET "value" = "value" + excluded."value" RETURNING *`,
        ),
      ).toEqual([{ key: 'a', value: 3 }]);
    });
  });

  it('supports window functions', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      sql.exec(
        'CREATE TABLE "note" ("id" TEXT PRIMARY KEY NOT NULL, "parentId" TEXT)',
      );
      sql.exec(
        `INSERT INTO "note" VALUES ('a', 'p1'), ('b', 'p1'), ('c', 'p2')`,
      );

      expect(
        selectRows(
          sql,
          'SELECT "id", ROW_NUMBER() OVER (PARTITION BY "parentId" ORDER BY "id") AS "rowNumber" FROM "note" ORDER BY "id"',
        ),
      ).toEqual([
        { id: 'a', rowNumber: 1 },
        { id: 'b', rowNumber: 2 },
        { id: 'c', rowNumber: 1 },
      ]);
    });
  });

  it('supports the -> and ->> JSON operators', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      expect(
        selectRows(
          sql,
          `SELECT '{"a":{"b":[1,2]}}' ->> '$.a.b[1]' AS "text", '{"a":1}' -> '$.a' AS "json"`,
        ),
      ).toEqual([{ text: 2, json: '1' }]);
    });
  });

  it('only folds ASCII letters in lower()', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      expect(selectRows(sql, `SELECT lower('ÉCOLE Ä') AS "value"`)).toEqual([
        { value: 'École Ä' },
      ]);
    });
  });
});
