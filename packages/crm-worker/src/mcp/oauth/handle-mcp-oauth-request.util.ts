import { GraphQLError } from 'graphql';
import { isPlainObject } from 'crm-shared/utils';

import { hashToken, randomToken } from '@/auth/token.service';
import { CoreStore } from '@/core-db/core-store';
import { authenticateRecordRequest } from '@/integrations/authenticate-record-request.util';
import { apiError } from '@/shared/errors/api-error.util';
import { logEvent } from '@/observability/log-event.util';
import {
  McpOAuthError,
  MCP_OAUTH_SCOPE,
  mcpResource,
  parseMcpClient,
  resolveMcpClient,
} from '@/mcp/oauth/mcp-oauth-client.util';
import { exchangeMcpToken } from '@/mcp/oauth/mcp-oauth-token.service';

type AuthorizationRequest = {
  id: string;
  clientId: string;
  clientName: string;
  clientOrigins: string;
  resource: string;
  redirectUri: string;
  state: string | null;
};

const readBody = async (request: Request) => {
  let size = 0;
  const body = request.body?.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > 16384)
          throw new McpOAuthError(
            'invalid_request',
            'Request is too large',
            413,
          );
        controller.enqueue(chunk);
      },
    }),
  );
  return new Response(body).text();
};

const uniqueParameters = (parameters: URLSearchParams) => {
  for (const key of parameters.keys())
    if (parameters.getAll(key).length !== 1)
      throw new McpOAuthError(
        'invalid_request',
        'Duplicate parameters are not supported',
      );
  return parameters;
};

const requireWorkspaceUser = async (request: Request, env: Env) => {
  const auth = await authenticateRecordRequest(request, env);
  const workspace = await new CoreStore(env.CORE_DB).workspaceById(
    auth.workspaceId,
  );
  if (
    auth.identity.apiKeyId ||
    workspace?.origin !== new URL(request.url).origin
  )
    throw apiError('A user session in this workspace is required', 'FORBIDDEN');
  return { ...auth, workspace: workspace! };
};

