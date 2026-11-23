export const initializeIntegrations = (sql: SqlStorage) => {
  sql.exec(
    'CREATE TABLE "sys_apiKey" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "roleId" TEXT NOT NULL REFERENCES "meta_role"("id") ON DELETE CASCADE, "tokenHash" TEXT, "expiresAt" TEXT NOT NULL, "revokedAt" TEXT, "createdAt" TEXT NOT NULL, "updatedAt" TEXT NOT NULL)',
  );
  sql.exec(
    'CREATE TABLE "sys_webhook" ("id" TEXT PRIMARY KEY, "targetUrl" TEXT NOT NULL, "operations" TEXT NOT NULL, "description" TEXT, "secret" TEXT NOT NULL, "roleId" TEXT NOT NULL REFERENCES "meta_role"("id") ON DELETE CASCADE, "applicationId" TEXT NOT NULL, "createdAt" TEXT NOT NULL, "updatedAt" TEXT NOT NULL, "deletedAt" TEXT)',
  );
  sql.exec(
    'CREATE TABLE "sys_webhookDelivery" ("id" TEXT PRIMARY KEY, "webhookId" TEXT NOT NULL REFERENCES "sys_webhook"("id") ON DELETE CASCADE, "event" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'pending\', "attempts" INTEGER NOT NULL DEFAULT 0, "availableAt" INTEGER NOT NULL, "queuedUntil" INTEGER NOT NULL DEFAULT 0, "leaseUntil" INTEGER, "createdAt" INTEGER NOT NULL)',
  );
  sql.exec(
    'CREATE INDEX "sys_webhookDelivery_due" ON "sys_webhookDelivery" ("status", "availableAt")',
  );
};
