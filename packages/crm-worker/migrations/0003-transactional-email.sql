ALTER TABLE "appToken" ADD COLUMN "payload" TEXT;

CREATE TABLE "emailDelivery" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "payload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" INTEGER NOT NULL,
  "leaseUntil" INTEGER,
  "expiresAt" INTEGER NOT NULL,
  "createdAt" TEXT NOT NULL
);
CREATE INDEX "emailDelivery_due" ON "emailDelivery" ("status", "availableAt");

CREATE TABLE "workspaceInvitation" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "workspaceId" TEXT NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL COLLATE NOCASE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "roleId" TEXT,
  "expiresAt" TEXT NOT NULL,
  "acceptedAt" TEXT,
  "createdByUserId" TEXT NOT NULL REFERENCES "user"("id"),
  UNIQUE ("workspaceId", "email")
);
