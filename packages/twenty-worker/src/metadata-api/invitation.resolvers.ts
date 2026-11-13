import { type GraphQLFieldResolver } from 'graphql';

import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import {
  requireInvitationManagement,
  sendWorkspaceInvitations,
  type WorkspaceInvitation,
} from '@/auth/workspace-invitation.service';
import { apiError } from '@/shared/errors/api-error.util';

type Resolver = GraphQLFieldResolver<unknown, MetadataContext>;
export const INVITATION_QUERY_RESOLVERS: Record<string, Resolver> = {
  findWorkspaceInvitations: async (_source, _arguments, context) => {
    const { workspace } = await requireInvitationManagement(context);
    return (
      await context.env.CORE_DB.prepare(
        'SELECT "id", "email", "roleId", "expiresAt" FROM "workspaceInvitation" WHERE "workspaceId" = ? AND "acceptedAt" IS NULL AND "expiresAt" > ?',
      )
        .bind(workspace.id, new Date().toISOString())
        .all()
    ).results;
  },
};
export const INVITATION_MUTATION_RESOLVERS: Record<string, Resolver> = {
  deleteWorkspaceInvitation: async (
    _source,
    { appTokenId }: { appTokenId: string },
    context,
  ) => {
    const { workspace } = await requireInvitationManagement(context);
    const result = await context.env.CORE_DB.prepare(
      'DELETE FROM "workspaceInvitation" WHERE "id" = ? AND "workspaceId" = ? RETURNING "id"',
    )
      .bind(appTokenId, workspace.id)
      .first<{ id: string }>();
    if (!result) throw apiError('Invitation not found', 'NOT_FOUND');
    return result.id;
  },
  resendWorkspaceInvitation: async (
    _source,
    { appTokenId }: { appTokenId: string },
    context,
  ) => {
    const { workspace } = await requireInvitationManagement(context);
    const invitation = await context.env.CORE_DB.prepare(
      'SELECT * FROM "workspaceInvitation" WHERE "id" = ? AND "workspaceId" = ? AND "acceptedAt" IS NULL',
    )
      .bind(appTokenId, workspace.id)
      .first<WorkspaceInvitation>();
    if (!invitation) throw apiError('Invitation not found', 'NOT_FOUND');
    return sendWorkspaceInvitations(
      context,
      [invitation.email],
      invitation.roleId,
    );
  },
};
