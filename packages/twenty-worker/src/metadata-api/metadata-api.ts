import { createYoga } from 'graphql-yoga';

import { extractSessionCookie } from '@/auth/session.service';
import { buildMetadataSchema } from '@/metadata-api/metadata-schema.util';
import { createMetadataContext } from '@/metadata-api/create-metadata-context.util';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';

type ServerContext = { env: Env; responseHeaders: Headers };

const createMetadataApi = () =>
  createYoga<ServerContext, MetadataContext>({
    schema: buildMetadataSchema(),
    graphqlEndpoint: '/metadata',
    graphiql: false,
    landingPage: false,
    cors: false,
    maskedErrors: true,
    context: ({ request, env, responseHeaders }) =>
      createMetadataContext(env, request, responseHeaders),
  });

let metadataApi: ReturnType<typeof createMetadataApi> | undefined;

export const handleMetadataRequest = async (request: Request, env: Env) => {
  const bearer = /^Bearer\s+\S+$/i.test(
    request.headers.get('authorization') ?? '',
  );
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    !bearer &&
    extractSessionCookie(request) &&
    request.headers.get('origin') !== new URL(request.url).origin
  ) {
    return Response.json(
      {
        statusCode: 403,
        messages: [
          'Request origin is not allowed for cookie-authenticated requests',
        ],
        error: 'CSRF_ORIGIN_MISMATCH',
      },
      { status: 403 },
    );
  }

  metadataApi ??= createMetadataApi();
  const responseHeaders = new Headers();
  const result = await metadataApi.fetch(request, { env, responseHeaders });
  const response = new Response(result.body, result);
  for (const [name, value] of responseHeaders)
    response.headers.append(name, value);
  response.headers.set('cache-control', 'no-store');
  response.headers.set('vary', 'Cookie, Authorization, Origin');
  return response;
};
