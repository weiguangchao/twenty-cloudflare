import { isPlainObject } from 'twenty-shared/utils';
import { GraphQLError } from 'graphql';

import { createMetadataContext } from '@/metadata-api/create-metadata-context.util';
import { apiError } from '@/shared/errors/api-error.util';
import { cookieSessionOriginError } from '@/http/cookie-session-origin-error.util';

export const handleShellRecordRequest = async (request: Request, env: Env) => {
  const originError = cookieSessionOriginError(request);
  if (originError) return originError;
  try {
    const context = createMetadataContext(env, request, new Headers());
    const { workspace, permissions } = await context.requireMetadata();
    if (
      !permissions.objectRecordsPermissions.some(
        (permission) => permission.canReadAllRecords,
      )
    )
      throw apiError('Permission denied', 'FORBIDDEN');
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
    const memberships = await context.store.membershipsForWorkspace(
      workspace.id,
    );
    const result = await context
      .workspace(workspace.id)
      .executeShellRecordQuery(
        {
          query: body.query,
          variables: body.variables as Record<string, unknown> | undefined,
          operationName: body.operationName as string | undefined,
        },
        memberships.map((member) => ({
          workspaceMemberId: member.workspaceMemberId,
          userWorkspaceId: member.id,
        })),
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
    console.error('Failed to execute shell record query', error);
    return Response.json(
      { errors: [apiError('Unable to load records', 'INTERNAL_SERVER_ERROR')] },
      { status: 500 },
    );
  }
};
