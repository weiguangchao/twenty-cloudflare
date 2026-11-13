import { GraphQLError, type GraphQLFieldResolver } from 'graphql';

import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';

export const EVENT_STREAM_MUTATION_RESOLVERS: Record<
  string,
  GraphQLFieldResolver<unknown, MetadataContext>
> = Object.fromEntries(
  ['addQueryToEventStream', 'removeQueryFromEventStream'].map((name) => [
    name,
    async (
      _source: unknown,
      { input }: { input: Record<string, unknown> },
      context: MetadataContext,
    ) => {
      const data = await context.requireMetadata();
      const auth = await context.requireAuth();
      const result = JSON.parse(
        await context
          .workspace(data.workspace.id)
          .updateEventStreamQuery(
            name === 'addQueryToEventStream' ? 'add' : 'remove',
            JSON.stringify(input),
            {
              userId: auth.userId,
              userWorkspaceId: data.membership.id,
              workspaceMemberId: data.membership.workspaceMemberId,
            },
          ),
      ) as {
        value?: boolean;
        errors?: { message: string; extensions: Record<string, unknown> }[];
      };
      if (result.errors)
        throw new GraphQLError(result.errors[0].message, {
          extensions: result.errors[0].extensions,
        });
      return result.value;
    },
  ]),
);
