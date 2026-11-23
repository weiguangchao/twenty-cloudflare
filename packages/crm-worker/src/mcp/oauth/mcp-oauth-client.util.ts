import { isNonEmptyString } from '@sniptt/guards';
import { isPlainObject } from 'crm-shared/utils';

export const MCP_OAUTH_SCOPE = 'crm';
export const mcpResource = (origin: string) => `${origin}/mcp/v1`;

export class McpOAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export type McpOAuthClient = {
  id: string;
  name: string;
  redirectUris: string[];
};

const redirectUri = (value: unknown) => {
  if (!isNonEmptyString(value) || value.length > 2048)
    throw new McpOAuthError('invalid_redirect_uri', 'Invalid redirect URI');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new McpOAuthError('invalid_redirect_uri', 'Invalid redirect URI');
  }
  if (
    url.username ||
    url.password ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ))
  )
    throw new McpOAuthError(
      'invalid_redirect_uri',
      'HTTPS or loopback is required',
    );
  return value;
};

export const parseMcpClient = (
  input: unknown,
  requireName = false,
): Omit<McpOAuthClient, 'id'> => {
  if (
    !isPlainObject(input) ||
    (requireName && !isNonEmptyString(input.client_name)) ||
    (input.client_name !== undefined &&
      (!isNonEmptyString(input.client_name) ||
        input.client_name.length > 200)) ||
    !Array.isArray(input.redirect_uris) ||
    !input.redirect_uris.length ||
    input.redirect_uris.length > 10 ||
    (input.token_endpoint_auth_method !== undefined &&
      input.token_endpoint_auth_method !== 'none') ||
    (input.grant_types !== undefined &&
      (!Array.isArray(input.grant_types) ||
        !input.grant_types.includes('authorization_code') ||
        input.grant_types.some(
          (grant) => !['authorization_code', 'refresh_token'].includes(grant),
        ))) ||
    (input.response_types !== undefined &&
      (!Array.isArray(input.response_types) ||
        input.response_types.length !== 1 ||
        input.response_types[0] !== 'code'))
  )
    throw new McpOAuthError(
      'invalid_client_metadata',
      'Invalid public client metadata',
    );
  return {
    name: isNonEmptyString(input.client_name)
      ? input.client_name
      : 'MCP client',
    redirectUris: input.redirect_uris.map(redirectUri),
  };
};

export const resolveMcpClient = async (
  env: Env,
  origin: string,
  clientId: string,
): Promise<McpOAuthClient> => {
  if (clientId.startsWith('https://')) {
    const url = new URL(clientId);
    if (
      clientId.length > 2048 ||
      url.pathname === '/' ||
      url.hash ||
      url.username ||
      url.password ||
      !url.hostname.includes('.') ||
      /^[\d.]+$/.test(url.hostname) ||
      url.hostname.endsWith('.local')
    )
      throw new McpOAuthError('invalid_client', 'Invalid client metadata URL');
    // Wrangler's globally public fetch restriction also rejects private DNS resolutions.
    const response = await fetch(clientId, {
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json' },
    }).catch(() => {
      throw new McpOAuthError(
        'invalid_client',
        'Client metadata could not be loaded',
      );
    });
    if (!response.ok)
      throw new McpOAuthError(
        'invalid_client',
        'Client metadata could not be loaded',
      );
    let size = 0;
    const body = response.body?.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          size += chunk.byteLength;
          if (size > 65536)
            throw new McpOAuthError(
              'invalid_client',
              'Client metadata is too large',
            );
          controller.enqueue(chunk);
        },
      }),
    );
    const metadata: unknown = await new Response(body).json();
    if (!isPlainObject(metadata) || metadata.client_id !== clientId)
      throw new McpOAuthError(
        'invalid_client',
        'Client ID does not match metadata',
      );
    return { id: clientId, ...parseMcpClient(metadata, true) };
  }
  const client = await env.CORE_DB.prepare(
    'SELECT "id", "name", "redirectUris" FROM "mcpOAuthClient" WHERE "id" = ? AND "origin" = ?',
  )
    .bind(clientId, origin)
    .first<{ id: string; name: string; redirectUris: string }>();
  if (!client) throw new McpOAuthError('invalid_client', 'Unknown client');
  return {
    ...client,
    redirectUris: JSON.parse(client.redirectUris) as string[],
  };
};
