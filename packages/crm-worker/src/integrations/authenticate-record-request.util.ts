import { authenticateRequest } from '@/auth/session.service';
import { hashToken } from '@/auth/token.service';
import { apiError, unauthenticated } from '@/shared/errors/api-error.util';
import { CoreStore } from '@/core-db/core-store';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';

export const authenticateRecordRequest = async (
  request: Request,
  env: Env,
): Promise<{ workspaceId: string; identity: RecordQueryIdentity }> => {
  const bearer = /^Bearer\s+(\S+)$/i.exec(
    request.headers.get('authorization') ?? '',
  )?.[1];
  if (bearer?.startsWith('api_')) {
    const match =
      /^api_([0-9a-f-]{36})_([0-9a-f-]{36})_([A-Za-z0-9_-]{43})$/.exec(bearer);
    if (!match) throw unauthenticated('Invalid API key');
    const [, workspaceId, apiKeyId] = match;
    const workspace = await new CoreStore(env.CORE_DB).workspaceById(
      workspaceId,
    );
    if (
      !workspace ||
      workspace.activationStatus !== 'ACTIVE' ||
      workspace.origin !== new URL(request.url).origin
    )
      throw unauthenticated('Invalid API key');
    return {
      workspaceId,
      identity: {
        userId: apiKeyId,
        userWorkspaceId: apiKeyId,
        workspaceMemberId: apiKeyId,
        apiKeyId,
        apiKeyTokenHash: await hashToken(bearer),
      },
    };
  }
  const auth = await authenticateRequest(request, env);
  if (!auth.workspaceId || !auth.userWorkspaceId || !auth.workspaceMemberId)
    throw unauthenticated('A workspace session is required');
  const store = new CoreStore(env.CORE_DB);
  const workspace = await store.workspaceById(auth.workspaceId);
  if (!workspace || workspace.activationStatus !== 'ACTIVE')
    throw apiError('Workspace is not active', 'FORBIDDEN');
  if (!(await store.userById(auth.userId))?.isEmailVerified)
    throw apiError(
      'Verify your email address first',
      'FORBIDDEN',
      'EMAIL_NOT_VERIFIED',
    );
  return {
    workspaceId: workspace.id,
    identity: {
      userId: auth.userId,
      userWorkspaceId: auth.userWorkspaceId,
      workspaceMemberId: auth.workspaceMemberId,
    },
  };
};