export const handleMcpOAuthRequest = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const origin = url.origin;
  const resource = mcpResource(origin);
  const management = url.pathname.startsWith('/oauth/mcp/');
  let authorizationRedirect: URL | undefined;
  const headers = new Headers({
    'cache-control': 'no-store',
    pragma: 'no-cache',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...(!management ? { 'access-control-allow-origin': '*' } : {}),
  });
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers });
  try {
    if (
      management &&
      request.headers.get('origin') &&
      request.headers.get('origin') !== origin
    )
      throw new McpOAuthError(
        'access_denied',
        'Request origin is not allowed',
        403,
      );
    if (request.method === 'OPTIONS' && !management) {
      headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
      headers.set(
        'access-control-allow-headers',
        'Content-Type, Authorization',
      );
      return new Response(null, { status: 204, headers });
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/.well-known/oauth-authorization-server'
    )
      return json({
        issuer: origin,
        authorization_endpoint: `${origin}/oauth/authorize`,
        token_endpoint: `${origin}/oauth/token`,
        registration_endpoint: `${origin}/oauth/register`,
        revocation_endpoint: `${origin}/oauth/revoke`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_methods_supported: ['none'],
        revocation_endpoint_auth_methods_supported: ['none'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: [MCP_OAUTH_SCOPE],
        client_id_metadata_document_supported: true,
        authorization_response_iss_parameter_supported: true,
      });
    if (
      request.method === 'GET' &&
      [
        '/.well-known/oauth-protected-resource',
        '/.well-known/oauth-protected-resource/mcp/v1',
      ].includes(url.pathname)
    )
      return json({
        resource,
        authorization_servers: [origin],
        scopes_supported: [MCP_OAUTH_SCOPE],
        bearer_methods_supported: ['header'],
      });

    if (!management) {
      const limited = await env.AUTH_RATE_LIMITER.limit({
        key: `mcp-oauth:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`,
      });
      if (!limited.success) {
        headers.set('retry-after', '60');
        throw new McpOAuthError(
          'temporarily_unavailable',
          'Too many authorization requests',
          429,
        );
      }
    }
    if (request.method === 'POST' && url.pathname === '/oauth/register') {
      if (
        request.headers
          .get('content-type')
          ?.split(';')[0]
          .trim()
          .toLowerCase() !== 'application/json'
      )
        throw new McpOAuthError(
          'invalid_request',
          'Content-Type must be application/json',
          415,
        );
      const metadata: unknown = JSON.parse(await readBody(request));
      const client = parseMcpClient(metadata);
      const clientId = `mcp_client_${randomToken()}`;
      await env.CORE_DB.prepare(
        'INSERT INTO "mcpOAuthClient" ("id", "origin", "name", "redirectUris", "createdAt") VALUES (?, ?, ?, ?, ?)',
      )
        .bind(
          clientId,
          origin,
          client.name,
          JSON.stringify(client.redirectUris),
          new Date().toISOString(),
        )
        .run();
      return json(
        {
          client_id: clientId,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_name: client.name,
          redirect_uris: client.redirectUris,
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
        },
        201,
      );
    }
    if (request.method === 'GET' && url.pathname === '/oauth/authorize') {
      const parameters = uniqueParameters(url.searchParams);
      const client = await resolveMcpClient(
        env,
        origin,
        parameters.get('client_id') ?? '',
      );
      const redirectUri = parameters.get('redirect_uri') ?? '';
      if (!client.redirectUris.includes(redirectUri))
        throw new McpOAuthError(
          'invalid_request',
          'Redirect URI is not registered',
        );
      authorizationRedirect = new URL(redirectUri);
      if (parameters.get('response_type') !== 'code')
        throw new McpOAuthError(
          'unsupported_response_type',
          'Authorization code is required',
        );
      if (parameters.get('resource') !== resource)
        throw new McpOAuthError('invalid_target', 'Invalid MCP resource');
      if ((parameters.get('scope') ?? MCP_OAUTH_SCOPE) !== MCP_OAUTH_SCOPE)
        throw new McpOAuthError('invalid_scope', 'Unsupported scope');
      if (
        parameters.get('code_challenge_method') !== 'S256' ||
        !/^[A-Za-z0-9_-]{43}$/.test(parameters.get('code_challenge') ?? '')
      )
        throw new McpOAuthError(
          'invalid_request',
          'PKCE with S256 is required',
        );
      if ((parameters.get('state')?.length ?? 0) > 2048)
        throw new McpOAuthError('invalid_request', 'State is too large');
      const clientOrigins = [
        ...new Set([
          ...client.redirectUris.map((redirect) => new URL(redirect).origin),
          ...(client.id.startsWith('https://')
            ? [new URL(client.id).origin]
            : []),
        ]),
      ];
      const requestId = randomToken();
      await env.CORE_DB.prepare(
        'INSERT INTO "mcpOAuthRequest" ("id", "clientId", "clientName", "clientOrigins", "resource", "redirectUri", "state", "codeChallenge", "expiresAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          requestId,
          client.id,
          client.name,
          JSON.stringify(clientOrigins),
          resource,
          redirectUri,
          parameters.get('state'),
          parameters.get('code_challenge'),
          new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        )
        .run();
      headers.set('location', `${origin}/authorize?request=${requestId}`);
      return new Response(null, { status: 302, headers });
    }
    if (
      request.method === 'POST' &&
      ['/oauth/token', '/oauth/revoke'].includes(url.pathname)
    ) {
      if (
        request.headers
          .get('content-type')
          ?.split(';')[0]
          .trim()
          .toLowerCase() !== 'application/x-www-form-urlencoded'
      )
        throw new McpOAuthError(
          'invalid_request',
          'Content-Type must be application/x-www-form-urlencoded',
          415,
        );
      const parameters = uniqueParameters(
        new URLSearchParams(await readBody(request)),
      );
      if (url.pathname === '/oauth/token')
        return json(await exchangeMcpToken(env, origin, parameters));
      await env.CORE_DB.prepare(
        'UPDATE "mcpOAuthGrant" SET "revokedAt" = ? WHERE "clientId" = ? AND "resource" = ? AND "id" IN (SELECT "grantId" FROM "mcpOAuthToken" WHERE "tokenHash" = ?)',
      )
        .bind(
          new Date().toISOString(),
          parameters.get('client_id') ?? '',
          resource,
          await hashToken(parameters.get('token') ?? ''),
        )
        .run();
      return json({});
    }
    if (management) {
      if (!['GET', 'POST', 'DELETE'].includes(request.method))
        throw new McpOAuthError(
          'invalid_request',
          'Method is not supported',
          405,
        );
      if (request.method !== 'GET' && request.headers.get('origin') !== origin)
        throw new McpOAuthError(
          'access_denied',
          'Request origin is not allowed',
          403,
        );
      const { identity, workspace } = await requireWorkspaceUser(request, env);
      if (
        url.pathname === '/oauth/mcp/connections' &&
        request.method === 'GET'
      ) {
        const connections = await env.CORE_DB.prepare(
          'SELECT "id", "clientId", "clientName", "createdAt" FROM "mcpOAuthGrant" WHERE "userWorkspaceId" = ? AND "revokedAt" IS NULL ORDER BY "createdAt" DESC',
        )
          .bind(identity.userWorkspaceId)
          .all();
        return json({ connections: connections.results });
      }
      const connectionId = /^\/oauth\/mcp\/connections\/([0-9a-f-]{36})$/.exec(
        url.pathname,
      )?.[1];
      if (connectionId && request.method === 'DELETE') {
        await env.CORE_DB.prepare(
          'UPDATE "mcpOAuthGrant" SET "revokedAt" = ? WHERE "id" = ? AND "userWorkspaceId" = ?',
        )
          .bind(
            new Date().toISOString(),
            connectionId,
            identity.userWorkspaceId,
          )
          .run();
        return json({ success: true });
      }
      const requestId = /^\/oauth\/mcp\/requests\/([A-Za-z0-9_-]{43})$/.exec(
        url.pathname,
      )?.[1];
      if (requestId && ['GET', 'POST'].includes(request.method)) {
        const saved = await env.CORE_DB.prepare(
          'SELECT * FROM "mcpOAuthRequest" WHERE "id" = ? AND "resource" = ? AND "expiresAt" > ? AND "completedAt" IS NULL',
        )
          .bind(requestId, resource, new Date().toISOString())
          .first<AuthorizationRequest>();
        if (!saved)
          throw new McpOAuthError(
            'invalid_request',
            'Authorization request expired or was already completed',
          );
        if (request.method === 'GET')
          return json({
            clientName: saved.clientName,
            clientId: saved.clientId,
            redirectUri: saved.redirectUri,
            workspaceName: workspace.displayName,
          });
        const input: unknown = JSON.parse(await readBody(request));
        if (!isPlainObject(input) || typeof input.approve !== 'boolean')
          throw new McpOAuthError(
            'invalid_request',
            'An authorization decision is required',
          );
        const redirect = new URL(saved.redirectUri);
        const now = new Date().toISOString();
        if (input.approve) {
          const grantId = crypto.randomUUID();
          const code = randomToken();
          const results = await env.CORE_DB.batch([
            env.CORE_DB.prepare(
              'INSERT INTO "mcpOAuthGrant" ("id", "userWorkspaceId", "clientId", "clientName", "clientOrigins", "resource", "createdAt") SELECT ?, ?, "clientId", "clientName", "clientOrigins", "resource", ? FROM "mcpOAuthRequest" WHERE "id" = ? AND "completedAt" IS NULL AND "expiresAt" > ?',
            ).bind(grantId, identity.userWorkspaceId, now, requestId, now),
            env.CORE_DB.prepare(
              'UPDATE "mcpOAuthRequest" SET "completedAt" = ?, "grantId" = ?, "codeHash" = ?, "codeExpiresAt" = ? WHERE "id" = ? AND "completedAt" IS NULL AND EXISTS (SELECT 1 FROM "mcpOAuthGrant" WHERE "id" = ?)',
            ).bind(
              now,
              grantId,
              await hashToken(code),
              new Date(Date.now() + 60000).toISOString(),
              requestId,
              grantId,
            ),
          ]);
          if (results[1].meta.changes !== 1)
            throw new McpOAuthError(
              'invalid_request',
              'Authorization was already completed',
            );
          redirect.searchParams.set('code', code);
        } else {
          const result = await env.CORE_DB.prepare(
            'UPDATE "mcpOAuthRequest" SET "completedAt" = ? WHERE "id" = ? AND "completedAt" IS NULL',
          )
            .bind(now, requestId)
            .run();
          if (result.meta.changes !== 1)
            throw new McpOAuthError(
              'invalid_request',
              'Authorization was already completed',
            );
          redirect.searchParams.set('error', 'access_denied');
        }
        if (saved.state !== null)
          redirect.searchParams.set('state', saved.state);
        redirect.searchParams.set('iss', origin);
        return json({ redirectUrl: redirect.href });
      }
    }
    return json({ statusCode: 404, error: 'NOT_FOUND' }, 404);
  } catch (error) {
    if (error instanceof McpOAuthError && authorizationRedirect) {
      authorizationRedirect.searchParams.set('error', error.code);
      const state = url.searchParams.get('state');
      if (state !== null && state.length <= 2048)
        authorizationRedirect.searchParams.set('state', state);
      authorizationRedirect.searchParams.set('iss', origin);
      headers.set('location', authorizationRedirect.href);
      return new Response(null, { status: 302, headers });
    }
    if (error instanceof McpOAuthError)
      return json(
        { error: error.code, error_description: error.message },
        error.status,
      );
    if (error instanceof GraphQLError)
      return json(
        { error: error.extensions.code, error_description: error.message },
        error.extensions.code === 'UNAUTHENTICATED' ? 401 : 403,
      );
    if (error instanceof SyntaxError || error instanceof TypeError)
      return json(
        {
          error: 'invalid_request',
          error_description: 'Invalid authorization request',
        },
        400,
      );
    logEvent(
      { event: 'mcp_oauth_failed', errorCode: 'INTERNAL_SERVER_ERROR' },
      'error',
    );
    return json(
      {
        error: 'server_error',
        error_description: 'Unable to process authorization',
      },
      500,
    );
  }
};
