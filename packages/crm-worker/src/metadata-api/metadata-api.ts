import { createYoga, type Plugin } from 'graphql-yoga';
import { logEvent, logOperationName } from '@/observability/log-event.util';

import { cookieSessionOriginError } from '@/http/cookie-session-origin-error.util';
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
    plugins: [
      {
        onExecute: ({ args }) => {
          const startedAt = performance.now();
          return {
            onExecuteDone: ({ result }) => {
              const context = args.contextValue as MetadataContext;
              const hasErrors =
                'errors' in result && Boolean(result.errors?.length);
              logEvent(
                {
                  event: 'metadata_operation',
                  requestId:
                    context.request.headers.get('x-request-id') ?? undefined,
                  workspaceId: context.telemetry.workspaceId,
                  operation: logOperationName(args.operationName),
                  durationMs: Math.round(performance.now() - startedAt),
                  ...(hasErrors ? { errorCode: 'GRAPHQL_ERROR' } : {}),
                },
                hasErrors ? 'error' : 'info',
              );
            },
          };
        },
      } satisfies Plugin<MetadataContext>,
    ],
    context: ({ request, env, responseHeaders }) =>
      createMetadataContext(env, request, responseHeaders),
  });

let metadataApi: ReturnType<typeof createMetadataApi> | undefined;

export const handleMetadataRequest = async (request: Request, env: Env) => {
  const originError = cookieSessionOriginError(request);
  if (originError) return originError;

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
