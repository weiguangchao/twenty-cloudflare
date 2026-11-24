ALTER TABLE "oauthState" ADD COLUMN "returnToPath" TEXT;

CREATE TABLE "mcpOAuthClient" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "origin" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "redirectUris" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE TABLE "mcpOAuthGrant" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userWorkspaceId" TEXT NOT NULL REFERENCES "userWorkspace"("id") ON DELETE CASCADE,
  "clientId" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "clientOrigins" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "revokedAt" TEXT
);
CREATE INDEX "mcpOAuthGrant_membership" ON "mcpOAuthGrant"("userWorkspaceId");

CREATE TABLE "mcpOAuthRequest" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "clientId" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "clientOrigins" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "state" TEXT,
  "codeChallenge" TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "completedAt" TEXT,
  "grantId" TEXT REFERENCES "mcpOAuthGrant"("id") ON DELETE CASCADE,
  "codeHash" TEXT UNIQUE,
  "codeExpiresAt" TEXT,
  "consumedBy" TEXT
);
CREATE INDEX "mcpOAuthRequest_expiry" ON "mcpOAuthRequest"("expiresAt");

CREATE TABLE "mcpOAuthToken" (
  "tokenHash" TEXT PRIMARY KEY NOT NULL,
  "grantId" TEXT NOT NULL REFERENCES "mcpOAuthGrant"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL CHECK ("type" IN ('access', 'refresh')),
  "expiresAt" TEXT NOT NULL,
  "consumedBy" TEXT
);
CREATE INDEX "mcpOAuthToken_expiry" ON "mcpOAuthToken"("expiresAt");
CREATE INDEX "mcpOAuthToken_grant" ON "mcpOAuthToken"("grantId");
