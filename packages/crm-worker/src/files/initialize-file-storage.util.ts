export const initializeFileStorage = (sql: SqlStorage) => {
  for (const [name, type] of Object.entries({
    workspaceId: 'TEXT',
    createdByUserWorkspaceId: 'TEXT',
    fieldMetadataId: 'TEXT',
    applicationUniversalIdentifier: 'TEXT',
    folder: 'TEXT',
    filename: 'TEXT',
    storageKey: 'TEXT',
    declaredSize: 'INTEGER',
    leaseId: 'TEXT',
    leaseUntil: 'INTEGER',
    expiresAt: 'INTEGER',
  }))
    sql.exec(`ALTER TABLE "meta_file" ADD COLUMN "${name}" ${type}`);
  sql.exec(
    'CREATE UNIQUE INDEX "meta_file_storage_key" ON "meta_file" ("storageKey")',
  );
  sql.exec(
    'CREATE INDEX "meta_file_expiration" ON "meta_file" ("status", "expiresAt")',
  );
  sql.exec(
    'INSERT INTO "sys_scheduledTask" ("name", "nextRunAt", "payload") VALUES (?, ?, ?)',
    'file-cleanup',
    Date.now() + 3_600_000,
    '{}',
  );
};
