import { getWorkspaceStub } from '@/workspace/get-workspace-stub.util';
import { isPlainObject } from 'twenty-shared/utils';
import { GraphQLError } from 'graphql';

import { authenticateRecordRequest } from '@/integrations/authenticate-record-request.util';
import { apiError } from '@/shared/errors/api-error.util';
import { cookieSessionOriginError } from '@/http/cookie-session-origin-error.util';

export const handleRecordRequest = async (request: Request, env: Env) => {
  const originError = cookieSessionOriginError(request);
  if (originError) return originError;
  try {
    const { workspaceId, identity } = await authenticateRecordRequest(
      request,
      env,
    );
    const body: unknown = await request.json();
    if (
      !isPlainObject(body) ||
      typeof body.query !== 'string' ||
      (body.operationName !== undefined &&
        body.operationName !== null &&
        typeof body.operationName !== 'string') ||
      (body.variables !== undefined &&
        body.variables !== null &&
        !isPlainObject(body.variables))
    )
      throw apiError('Invalid GraphQL request');
    const result = await getWorkspaceStub(env, workspaceId).executeRecordQuery(
      {
        requestId: request.headers.get('x-request-id') ?? undefined,
        query: body.query,
        fileUrl: {
          workspaceId,
          origin: new URL(request.url).origin,
        },
        variables: body.variables as Record<string, unknown> | undefined,
        operationName: body.operationName as string | undefined,
      },
      identity,
    );
    return new Response(result, {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof GraphQLError)
      return Response.json(
        { errors: [error] },
        { headers: { 'cache-control': 'no-store' } },
      );
    if (error instanceof SyntaxError)
      return Response.json(
        { errors: [apiError('Invalid record request')] },
        { status: 400 },
      );
    console.error('Failed to execute record query', error);
    return Response.json(
      { errors: [apiError('Unable to load records', 'INTERNAL_SERVER_ERROR')] },
      { status: 500 },
    );
  }
};
