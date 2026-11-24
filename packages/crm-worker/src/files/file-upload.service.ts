import { signToken } from '@/auth/token.service';
import { FILE_UPLOAD_TOKEN_SECONDS } from '@/files/file.constants';
import { fileRpc } from '@/files/file-rpc.util';
import { signedFileUrl } from '@/files/file-url.util';
import { receiveFileStream } from '@/files/receive-file-stream.util';
import { validateFileContent } from '@/files/validate-file-content.util';
import { type WorkspaceFile } from '@/files/types/workspace-file.type';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';

const uploadScope = async (context: MetadataContext, workspaceId?: unknown) => {
  const auth = await context.requireAuth();
  const targetId =
    typeof workspaceId === 'string' ? workspaceId : auth.workspaceId;
  const workspace = targetId
    ? await context.store.workspaceById(targetId)
    : undefined;
  const membership = targetId
    ? await context.store.membership(auth.userId, targetId)
    : undefined;
  if (
    !workspace ||
    !membership ||
    ((auth.workspaceId !== targetId ||
      workspace.activationStatus !== 'ACTIVE') &&
      (workspaceId === undefined || workspace.creatorUserId !== auth.userId))
  )
    throw apiError('Workspace access denied', 'FORBIDDEN');
  return {
    workspace,
    onboarding: workspace.activationStatus !== 'ACTIVE',
    stub: context.workspace(workspace.id),
    identity: {
      userId: auth.userId,
      userWorkspaceId: membership.id,
      workspaceMemberId: membership.workspaceMemberId,
    },
  };
};

export const createFileUpload = async (
  context: MetadataContext,
  input: Record<string, unknown>,
) => {
  const scope = await uploadScope(context, input.workspaceId);
  const file = await fileRpc<WorkspaceFile>(
    scope.stub,
    'create',
    { ...input, workspaceId: scope.workspace.id, onboarding: scope.onboarding },
    scope.identity,
  );
  const token = await signToken(
    context.env.APP_SECRET,
    'file-upload',
    {
      sub: scope.workspace.id,
      workspaceId: scope.workspace.id,
      fileId: file.id,
    },
    FILE_UPLOAD_TOKEN_SECONDS,
  );
  return {
    fileId: file.id,
    uploadUrl: `${new URL(context.request.url).origin}/file-upload/${file.id}?token=${token.token}`,
    contentType: 'application/octet-stream',
    expiresAt: token.expiresAt,
  };
};

export const completeFileUpload = async (
  context: MetadataContext,
  input: Record<string, unknown>,
  purpose = 'file',
) => {
  const scope = await uploadScope(context, input.workspaceId);
  let file = await fileRpc<WorkspaceFile>(
    scope.stub,
    'claimCompletion',
    { id: input.fileId, purpose, onboarding: scope.onboarding },
    scope.identity,
  );
  if (file.status !== 'UPLOADED') {
    try {
      const completed = await validateFileContent(context.env.FILES, file);
      file = await fileRpc<WorkspaceFile>(scope.stub, 'finishCompletion', {
        id: file.id,
        leaseId: file.leaseId,
        ...completed,
      });
    } catch (error) {
      await fileRpc(scope.stub, 'finishCompletion', {
        id: file.id,
        leaseId: file.leaseId,
        failed: true,
      }).catch(() => undefined);
      throw error;
    }
  }
  if (purpose !== 'file')
    await fileRpc(
      scope.stub,
      'picture',
      {
        id: file.id,
        purpose,
        origin: new URL(context.request.url).origin,
        onboarding: scope.onboarding,
      },
      scope.identity,
    );
  return {
    id: file.id,
    path: file.path,
    size: file.size,
    createdAt: file.createdAt,
    url: signedFileUrl(
      {
        workspaceId: scope.workspace.id,
        secret: context.env.APP_SECRET,
        origin: new URL(context.request.url).origin,
      },
      file.id,
      file.folder,
    ),
  };
};

export const uploadLegacyFile = async (
  context: MetadataContext,
  input: Record<string, unknown>,
  purpose: 'file' | 'avatar' | 'logo',
) => {
  if (!(input.file instanceof File))
    throw apiError('A multipart file is required');
  const target = await createFileUpload(context, {
    ...input,
    fileFolder: purpose === 'file' ? 'FilesField' : 'CorePicture',
    filename: input.file.name,
    size: input.file.size,
  });
  const scope = await uploadScope(context, input.workspaceId);
  const file = await fileRpc<WorkspaceFile>(scope.stub, 'claimUpload', {
    id: target.fileId,
  });
  try {
    await receiveFileStream(
      new Request(target.uploadUrl, { method: 'PUT', body: input.file }),
      context.env.FILES,
      file,
    );
    await fileRpc(scope.stub, 'finishUpload', {
      id: file.id,
      leaseId: file.leaseId,
    });
  } catch (error) {
    await fileRpc(scope.stub, 'finishUpload', {
      id: file.id,
      leaseId: file.leaseId,
      failed: true,
    }).catch(() => undefined);
    throw error;
  }
  return completeFileUpload(context, { ...input, fileId: file.id }, purpose);
};
