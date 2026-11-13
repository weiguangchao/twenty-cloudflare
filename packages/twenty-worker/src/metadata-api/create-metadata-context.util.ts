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
  let navigationIdentifiers:
    | Promise<
        Map<
          string,
          { id: string; labelIdentifier: string; imageIdentifier: string }
        >
      >
    | undefined;
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
    invalidateMetadata: () => {
      metadata = undefined;
      navigationIdentifiers = undefined;
    },
    requireNavigationIdentifiers: () =>
      (navigationIdentifiers ??= (async () => {
        const auth = await requireAuth();
        const data = await (metadata ??= loadWorkspaceMetadata(
          env,
          store,
          requireAuth(),
        ));
        const rows = await env.WORKSPACE.get(
          env.WORKSPACE.idFromName(data.workspace.id),
        ).getNavigationRecordIdentifiers({
          userId: auth.userId,
          userWorkspaceId: data.membership.id,
          workspaceMemberId: data.membership.workspaceMemberId,
        });
        return new Map(
          rows.map((row) => [row.navigationMenuItemId, row.identifier]),
        );
      })()),
    workspace: (workspaceId: string) =>
      env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId)),
  };
};
