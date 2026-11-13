import { isPlainObject } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { enqueueOutbox } from '@/workspace/events/enqueue-outbox.util';
import { metadataWritePermissions } from '@/workspace/metadata/operations/execute-metadata-mutation.util';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';

export const updateWorkspaceSettings = (
  context: MetadataOperationContext,
  workspaceId: string,
  values: Record<string, string | number>,
  identity: RecordQueryIdentity,
) => {
  const permissions = metadataWritePermissions(context, identity);
  for (const key of Object.keys(values)) {
    const flag = ['inviteHash', 'isPublicInviteLinkEnabled'].includes(key)
      ? 'WORKSPACE_MEMBERS'
      : key === 'defaultRoleId'
        ? 'ROLES'
        : 'WORKSPACE';
    if (!permissions.permissionFlags.includes(flag))
      throw apiError('Permission denied', 'FORBIDDEN');
  }
  if (
    !Object.keys(values).length &&
    !permissions.permissionFlags.includes('WORKSPACE')
  )
    throw apiError('Permission denied', 'FORBIDDEN');
  const allowed = [
    'displayName',
    'inviteHash',
    'isPublicInviteLinkEnabled',
    'defaultRoleId',
    'trashRetentionDays',
  ];
  if (Object.keys(values).some((key) => !allowed.includes(key)))
    throw apiError('Invalid workspace settings');
  if (
    values.defaultRoleId !== undefined &&
    !context.store.findById('role', String(values.defaultRoleId))
      ?.canBeAssignedToUsers
  )
    throw apiError('Invalid default role');
  if (values.defaultRoleId !== undefined)
    context.sql.exec(
      'UPDATE "sys_workspaceSettings" SET "defaultRoleId" = ? WHERE "id" = 1',
      values.defaultRoleId,
    );
  if (values.trashRetentionDays !== undefined) {
    context.sql.exec(
      'UPDATE "sys_workspaceSettings" SET "trashRetentionDays" = ? WHERE "id" = 1',
      values.trashRetentionDays,
    );
    context.sql.exec(
      'UPDATE "sys_scheduledTask" SET "payload" = ?, "nextRunAt" = ? WHERE "name" = ?',
      JSON.stringify({ trashRetentionDays: values.trashRetentionDays }),
      Date.now() + 1000,
      'trash-cleanup',
    );
  }
  const previous = JSON.parse(
    context.sql
      .exec<{
        coreSettings: string;
      }>('SELECT "coreSettings" FROM "sys_workspaceSettings" WHERE "id" = 1')
      .one().coreSettings,
  ) as Record<string, unknown>;
  context.sql.exec(
    'UPDATE "sys_workspaceSettings" SET "coreSettings" = ? WHERE "id" = 1',
    JSON.stringify({ ...previous, ...values, workspaceId }),
  );
  return enqueueOutbox(context.sql, 'workspace-settings', {});
};

export const processWorkspaceSettings = async (
  sql: SqlStorage,
  database: D1Database,
) => {
  // Retrying an older job always applies the latest settings, so it cannot undo a newer edit.
  const values: unknown = JSON.parse(
    sql
      .exec<{
        coreSettings: string;
      }>('SELECT "coreSettings" FROM "sys_workspaceSettings" WHERE "id" = 1')
      .one().coreSettings,
  );
  if (!isPlainObject(values) || typeof values.workspaceId !== 'string')
    throw new Error('Invalid workspace settings job');
  const entries = Object.entries(values).filter(([key]) =>
    [
      'displayName',
      'inviteHash',
      'isPublicInviteLinkEnabled',
      'defaultRoleId',
      'trashRetentionDays',
    ].includes(key),
  );
  if (!entries.length) return;
  await database
    .prepare(
      `UPDATE "workspace" SET ${entries.map(([key]) => `"${key}" = ?`).join(', ')}, "updatedAt" = ? WHERE "id" = ?`,
    )
    .bind(
      ...entries.map(([, value]) => value),
      new Date().toISOString(),
      values.workspaceId,
    )
    .run();
};
