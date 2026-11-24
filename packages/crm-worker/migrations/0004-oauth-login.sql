CREATE TABLE "oauthState" (
  "stateHash" TEXT PRIMARY KEY NOT NULL,
  "provider" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "verifier" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "invitationToken" TEXT,
  "inviteHash" TEXT,
  "linkUserId" TEXT REFERENCES "user"("id") ON DELETE CASCADE,
  "expiresAt" TEXT NOT NULL
);
CREATE INDEX "oauthState_expiresAt" ON "oauthState" ("expiresAt");

CREATE TABLE "oauthIdentity" (
  "provider" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  PRIMARY KEY ("provider", "issuer", "subject")
);
