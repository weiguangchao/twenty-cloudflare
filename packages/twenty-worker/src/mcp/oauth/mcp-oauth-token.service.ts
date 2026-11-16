import { hashToken, randomToken } from '@/auth/token.service';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';
import { unauthenticated, apiError } from '@/shared/errors/api-error.util';
import {
  McpOAuthError,
  MCP_OAUTH_SCOPE,
  mcpResource,
} from '@/mcp/oauth/mcp-oauth-client.util';

const ACCESS_TOKEN_LIFETIME_SECONDS = 30 * 60;
const REFRESH_TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

export type McpOAuthGrant = RecordQueryIdentity & {
  id: string;
  workspaceId: string;
  origin: string;
  clientId: string;
  clientOrigins: string;
  resource: string;
};

export const loadMcpGrant = async (env: Env, grantId: string) => {
  const grant = await env.CORE_DB.prepare(
    'SELECT "grant"."id", "grant"."clientId", "grant"."clientOrigins", "grant"."resource", "membership"."id" AS "userWorkspaceId", "membership"."userId", "membership"."workspaceId", "membership"."workspaceMemberId", "workspace"."origin" FROM "mcpOAuthGrant" AS "grant" JOIN "userWorkspace" AS "membership" ON "membership"."id" = "grant"."userWorkspaceId" JOIN "user" ON "user"."id" = "membership"."userId" JOIN "workspace" ON "workspace"."id" = "membership"."workspaceId" WHERE "grant"."id" = ? AND "grant"."revokedAt" IS NULL AND "user"."disabled" = 0 AND "user"."isEmailVerified" = 1 AND "workspace"."activationStatus" = \'ACTIVE\'',
  )
    .bind(grantId)
    .first<McpOAuthGrant>();
  if (!grant || grant.resource !== mcpResource(grant.origin))
    throw new McpOAuthError(
      'invalid_grant',
      'Authorization is no longer available',
    );
  return grant;
};

export const revokeMcpGrant = (env: Env, grantId: string) =>
  env.CORE_DB.prepare(
    'UPDATE "mcpOAuthGrant" SET "revokedAt" = ? WHERE "id" = ? AND "revokedAt" IS NULL',
  )
    .bind(new Date().toISOString(), grantId)
    .run();

export const authenticateMcpUserRequest = async (
  request: Request,
  env: Env,
): Promise<{ workspaceId: string; identity: RecordQueryIdentity }> => {
  const token = /^Bearer\s+(mcp_at_[A-Za-z0-9_-]{43})$/i.exec(
    request.headers.get('authorization') ?? '',
  )?.[1];
  if (!token) throw unauthenticated('An MCP access token is required');
  const saved = await env.CORE_DB.prepare(
    'SELECT "grantId" FROM "mcpOAuthToken" WHERE "tokenHash" = ? AND "type" = \'access\' AND "expiresAt" > ?',
  )
    .bind(await hashToken(token), new Date().toISOString())
    .first<{ grantId: string }>();
  if (!saved) throw unauthenticated('Invalid or expired MCP token');
  const grant = await loadMcpGrant(env, saved.grantId).catch(() => {
    throw unauthenticated('MCP authorization is no longer available');
  });
  const origin = new URL(request.url).origin;
  if (grant.resource !== mcpResource(origin))
    throw unauthenticated('MCP token is not valid for this resource');
  const requestOrigin = request.headers.get('origin');
  if (
    requestOrigin &&
    requestOrigin !== origin &&
    !(JSON.parse(grant.clientOrigins) as string[]).includes(requestOrigin)
  )
    throw apiError('Request origin is not allowed', 'FORBIDDEN');
  return {
    workspaceId: grant.workspaceId,
    identity: {
      userId: grant.userId,
      userWorkspaceId: grant.userWorkspaceId,
      workspaceMemberId: grant.workspaceMemberId,
    },
  };
};

