import { GraphQLError } from 'graphql';
import { isPlainObject } from 'twenty-shared/utils';

import { cookieSessionOriginError } from '@/http/cookie-session-origin-error.util';
import { authenticateRecordRequest } from '@/integrations/authenticate-record-request.util';
import {
  MCP_MAX_REQUEST_BYTES,
  MCP_PROTOCOL_VERSIONS,
} from '@/mcp/mcp.constants';
import { type McpRequest, type McpResponse } from '@/mcp/types/mcp.type';
import { getWorkspaceStub } from '@/workspace/get-workspace-stub.util';
import { logEvent } from '@/observability/log-event.util';

export const handleMcpRequest = async (
  request: Request,
  env: Env,
  options: {
    authenticate: typeof authenticateRecordRequest;
    validateSameOrigin: boolean;
  } = { authenticate: authenticateRecordRequest, validateSameOrigin: true },
) => {
  const headers = new Headers({
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  const failure = (
    status: number,
    code: number,
    message: string,
    id: McpResponse['id'] = null,
  ) =>
    Response.json(
      { jsonrpc: '2.0', id, error: { code, message } },
      { status, headers },
    );
  const origin = new URL(request.url).origin;
  if (
    options.validateSameOrigin &&
    request.headers.has('origin') &&
    request.headers.get('origin') !== origin
  )
    return failure(403, -32000, 'Request origin is not allowed');
  const originError = cookieSessionOriginError(request);
  if (originError) return originError;
  try {
    const { workspaceId, identity } = await options.authenticate(request, env);
    const workspace = getWorkspaceStub(env, workspaceId);
    const invoke = async (message: McpRequest) => {
      const result = JSON.parse(
        await workspace.executeMcpRequest(
          JSON.stringify(message),
          identity,
          { workspaceId, origin },
          new URL(request.url).searchParams.get('mode') === 'meta',
          request.headers.get('x-request-id') ?? undefined,
        ),
      ) as {
        value?: McpResponse | null;
        errors?: { message: string; extensions: { code: string } }[];
      };
      if (result.errors?.length)
        throw new GraphQLError(result.errors[0].message, {
          extensions: result.errors[0].extensions,
        });
      return result.value;
    };
    // API key hashes are verified inside the workspace, including discovery and notifications.
    await invoke({ jsonrpc: '2.0', id: 0, method: 'ping' });
    if (request.method !== 'POST') {
      headers.set('allow', 'POST');
      return failure(
        405,
        -32000,
        'Only POST is supported; this server is stateless',
      );
    }
    const protocolVersion = request.headers.get('mcp-protocol-version');
    if (protocolVersion && !MCP_PROTOCOL_VERSIONS.includes(protocolVersion))
      return failure(400, -32600, 'Unsupported MCP protocol version');
    if (
      request.headers
        .get('content-type')
        ?.split(';')[0]
        .trim()
        .toLowerCase() !== 'application/json'
    )
      return failure(415, -32600, 'Content-Type must be application/json');
    const accept = request.headers.get('accept') ?? 'application/json';
    const mediaTypes = accept
      .split(',')
      .map((value) => value.trim().split(';')[0]);
    if (
      !mediaTypes.some((type) =>
        ['application/json', 'text/event-stream', '*/*'].includes(type),
      )
    )
      return failure(
        406,
        -32600,
        'Accept must include application/json or text/event-stream',
      );
    if (Number(request.headers.get('content-length')) > MCP_MAX_REQUEST_BYTES)
      return failure(413, -32600, 'MCP request is too large');
    let size = 0;
    const body = request.body?.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          size += chunk.byteLength;
          if (size > MCP_MAX_REQUEST_BYTES)
            throw new RangeError('MCP request is too large');
          controller.enqueue(chunk);
        },
      }),
    );
    let message: unknown;
    try {
      message = await new Response(body).json();
    } catch (error) {
      return error instanceof RangeError
        ? failure(413, -32600, 'MCP request is too large')
        : failure(400, -32700, 'Invalid JSON');
    }
    if (
      !isPlainObject(message) ||
      message.jsonrpc !== '2.0' ||
      typeof message.method !== 'string' ||
      (message.id !== undefined &&
        typeof message.id !== 'string' &&
        (typeof message.id !== 'number' || !Number.isFinite(message.id))) ||
      (message.params !== undefined && !isPlainObject(message.params))
    )
      return failure(400, -32600, 'Invalid JSON-RPC request');
    const result = await invoke(message as McpRequest);
    if (!result) return new Response(null, { status: 202, headers });
    if (mediaTypes.includes('text/event-stream')) {
      headers.set('content-type', 'text/event-stream');
      return new Response(
        `event: message\ndata: ${JSON.stringify(result)}\n\n`,
        { headers },
      );
    }
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof GraphQLError) {
      const status =
        error.extensions.code === 'UNAUTHENTICATED'
          ? 401
          : error.extensions.code === 'FORBIDDEN'
            ? 403
            : 400;
      if (status === 401)
        headers.set('www-authenticate', 'Bearer realm="twenty-mcp"');
      return failure(status, -32000, error.message);
    }
    logEvent(
      {
        event: 'mcp_request_failed',
        requestId: request.headers.get('x-request-id') ?? undefined,
        errorCode: 'INTERNAL_SERVER_ERROR',
      },
      'error',
    );
    return failure(500, -32603, 'Unable to process MCP request');
  }
};
