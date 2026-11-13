import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import standardMetadata from '@/workspace/seed/standard-metadata.json';

export const initializeWorkspaceSettings = (sql: SqlStorage) => {
  sql.exec(
    'CREATE TABLE "sys_workspaceSettings" ("id" INTEGER PRIMARY KEY CHECK ("id" = 1), "defaultRoleId" TEXT NOT NULL REFERENCES "meta_role"("id"), "trashRetentionDays" INTEGER NOT NULL DEFAULT 30, "coreSettings" TEXT NOT NULL DEFAULT \'{}\')',
  );
  const defaultRole = new MetadataStore(sql).findMany('role', {
    universalIdentifier: standardMetadata.defaultRoleUniversalIdentifier,
  })[0];
  sql.exec(
    'INSERT INTO "sys_workspaceSettings" ("id", "defaultRoleId") VALUES (1, ?)',
    defaultRole.id,
  );
};