export const exchangeMcpToken = async (
  env: Env,
  origin: string,
  parameters: URLSearchParams,
) => {
  const clientId = parameters.get('client_id');
  const resource = parameters.get('resource');
  const grantType = parameters.get('grant_type');
  if (!clientId || resource !== mcpResource(origin))
    throw new McpOAuthError(
      'invalid_target',
      'Client and MCP resource are required',
    );
  if (parameters.has('scope') && parameters.get('scope') !== MCP_OAUTH_SCOPE)
    throw new McpOAuthError('invalid_scope', 'Unsupported scope');
  const now = new Date().toISOString();
  const exchangeId = randomToken();
  let grantId: string;
  let consume: D1PreparedStatement;
  let guard: string;
  let guardBinding: string;
  if (grantType === 'authorization_code') {
    const verifier = parameters.get('code_verifier') ?? '';
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))
      throw new McpOAuthError('invalid_grant', 'Invalid PKCE verifier');
    const codeHash = await hashToken(parameters.get('code') ?? '');
    const saved = await env.CORE_DB.prepare(
      'SELECT "grantId", "clientId", "resource", "redirectUri", "codeChallenge", "consumedBy" FROM "mcpOAuthRequest" WHERE "codeHash" = ? AND "codeExpiresAt" > ?',
    )
      .bind(codeHash, now)
      .first<{
        grantId: string;
        clientId: string;
        resource: string;
        redirectUri: string;
        codeChallenge: string;
        consumedBy: string | null;
      }>();
    if (
      !saved ||
      saved.clientId !== clientId ||
      saved.resource !== resource ||
      saved.redirectUri !== parameters.get('redirect_uri') ||
      saved.codeChallenge !== (await hashToken(verifier))
    )
      throw new McpOAuthError('invalid_grant', 'Invalid authorization code');
    grantId = saved.grantId;
    if (saved.consumedBy) {
      await revokeMcpGrant(env, grantId);
      throw new McpOAuthError(
        'invalid_grant',
        'Authorization code was already used',
      );
    }
    consume = env.CORE_DB.prepare(
      'UPDATE "mcpOAuthRequest" SET "consumedBy" = ? WHERE "codeHash" = ? AND "consumedBy" IS NULL AND "codeExpiresAt" > ?',
    ).bind(exchangeId, codeHash, now);
    guard =
      'SELECT 1 FROM "mcpOAuthRequest" WHERE "codeHash" = ? AND "consumedBy" = ?';
    guardBinding = codeHash;
  } else if (grantType === 'refresh_token') {
    const tokenHash = await hashToken(parameters.get('refresh_token') ?? '');
    const saved = await env.CORE_DB.prepare(
      'SELECT "grantId", "consumedBy" FROM "mcpOAuthToken" WHERE "tokenHash" = ? AND "type" = \'refresh\' AND "expiresAt" > ?',
    )
      .bind(tokenHash, now)
      .first<{ grantId: string; consumedBy: string | null }>();
    if (!saved)
      throw new McpOAuthError('invalid_grant', 'Invalid refresh token');
    grantId = saved.grantId;
    const grant = await loadMcpGrant(env, grantId);
    if (grant.clientId !== clientId || grant.resource !== resource)
      throw new McpOAuthError(
        'invalid_grant',
        'Refresh token belongs to another client',
      );
    if (saved.consumedBy) {
      await revokeMcpGrant(env, grantId);
      throw new McpOAuthError(
        'invalid_grant',
        'Refresh token was already used',
      );
    }
    consume = env.CORE_DB.prepare(
      'UPDATE "mcpOAuthToken" SET "consumedBy" = ? WHERE "tokenHash" = ? AND "consumedBy" IS NULL AND "expiresAt" > ?',
    ).bind(exchangeId, tokenHash, now);
    guard =
      'SELECT 1 FROM "mcpOAuthToken" WHERE "tokenHash" = ? AND "consumedBy" = ?';
    guardBinding = tokenHash;
  } else {
    throw new McpOAuthError('unsupported_grant_type', 'Unsupported grant type');
  }
  const grant = await loadMcpGrant(env, grantId);
  if (grant.clientId !== clientId || grant.resource !== resource)
    throw new McpOAuthError(
      'invalid_grant',
      'Authorization belongs to another resource',
    );
  const accessToken = `mcp_at_${randomToken()}`;
  const refreshToken = `mcp_rt_${randomToken()}`;
  const issue = async (token: string, type: string, lifetime: number) =>
    env.CORE_DB.prepare(
      `INSERT INTO "mcpOAuthToken" ("tokenHash", "grantId", "type", "expiresAt") SELECT ?, ?, ?, ? WHERE EXISTS (${guard})`,
    ).bind(
      await hashToken(token),
      grantId,
      type,
      new Date(Date.now() + lifetime * 1000).toISOString(),
      guardBinding,
      exchangeId,
    );
  const results = await env.CORE_DB.batch([
    consume,
    await issue(accessToken, 'access', ACCESS_TOKEN_LIFETIME_SECONDS),
    await issue(refreshToken, 'refresh', REFRESH_TOKEN_LIFETIME_SECONDS),
  ]);
  if (results[0].meta.changes !== 1) {
    await revokeMcpGrant(env, grantId);
    throw new McpOAuthError('invalid_grant', 'Credential was already used');
  }
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
    refresh_token: refreshToken,
    scope: MCP_OAUTH_SCOPE,
  };
};
