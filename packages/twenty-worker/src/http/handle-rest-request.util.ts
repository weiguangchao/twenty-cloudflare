import { GraphQLError } from 'graphql';

import { authenticateRecordRequest } from '@/integrations/authenticate-record-request.util';
import { cookieSessionOriginError } from '@/http/cookie-session-origin-error.util';
import { apiError } from '@/shared/errors/api-error.util';

export const handleRestRequest = async (request: Request, env: Env) => {
  const originError = cookieSessionOriginError(request);
  if (originError) return originError;
  try {
    const { workspaceId, identity } = await authenticateRecordRequest(
      request,
      env,
    );
    const url = new URL(request.url);
    const result = JSON.parse(
      await env.WORKSPACE.get(
        env.WORKSPACE.idFromName(workspaceId),
      ).executeRestRequest(
        JSON.stringify({
          method: request.method,
          path: url.pathname.slice('/rest/'.length).split('/').filter(Boolean),
          query: Object.fromEntries(url.searchParams),
          body: ['POST', 'PATCH', 'PUT'].includes(request.method)
            ? await request.json()
            : undefined,
          origin: url.origin,
          workspaceId,
        }),
        identity,
      ),
    ) as {
      data?: unknown;
      errors?: { message: string; extensions: { code: string } }[];
    };
    if (result.errors?.length)
      throw new GraphQLError(result.errors[0].message, {
        extensions: result.errors[0].extensions,
      });
    return Response.json(result, {
      status: request.method === 'POST' ? 201 : 200,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    const failure =
      error instanceof GraphQLError
        ? error
        : apiError(
            error instanceof SyntaxError
              ? 'Invalid REST request'
              : 'Unable to execute REST request',
            error instanceof SyntaxError
              ? 'BAD_USER_INPUT'
              : 'INTERNAL_SERVER_ERROR',
          );
    const status =
      (
        {
          UNAUTHENTICATED: 401,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          CONFLICT: 409,
          INTERNAL_SERVER_ERROR: 500,
        } as Record<string, number>
      )[String(failure.extensions.code)] ?? 400;
    return Response.json(
      {
        statusCode: status,
        error: failure.extensions.code,
        messages: [failure.message],
      },
      { status, headers: { 'cache-control': 'no-store' } },
    );
  }
};
