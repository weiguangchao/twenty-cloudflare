import { GraphQLError, type GraphQLFieldResolver } from 'graphql';

import { hashToken, randomToken } from '@/auth/token.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';

const execute = async (
  context: MetadataContext,
  operation: string,
  input: Record<string, unknown>,
) => {
  const data = await context.requireMetadata();
  const auth = await context.requireAuth();
  const result = JSON.parse(
    await context
      .workspace(data.workspace.id)
      .executeIntegrationOperation(operation, JSON.stringify(input), {
        userId: auth.userId,
        userWorkspaceId: data.membership.id,
        workspaceMemberId: data.membership.workspaceMemberId,
      }),
  ) as {
    value?: unknown;
    errors?: { message: string; extensions: Record<string, unknown> }[];
  };
  if (result.errors)
    throw new GraphQLError(result.errors[0].message, {
      extensions: result.errors[0].extensions,
    });
  if (
    !['apiKeys', 'apiKey', 'webhooks', 'webhook', 'getApiKeyRoles'].includes(
      operation,
    )
  )
    context.invalidateMetadata();
  return result.value;
};

export const roleApiKeys = async (
  context: MetadataContext,
  roleId: unknown,
) => {
  if (
    !(await context.requireMetadata()).permissions.permissionFlags.includes(
      'API_KEYS_AND_WEBHOOKS',
    )
  )
    return [];
  const keys = (await execute(context, 'apiKeys', {})) as { roleId: string }[];
  return keys.filter((key) => key.roleId === roleId);
};
type Resolver = GraphQLFieldResolver<unknown, MetadataContext>;
export const INTEGRATION_QUERY_RESOLVERS: Record<string, Resolver> =
  Object.fromEntries(
    ['apiKeys', 'apiKey', 'webhooks', 'webhook', 'getApiKeyRoles'].map(
      (operation) =>
        [
          operation,
          (_source, input, context) =>
            execute(context, operation, input.input ?? input),
        ] as [string, Resolver],
    ),
  );
export const INTEGRATION_MUTATION_RESOLVERS: Record<string, Resolver> =
  Object.fromEntries(
    [
      'createApiKey',
      'updateApiKey',
      'revokeApiKey',
      'createWebhook',
      'updateWebhook',
      'deleteWebhook',
      'generateApiKeyToken',
      'assignRoleToApiKey',
    ].map(
      (operation) =>
        [
          operation,
          async (_source, arguments_, context) => {
            const input: Record<string, unknown> =
              arguments_.input ?? arguments_;
            if (operation === 'createWebhook' && !input.secret)
              input.secret = randomToken();
            if (operation === 'assignRoleToApiKey')
              return execute(context, operation, {
                id: input.apiKeyId,
                roleId: input.roleId,
              });
            if (operation === 'generateApiKeyToken') {
              const data = await context.requireMetadata();
              const token = `api_${data.workspace.id}_${String(input.apiKeyId)}_${randomToken()}`;
              await execute(context, operation, {
                id: input.apiKeyId,
                expiresAt: input.expiresAt,
                tokenHash: await hashToken(token),
              });
              return { token };
            }
            return execute(context, operation, input);
          },
        ] as [string, Resolver],
    ),
  );
