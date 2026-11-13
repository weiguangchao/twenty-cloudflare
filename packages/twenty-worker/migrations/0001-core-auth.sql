CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL COLLATE NOCASE UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "firstName" TEXT NOT NULL DEFAULT '',
  "lastName" TEXT NOT NULL DEFAULT '',
  "locale" TEXT NOT NULL DEFAULT 'en',
  "isEmailVerified" INTEGER NOT NULL DEFAULT 1,
  "disabled" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE TABLE "workspace" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "displayName" TEXT NOT NULL,
  "origin" TEXT NOT NULL UNIQUE,
  "singleWorkspaceKey" TEXT UNIQUE,
  "subdomain" TEXT NOT NULL DEFAULT 'app',
  "logo" TEXT,
  "inviteHash" TEXT NOT NULL UNIQUE,
  "isPublicInviteLinkEnabled" INTEGER NOT NULL DEFAULT 0,
  "creatorUserId" TEXT NOT NULL REFERENCES "user"("id"),
  "activationStatus" TEXT NOT NULL DEFAULT 'PENDING_CREATION',
  "defaultRoleId" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE TABLE "userWorkspace" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "workspaceId" TEXT NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "workspaceMemberId" TEXT NOT NULL UNIQUE,
  "profilePending" INTEGER NOT NULL DEFAULT 1,
  "inviteTeamPending" INTEGER NOT NULL DEFAULT 0,
  "previousOnboardingStatus" TEXT,
  "createdAt" TEXT NOT NULL,
  UNIQUE ("userId", "workspaceId")
);
CREATE INDEX "userWorkspace_workspaceId" ON "userWorkspace"("workspaceId");

CREATE TABLE "userSession" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "userWorkspaceId" TEXT REFERENCES "userWorkspace"("id") ON DELETE CASCADE,
  "authProvider" TEXT NOT NULL DEFAULT 'password',
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "country" TEXT,
  "region" TEXT,
  "city" TEXT,
  "createdAt" TEXT NOT NULL,
  "lastActiveAt" TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "revokedAt" TEXT
);
CREATE INDEX "userSession_userId" ON "userSession"("userId");
CREATE INDEX "userSession_expiresAt" ON "userSession"("expiresAt");

CREATE TABLE "appToken" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "userSessionId" TEXT REFERENCES "userSession"("id") ON DELETE CASCADE,
  "expiresAt" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);
CREATE INDEX "appToken_expiresAt" ON "appToken"("expiresAt");

CREATE TABLE "usedLoginToken" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "expiresAt" TEXT NOT NULL
);
CREATE INDEX "usedLoginToken_expiresAt" ON "usedLoginToken"("expiresAt");
