import { describe, expect, it } from 'vitest';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import { selectRows } from '../utils/select-rows.util';

const placeholders = (count: number) =>
  Array.from({ length: count }, (_, index) => `? AS "c${index}"`).join(', ');

const selectStringLiteralStatement = (length: number) => {
  const head = "SELECT '";
  const tail = "'";

  return `${head}${'x'.repeat(length - head.length - tail.length)}${tail}`;
};

describe('Durable Object SQLite limits', () => {
  it('accepts 100 bound parameters and rejects 101', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      expect(() =>
        sql.exec(`SELECT ${placeholders(100)}`, ...Array(100).fill(1)),
      ).not.toThrow();
      expect(() =>
        sql.exec(`SELECT ${placeholders(101)}`, ...Array(101).fill(1)),
      ).toThrow(/too many SQL variables/);
    });
  });

  it('filters by 5000 ids passed as one json_each parameter', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      const ids = Array.from({ length: 5000 }, (_, index) => `id-${index}`);

      sql.exec('CREATE TABLE "item" ("id" TEXT PRIMARY KEY NOT NULL)');
      sql.exec(
        'INSERT INTO "item" ("id") SELECT "value" FROM json_each(?)',
        JSON.stringify(ids),
      );

      expect(
        selectRows(
          sql,
          'SELECT count(*) AS "count" FROM "item" WHERE "id" IN (SELECT "value" FROM json_each(?))',
          JSON.stringify(ids),
        ),
      ).toEqual([{ count: 5000 }]);
    });
  });

  it('limits statements to 100000 bytes', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      expect(() =>
        sql.exec(selectStringLiteralStatement(100_000)),
      ).not.toThrow();
      expect(() => sql.exec(selectStringLiteralStatement(100_001))).toThrow(
        /statement too long/,
      );
    });
  });

  it('limits LIKE and GLOB patterns to 50 bytes', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      const pattern50 = `%${'a'.repeat(48)}%`;
      const pattern51 = `%${'a'.repeat(49)}%`;

      expect(() =>
        sql.exec(`SELECT 'abc' LIKE ?`, pattern50).toArray(),
      ).not.toThrow();
      expect(() =>
        sql.exec(`SELECT 'abc' LIKE ?`, pattern51).toArray(),
      ).toThrow(/LIKE or GLOB pattern too complex/);
      expect(() =>
        sql.exec(`SELECT 'abc' GLOB ?`, `*${'a'.repeat(49)}*`).toArray(),
      ).toThrow(/LIKE or GLOB pattern too complex/);
      expect(
        selectRows(
          sql,
          'SELECT instr(lower(?), lower(?)) AS "position"',
          `xx${'A'.repeat(200)}`,
          'a'.repeat(200),
        ),
      ).toEqual([{ position: 3 }]);
    });
  });

  it('allows 100 columns per table', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      sql.exec('CREATE TABLE "wide" ("c1" TEXT)');
      for (let index = 2; index <= 100; index++) {
        sql.exec(`ALTER TABLE "wide" ADD COLUMN "c${index}" TEXT`);
      }

      expect(() =>
        sql.exec('ALTER TABLE "wide" ADD COLUMN "c101" TEXT'),
      ).toThrow(/too many columns/);
    });
  });

  it('limits a whole row, not each value, to about 8 MiB', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      const mebibyte = 1024 * 1024;

      sql.exec(
        'CREATE TABLE "document" ("id" INTEGER PRIMARY KEY, "a" TEXT, "b" TEXT)',
      );

      expect(() =>
        sql.exec(
          'INSERT INTO "document" ("id", "a") VALUES (1, ?)',
          'x'.repeat(2 * mebibyte + 1),
        ),
      ).not.toThrow();
      expect(() =>
        sql.exec(
          'INSERT INTO "document" ("id", "a") VALUES (2, ?)',
          'x'.repeat(8 * mebibyte),
        ),
      ).not.toThrow();
      expect(() =>
        sql.exec(
          'INSERT INTO "document" ("id", "a") VALUES (3, ?)',
          'x'.repeat(9 * mebibyte),
        ),
      ).toThrow(/string or blob too big/);
      expect(() =>
        sql.exec(
          'INSERT INTO "document" ("id", "a", "b") VALUES (4, ?, ?)',
          'x'.repeat(5 * mebibyte),
          'y'.repeat(5 * mebibyte),
        ),
      ).toThrow(/string or blob too big/);
    });
  });

  it('rejects BEGIN, SAVEPOINT and REGEXP', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      expect(() => sql.exec('BEGIN')).toThrow(/transactionSync/);
      expect(() => sql.exec('SAVEPOINT "s1"')).toThrow(/transactionSync/);
      expect(() => sql.exec(`SELECT 'abc' REGEXP 'b'`).toArray()).toThrow(
        /no such function: REGEXP/,
      );
    });
  });
});
