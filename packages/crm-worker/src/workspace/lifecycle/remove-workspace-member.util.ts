import { apiError } from '@/shared/errors/api-error.util';
import { enqueueOutbox } from '@/workspace/events/enqueue-outbox.util';
import { type OutboxItem } from '@/workspace/events/process-outbox.util';
import { getWorkspaceMember } from '@/workspace/lifecycle/workspace-members.util';
import { metadataWritePermissions } from '@/workspace/metadata/operations/execute-metadata-mutation.util';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { requireAnotherAdministrator } from '@/workspace/permissions/role-mutations.util';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';
import { isPlainObject } from 'crm-shared/utils';

export const removeWorkspaceMember = (
  context: MetadataOperationContext,
  identity: RecordQueryIdentity,
  target: RecordQueryIdentity,
  workspaceId: string,
) => {
  const permissions = metadataWritePermissions(context, identity);
  const self = identity.userWorkspaceId === target.userWorkspaceId;
  if (!self && !permissions.permissionFlags.includes('WORKSPACE_MEMBERS'))
    throw apiError('Permission denied', 'FORBIDDEN', 'PERMISSION_DENIED');
  const member = getWorkspaceMember(context.sql, target);
  if (!member || member.userId !== target.userId)
    throw apiError('Workspace member not found', 'NOT_FOUND');
  const remaining = context.sql
    .exec<{
      count: number;
    }>(
      'SELECT COUNT(*) AS "count" FROM "rec_workspaceMember" WHERE "deletedAt" IS NULL AND "id" != ?',
      target.workspaceMemberId,
    )
    .one().count;
  if (remaining > 0)
    requireAnotherAdministrator(context, target.userWorkspaceId);
  const now = new Date().toISOString();
  context.sql.exec(
    'UPDATE "rec_workspaceMember" SET "deletedAt" = ?, "updatedAt" = ?, "avatarUrl" = NULL, "userEmail" = ? WHERE "id" = ?',
    now,
    now,
    `${target.workspaceMemberId}@deleted.invalid`,
    target.workspaceMemberId,
  );
  context.store.delete(
    'roleTarget',
    context.store
      .findMany('roleTarget', { userWorkspaceId: target.userWorkspaceId })
      .map((roleTarget) => roleTarget.id),
  );
  context.store.delete(
    'navigationMenuItem',
    context.store
      .findMany('navigationMenuItem', {
        userWorkspaceId: target.userWorkspaceId,
      })
      .map((item) => item.id),
  );
  enqueueOutbox(context.sql, 'member-cleanup', { ...target, workspaceId });
  return true;
};

export const processMemberCleanup = async (
  database: D1Database,
  item: OutboxItem,
) => {
  const payload = item.payload;
  if (
    !isPlainObject(payload) ||
    typeof payload.userId !== 'string' ||
    typeof payload.userWorkspaceId !== 'string' ||
    typeof payload.workspaceId !== 'string'
  )
    throw new Error('Invalid member cleanup job');
  const now = new Date().toISOString();
  await database.batch([
    database
      .prepare(
        'UPDATE "userSession" SET "revokedAt" = ? WHERE "userWorkspaceId" = ?',
      )
      .bind(now, payload.userWorkspaceId),
    database
      .prepare(
        'DELETE FROM "userWorkspace" WHERE "id" = ? AND "userId" = ? AND "workspaceId" = ?',
      )
      .bind(payload.userWorkspaceId, payload.userId, payload.workspaceId),
    database
      .prepare(
        'UPDATE "user" SET "disabled" = 1, "deletedAt" = ?, "updatedAt" = ?, "email" = ?, "passwordHash" = \'\', "firstName" = \'\', "lastName" = \'\' WHERE "id" = ? AND NOT EXISTS (SELECT 1 FROM "userWorkspace" WHERE "userId" = ?)',
      )
      .bind(
        now,
        now,
        `${payload.userId}@deleted.invalid`,
        payload.userId,
        payload.userId,
      ),
    database
      .prepare(
        'UPDATE "userSession" SET "revokedAt" = ? WHERE "userId" = ? AND EXISTS (SELECT 1 FROM "user" WHERE "id" = ? AND "disabled" = 1)',
      )
      .bind(now, payload.userId, payload.userId),
    database
      .prepare(
        'DELETE FROM "workspace" WHERE "id" = ? AND NOT EXISTS (SELECT 1 FROM "userWorkspace" WHERE "workspaceId" = ?)',
      )
      .bind(payload.workspaceId, payload.workspaceId),
  ]);
};
