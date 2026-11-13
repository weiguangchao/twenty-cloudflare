import { describe, expect, it } from 'vitest';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import { selectRows } from '../utils/select-rows.util';

const columnNames = (sql: SqlStorage, table: string) =>
  selectRows(sql, `SELECT "name" FROM pragma_table_info(?)`, table).map(
    (row) => row.name,
  );

describe('schema changes in Durable Object SQLite', () => {
  it('rolls back DDL when a transactionSync callback throws', async () => {
    await runInNewWorkspace(({ storage }) => {
      const { sql } = storage;

      sql.exec('CREATE TABLE "probe_person" ("id" TEXT PRIMARY KEY NOT NULL)');

      expect(() =>
        storage.transactionSync(() => {
          sql.exec('CREATE TABLE "probe_project" ("id" TEXT)');
          sql.exec('ALTER TABLE "probe_person" ADD COLUMN "nickname" TEXT');
          throw new Error('validation failed');
        }),
      ).toThrow('validation failed');

      expect(
        selectRows(
          sql,
          `SELECT "name" FROM sqlite_master WHERE "name" = 'probe_project'`,
        ),
      ).toEqual([]);
      expect(columnNames(sql, 'probe_person')).toEqual(['id']);
    });
  });

  it('renames a column and carries its index along', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      sql.exec(
        'CREATE TABLE "probe_person" ("id" TEXT PRIMARY KEY NOT NULL, "city" TEXT)',
      );
      sql.exec(
        'CREATE INDEX "idx_probe_person_city" ON "probe_person" ("city")',
      );
      sql.exec(`INSERT INTO "probe_person" VALUES ('1', 'Paris')`);

      sql.exec('ALTER TABLE "probe_person" RENAME COLUMN "city" TO "town"');

      expect(selectRows(sql, 'SELECT * FROM "probe_person"')).toEqual([
        { id: '1', town: 'Paris' },
      ]);
      expect(
        selectRows(
          sql,
          `SELECT "sql" FROM sqlite_master WHERE "name" = 'idx_probe_person_city'`,
        ),
      ).toEqual([
        {
          sql: 'CREATE INDEX "idx_probe_person_city" ON "probe_person" ("town")',
        },
      ]);
    });
  });

  it('refuses to drop an indexed column until the index is dropped', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      sql.exec(
        'CREATE TABLE "probe_person" ("id" TEXT PRIMARY KEY NOT NULL, "city" TEXT)',
      );
      sql.exec(
        'CREATE INDEX "idx_probe_person_city" ON "probe_person" ("city")',
      );

      expect(() =>
        sql.exec('ALTER TABLE "probe_person" DROP COLUMN "city"'),
      ).toThrow(/error in index idx_probe_person_city after drop column/);

      sql.exec('DROP INDEX "idx_probe_person_city"');
      sql.exec('ALTER TABLE "probe_person" DROP COLUMN "city"');

      expect(columnNames(sql, 'probe_person')).toEqual(['id']);
    });
  });
});
