import { createSession } from '@/auth/session.service';
import { signToken, verifyToken } from '@/auth/token.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError, unauthenticated } from '@/shared/errors/api-error.util';

export const createLoginToken = (
  context: MetadataContext,
  userId: string,
  workspaceId: string,
  authProvider = 'password',
) =>
  signToken(
    context.env.APP_SECRET,
    'login',
    { sub: userId, workspaceId, authProvider },
    15 * 60,
  );

export const exchangeLoginToken = async (
  context: MetadataContext,
  token: string,
  origin: string,
) => {
  const claims = await verifyToken(context.env.APP_SECRET, 'login', token);
  if (!claims.workspaceId) throw unauthenticated();

  const workspace = await context.store.workspaceById(claims.workspaceId);
  const membership = await context.store.membership(
    claims.sub,
    claims.workspaceId,
  );
  const user = await context.store.userById(claims.sub);
  if (!workspace || !membership || !user || user.disabled)
    throw unauthenticated();
  if (
    origin !== workspace.origin ||
    origin !== new URL(context.request.url).origin
  ) {
    throw apiError('Workspace not found', 'NOT_FOUND', 'WORKSPACE_NOT_FOUND');
  }

  const consumed = await context.env.CORE_DB.prepare(
    'INSERT OR IGNORE INTO "usedLoginToken" ("id", "expiresAt") VALUES (?, ?)',
  )
    .bind(claims.jti, new Date(claims.exp * 1000).toISOString())
    .run();
  if (consumed.meta.changes !== 1)
    throw unauthenticated('Login token has already been used');

  return {
    tokens: await createSession(
      context.env,
      context.request,
      context.responseHeaders,
      user.id,
      membership.id,
      workspace.id,
      claims.authProvider,
    ),
  };
};
