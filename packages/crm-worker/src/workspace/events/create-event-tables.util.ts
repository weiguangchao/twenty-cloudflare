export const createEventTables = (sql: SqlStorage) => {
  sql.exec(
    'CREATE TABLE "sys_outbox" ("id" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "payload" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'pending\', "attempts" INTEGER NOT NULL DEFAULT 0, "availableAt" INTEGER NOT NULL, "leaseUntil" INTEGER, "completedAt" INTEGER, "lastError" TEXT)',
  );
  sql.exec(
    'CREATE INDEX "sys_outbox_due" ON "sys_outbox" ("status", "availableAt")',
  );
  sql.exec(
    'CREATE TABLE "sys_scheduledTask" ("name" TEXT PRIMARY KEY, "nextRunAt" INTEGER NOT NULL, "payload" TEXT NOT NULL, "lastError" TEXT)',
  );
  sql.exec(
    'INSERT INTO "sys_scheduledTask" ("name", "nextRunAt", "payload") VALUES (?, ?, ?)',
    'trash-cleanup',
    Date.now() + 86_400_000,
    JSON.stringify({ trashRetentionDays: 30 }),
  );
};
