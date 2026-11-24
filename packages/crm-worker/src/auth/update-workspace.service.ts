import { isPlainObject } from 'crm-shared/utils';

import { currentUser } from '@/auth/current-user.service';
import { randomToken } from '@/auth/token.service';
import { requireWorkspace } from '@/auth/workspace-lifecycle.service';
import { updateWorkspacePicture } from '@/files/update-workspace-picture.util';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';

export const updateWorkspace = async (
  context: MetadataContext,
  data: unknown,
) => {
  const { auth, workspace, membership } = await requireWorkspace(context);
  const metadata = await context.requireMetadata();
  if (!isPlainObject(data)) throw apiError('Invalid workspace settings');
  const values: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(data)) {
    const flag = ['inviteHash', 'isPublicInviteLinkEnabled'].includes(key)
      ? 'WORKSPACE_MEMBERS'
      : key === 'defaultRoleId'
        ? 'ROLES'
        : 'WORKSPACE';
    if (!metadata.permissions.permissionFlags.includes(flag))
      throw apiError('Permission denied', 'FORBIDDEN', 'PERMISSION_DENIED');
    switch (key) {
      case 'logo':
        if (value !== null && typeof value !== 'string')
          throw apiError('Invalid workspace logo');
        break;
      case 'displayName':
        if (typeof value !== 'string' || !value.trim() || value.length > 255)
          throw apiError('Invalid workspace name');
        values.displayName = value.trim();
        break;
      case 'inviteHash':
        if (
          value !== null &&
          (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,256}$/.test(value))
        )
          throw apiError('Invalid invitation hash');
        values.inviteHash = value ?? randomToken();
        break;
      case 'isPublicInviteLinkEnabled':
        if (typeof value !== 'boolean')
          throw apiError('Invalid public invitation setting');
        values[key] = Number(value);
        break;
      case 'defaultRoleId': {
        const role = metadata.tables.role.find((role) => role.id === value);
        if (!role?.canBeAssignedToUsers) throw apiError('Invalid default role');
        values[key] = role.id;
        break;
      }
      case 'trashRetentionDays':
        if (
          typeof value !== 'number' ||
          !Number.isInteger(value) ||
          value < 0 ||
          value > 3650
        )
          throw apiError('Invalid trash retention days');
        values[key] = value;
        break;
      default:
        throw apiError(
          `Workspace setting ${key} is not implemented`,
          'NOT_IMPLEMENTED',
        );
    }
  }
  const response = JSON.parse(
    await context
      .workspace(workspace.id)
      .updateWorkspaceSettings(workspace.id, values, {
        userId: auth.userId,
        userWorkspaceId: membership.id,
        workspaceMemberId: membership.workspaceMemberId,
      }),
  ) as { error?: { message: string; code: string } };
  if (response.error)
    throw apiError(response.error.message, response.error.code);
  if ('logo' in data) await updateWorkspacePicture(context, data.logo, 'logo');
  context.invalidateMetadata();
  return (await currentUser(context)).currentWorkspace;
};
