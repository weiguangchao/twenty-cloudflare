import { type WorkspaceMigration } from '@/workspace/migrations/types/workspace-migration.type';

type MigrationRow = { name: string };

export const runWorkspaceMigrations = (
  storage: DurableObjectStorage,
  migrations: WorkspaceMigration[],
): string[] => {
  const migrationNames = migrations.map((migration) => migration.name);
  const sortedMigrationNames = [...migrationNames].sort();

  if (
    migrationNames.some(
      (name, index) => name !== sortedMigrationNames[index],
    ) ||
    new Set(migrationNames).size !== migrationNames.length
  ) {
    throw new Error(
      `Workspace migrations must have unique, ascending names: ${migrationNames.join(', ')}`,
    );
  }

  storage.sql.exec(
    'CREATE TABLE IF NOT EXISTS "sys_migration" ("name" TEXT PRIMARY KEY NOT NULL, "appliedAt" TEXT NOT NULL)',
  );

  const appliedMigrationNames = new Set(
    storage.sql
      .exec<MigrationRow>('SELECT "name" FROM "sys_migration"')
      .toArray()
      .map((row) => row.name),
  );
  const newlyAppliedMigrationNames: string[] = [];

  for (const migration of migrations) {
    if (appliedMigrationNames.has(migration.name)) {
      continue;
    }

    storage.transactionSync(() => {
      migration.up(storage.sql);
      storage.sql.exec(
        'INSERT INTO "sys_migration" ("name", "appliedAt") VALUES (?, ?)',
        migration.name,
        new Date().toISOString(),
      );
    });
    newlyAppliedMigrationNames.push(migration.name);
  }

  return newlyAppliedMigrationNames;
};
