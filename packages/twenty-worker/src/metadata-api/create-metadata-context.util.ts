import { authenticateRequest } from '@/auth/session.service';
import { type AuthContext } from '@/auth/types/auth-context.type';
import { CoreStore } from '@/core-db/core-store';

export const createMetadataContext = (
  env: Env,
  request: Request,
  responseHeaders: Headers,
) => {
  let authentication: Promise<AuthContext> | undefined;

  return {
    env,
    request,
    responseHeaders,
    store: new CoreStore(env.CORE_DB),
    requireAuth: () => (authentication ??= authenticateRequest(request, env)),
    workspace: (workspaceId: string) =>
      env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId)),
  };
};
