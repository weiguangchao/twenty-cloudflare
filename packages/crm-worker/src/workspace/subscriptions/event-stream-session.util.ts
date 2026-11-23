import { type StreamIdentity } from '@/workspace/subscriptions/event-stream.type';

export const isStreamSessionActive = async (
  database: D1Database,
  identity: StreamIdentity,
) =>
  Boolean(
    await database
      .prepare(
        'SELECT 1 FROM "userSession" AS "session" JOIN "userWorkspace" AS "member" ON "member"."id" = "session"."userWorkspaceId" JOIN "user" ON "user"."id" = "session"."userId" JOIN "workspace" ON "workspace"."id" = "member"."workspaceId" WHERE "session"."id" = ? AND "session"."userId" = ? AND "session"."revokedAt" IS NULL AND "session"."expiresAt" > ? AND "user"."disabled" = 0 AND "member"."id" = ? AND "member"."workspaceMemberId" = ? AND "member"."workspaceId" = ? AND "workspace"."activationStatus" = \'ACTIVE\'',
      )
      .bind(
        identity.sessionId,
        identity.userId,
        new Date().toISOString(),
        identity.userWorkspaceId,
        identity.workspaceMemberId,
        identity.workspaceId,
      )
      .first(),
  );
