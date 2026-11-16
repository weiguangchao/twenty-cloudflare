import { handleMcpRequest } from '@/mcp/handle-mcp-request.util';
import { authenticateMcpUserRequest } from '@/mcp/oauth/mcp-oauth-token.service';
import { MCP_OAUTH_SCOPE } from '@/mcp/oauth/mcp-oauth-client.util';

export const handleMcpUserRequest = async (request: Request, env: Env) => {
  const headers = new Headers({
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers':
      'Authorization, Content-Type, Accept, MCP-Protocol-Version',
    'access-control-expose-headers':
      'WWW-Authenticate, MCP-Protocol-Version, X-Request-Id',
    'cache-control': 'no-store',
  });
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers });
  const response = await handleMcpRequest(request, env, {
    authenticate: authenticateMcpUserRequest,
    validateSameOrigin: false,
  });
  const result = new Response(response.body, response);
  headers.forEach((value, name) => result.headers.set(name, value));
  if (result.status === 401)
    result.headers.set(
      'www-authenticate',
      `Bearer resource_metadata="${new URL(request.url).origin}/.well-known/oauth-protected-resource/mcp/v1", scope="${MCP_OAUTH_SCOPE}"`,
    );
  return result;
};
