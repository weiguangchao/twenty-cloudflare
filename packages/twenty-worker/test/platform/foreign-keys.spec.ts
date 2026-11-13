import { describe, expect, it } from 'vitest';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import { selectRows } from '../utils/select-rows.util';

describe('foreign keys in Durable Object SQLite', () => {
  it('are enforced by default', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      expect(selectRows(sql, 'PRAGMA foreign_keys')).toEqual([
        { foreign_keys: 1 },
      ]);
    });
  });

  it('apply ON DELETE CASCADE and SET NULL on columns added with ALTER TABLE', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      sql.exec('CREATE TABLE "parent" ("id" TEXT PRIMARY KEY NOT NULL)');
      sql.exec('CREATE TABLE "child" ("id" TEXT PRIMARY KEY NOT NULL)');
      sql.exec(
        'ALTER TABLE "child" ADD COLUMN "cascadeParentId" TEXT REFERENCES "parent"("id") ON DELETE CASCADE',
      );
      sql.exec(
        'ALTER TABLE "child" ADD COLUMN "nullableParentId" TEXT REFERENCES "parent"("id") ON DELETE SET NULL',
      );
      sql.exec(`INSERT INTO "parent" VALUES ('p1'), ('p2')`);
      sql.exec(
        `INSERT INTO "child" VALUES ('c1', 'p1', NULL), ('c2', NULL, 'p2')`,
      );

      expect(() =>
        sql.exec(`INSERT INTO "child" VALUES ('c3', 'missing', NULL)`),
      ).toThrow(/FOREIGN KEY constraint failed/);

      sql.exec(`DELETE FROM "parent"`);

      expect(selectRows(sql, 'SELECT * FROM "child"')).toEqual([
        { id: 'c2', cascadeParentId: null, nullableParentId: null },
      ]);
    });
  });

  it('do not block dropping a referencing column', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      sql.exec('CREATE TABLE "parent" ("id" TEXT PRIMARY KEY NOT NULL)');
      sql.exec(
        'CREATE TABLE "child" ("id" TEXT PRIMARY KEY NOT NULL, "parentId" TEXT REFERENCES "parent"("id"))',
      );

      sql.exec('ALTER TABLE "child" DROP COLUMN "parentId"');

      expect(
        selectRows(sql, `SELECT "name" FROM pragma_table_info('child')`),
      ).toEqual([{ name: 'id' }]);
    });
  });
});
