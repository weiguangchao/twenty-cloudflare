import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { runWorkspaceMigrations } from '@/workspace/migrations/run-workspace-migrations.util';
import { type WorkspaceMigration } from '@/workspace/migrations/types/workspace-migration.type';
import { WORKSPACE_MIGRATIONS } from '@/workspace/migrations/workspace-migrations.constant';

import { runInNewWorkspace } from './utils/run-in-new-workspace.util';
import { selectRows } from './utils/select-rows.util';

const createTableMigration = (
  name: string,
  table: string,
): WorkspaceMigration => ({
  name,
  up: (sql) =>
    sql.exec(`CREATE TABLE "${table}" ("id" TEXT PRIMARY KEY NOT NULL)`),
});

const PRODUCTION_MIGRATION_NAMES = WORKSPACE_MIGRATIONS.map(
  (migration) => migration.name,
);

const appliedMigrationNames = (sql: SqlStorage) =>
  selectRows(sql, 'SELECT "name" FROM "sys_migration" ORDER BY "name"').map(
    (row) => row.name,
  );

const appliedTestMigrationNames = (sql: SqlStorage) =>
  appliedMigrationNames(sql).filter(
    (name) => !PRODUCTION_MIGRATION_NAMES.includes(name as string),
  );

describe('WorkspaceDurableObject', () => {
  it('answers ping over RPC', async () => {
    const stub = env.WORKSPACE.get(env.WORKSPACE.idFromName('workspace-a'));

    expect(await stub.ping()).toBe('pong');
  });

  it('applies every workspace migration on first start', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      expect(appliedMigrationNames(sql)).toEqual(PRODUCTION_MIGRATION_NAMES);
    });
  });
});

describe('runWorkspaceMigrations', () => {
  it('applies pending migrations once, in order', async () => {
    await runInNewWorkspace(({ storage }) => {
      const firstRun = runWorkspaceMigrations(storage, [
        createTableMigration('9001-first', 'sys_first'),
      ]);
      const secondRun = runWorkspaceMigrations(storage, [
        createTableMigration('9001-first', 'sys_first'),
        createTableMigration('9002-second', 'sys_second'),
      ]);

      expect(firstRun).toEqual(['9001-first']);
      expect(secondRun).toEqual(['9002-second']);
      expect(appliedTestMigrationNames(storage.sql)).toEqual([
        '9001-first',
        '9002-second',
      ]);
    });
  });

  it('rolls back a failing migration and leaves it pending', async () => {
    await runInNewWorkspace(({ storage }) => {
      const failingMigration: WorkspaceMigration = {
        name: '9001-failing',
        up: (sql) => {
          sql.exec('CREATE TABLE "sys_partial" ("id" TEXT)');
          throw new Error('migration failed');
        },
      };

      expect(() => runWorkspaceMigrations(storage, [failingMigration])).toThrow(
        'migration failed',
      );
      expect(appliedTestMigrationNames(storage.sql)).toEqual([]);
      expect(
        selectRows(
          storage.sql,
          `SELECT "name" FROM sqlite_master WHERE "name" = 'sys_partial'`,
        ),
      ).toEqual([]);
    });
  });

  it('rejects migrations listed out of name order', async () => {
    await runInNewWorkspace(({ storage }) => {
      expect(() =>
        runWorkspaceMigrations(storage, [
          createTableMigration('9002-second', 'sys_second'),
          createTableMigration('9001-first', 'sys_first'),
        ]),
      ).toThrow(/unique, ascending names/);
    });
  });
});
