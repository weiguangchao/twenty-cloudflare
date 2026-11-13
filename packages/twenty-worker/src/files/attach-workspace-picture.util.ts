import { signedFileUrl } from '@/files/file-url.util';
import { WorkspaceFileStore } from '@/files/workspace-file-store';
import { type WorkspaceFile } from '@/files/types/workspace-file.type';
import { apiError } from '@/shared/errors/api-error.util';
import { enqueueOutbox } from '@/workspace/events/enqueue-outbox.util';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';

export const attachWorkspacePicture = async (
  storage: DurableObjectStorage,
  env: Env,
  fileId: string | null,
  purpose: string,
  origin: string,
  identity: RecordQueryIdentity,
  onboarding = false,
  workspaceId?: string,
): Promise<WorkspaceFile | null> => {
  const store = new WorkspaceFileStore(storage.sql);
  const file = fileId ? store.require(fileId) : null;
  const permissions = onboarding
    ? { permissionFlags: ['WORKSPACE'] }
    : store.permissions(identity);
  if (onboarding && purpose !== 'logo')
    throw apiError('Permission denied', 'FORBIDDEN');
  const flag = purpose === 'logo' ? 'WORKSPACE' : 'PROFILE_INFORMATION';
  if (
    !['logo', 'avatar'].includes(purpose) ||
    (file &&
      (file.folder !== 'core-picture' ||
        file.status !== 'UPLOADED' ||
        file.createdByUserWorkspaceId !== identity.userWorkspaceId)) ||
    !permissions.permissionFlags.includes(flag)
  )
    throw apiError('Permission denied', 'FORBIDDEN');
  const url = file
    ? signedFileUrl(
        { workspaceId: file.workspaceId, origin, secret: env.APP_SECRET },
        file.id,
        file.folder,
      )
    : null;
  let oldUrl: string | null | undefined;
  if (purpose === 'logo') {
    oldUrl = await env.CORE_DB.prepare(
      'SELECT "logo" FROM "workspace" WHERE "id" = ?',
    )
      .bind(file?.workspaceId ?? workspaceId)
      .first<string>('logo');
    await env.CORE_DB.prepare(
      'UPDATE "workspace" SET "logo" = ?, "updatedAt" = ? WHERE "id" = ?',
    )
      .bind(url, new Date().toISOString(), file?.workspaceId ?? workspaceId)
      .run();
  } else {
    storage.transactionSync(() => {
      oldUrl = storage.sql
        .exec<{ avatarUrl: string | null }>(
          'SELECT "avatarUrl" FROM "rec_workspaceMember" WHERE "id" = ?',
          identity.workspaceMemberId,
        )
        .one().avatarUrl;
      storage.sql.exec(
        'UPDATE "rec_workspaceMember" SET "avatarUrl" = ?, "updatedAt" = ? WHERE "id" = ?',
        url,
        new Date().toISOString(),
        identity.workspaceMemberId,
      );
    });
  }
  const previousId = oldUrl?.match(
    /\/file\/core-picture\/([0-9a-f-]{36})(?:\?|$)/,
  )?.[1];
  if (previousId && previousId !== file?.id)
    enqueueOutbox(storage.sql, 'file-cleanup', { fileIds: [previousId] });
  return file;
};
