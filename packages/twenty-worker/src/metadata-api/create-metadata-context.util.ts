import { authenticateRequest } from '@/auth/session.service';
import { type AuthContext } from '@/auth/types/auth-context.type';
import { CoreStore } from '@/core-db/core-store';
import { loadWorkspaceMetadata } from '@/metadata-api/load-workspace-metadata.util';

export const createMetadataContext = (
  env: Env,
  request: Request,
  responseHeaders: Headers,
) => {
  let authentication: Promise<AuthContext> | undefined;
  let metadata: ReturnType<typeof loadWorkspaceMetadata> | undefined;
  const store = new CoreStore(env.CORE_DB);
  const requireAuth = () =>
    (authentication ??= authenticateRequest(request, env));

  return {
    env,
    request,
    responseHeaders,
    store,
    requireAuth,
    requireMetadata: () =>
      (metadata ??= loadWorkspaceMetadata(env, store, requireAuth())),
    workspace: (workspaceId: string) =>
      env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId)),
  };
};
