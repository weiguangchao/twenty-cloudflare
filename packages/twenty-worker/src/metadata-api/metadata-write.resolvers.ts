import { apiError } from '@/shared/errors/api-error.util';
import { GraphQLError, type GraphQLFieldResolver } from 'graphql';

import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { METADATA_WRITE_OPERATIONS } from '@/workspace/metadata/operations/execute-metadata-mutation.util';
import { type MetadataOperationResult } from '@/workspace/metadata/types/metadata-operation-result.type';

export const METADATA_WRITE_RESOLVERS: Record<
  string,
  GraphQLFieldResolver<unknown, MetadataContext>
> = Object.fromEntries(
  METADATA_WRITE_OPERATIONS.map((name) => [
    name,
    async (
      _source: unknown,
      arguments_: Record<string, unknown>,
      context: MetadataContext,
    ) => {
      const data = await context.requireMetadata();
      const auth = await context.requireAuth();
      if (name === 'updateWorkspaceMemberRole') {
        const target = (
          await context.store.membershipsForWorkspace(data.workspace.id)
        ).find(
          (membership) =>
            membership.workspaceMemberId === arguments_.workspaceMemberId,
        );
        if (!target) throw apiError('Workspace member not found', 'NOT_FOUND');
        arguments_ = {
          ...arguments_,
          targetIdentity: { userWorkspaceId: target.id, userId: target.userId },
        };
      }
      const response = JSON.parse(
        await context
          .workspace(data.workspace.id)
          .executeMetadataMutation(name, JSON.stringify(arguments_), {
            userId: auth.userId,
            userWorkspaceId: data.membership.id,
            workspaceMemberId: data.membership.workspaceMemberId,
          }),
      ) as MetadataOperationResult<unknown> & {
        errors?: { message: string; extensions: Record<string, unknown> }[];
      };
      if (response.errors)
        throw new GraphQLError(response.errors[0].message, {
          extensions: response.errors[0].extensions,
        });
      if (response.status === 'fail')
        throw new GraphQLError(response.failure.message, {
          extensions: {
            code: 'METADATA_VALIDATION_FAILED',
            ...response.failure,
            userFriendlyMessage: response.failure.message,
          },
        });
      context.invalidateMetadata();
      return response.value;
    },
  ]),
);
