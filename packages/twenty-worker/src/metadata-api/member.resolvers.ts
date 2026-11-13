import { GraphQLError, type GraphQLFieldResolver } from 'graphql';

import { currentUser } from '@/auth/current-user.service';
import { clearSessionCookies } from '@/auth/session.service';
import {
  requireWorkspace,
  workspaceUrls,
} from '@/auth/workspace-lifecycle.service';
import { updateWorkspace } from '@/auth/update-workspace.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';
import { type UserWorkspaceRow } from '@/core-db/types/core-rows.type';

type Resolver = GraphQLFieldResolver<unknown, MetadataContext>;
const invitedWorkspace = async (
  context: MetadataContext,
  inviteHash: string,
) => {
  if (inviteHash.length > 256) return null;
  const workspace = await context.store.workspaceByOrigin(
    new URL(context.request.url).origin,
  );
  if (
    !workspace ||
    workspace.activationStatus !== 'ACTIVE' ||
    !workspace.isPublicInviteLinkEnabled ||
    workspace.inviteHash !== inviteHash
  )
    return null;
  return {
    id: workspace.id,
    displayName: workspace.displayName,
    logo: workspace.logo,
    allowImpersonation: false,
    workspaceUrls: workspaceUrls(workspace),
  };
};

export const MEMBER_QUERY_RESOLVERS: Record<string, Resolver> = {
  findWorkspaceFromInviteHash: async (
    _source,
    { inviteHash }: { inviteHash: string },
    context,
  ) => {
    const workspace = await invitedWorkspace(context, inviteHash);
    if (!workspace) throw apiError('Invalid workspace invitation', 'FORBIDDEN');
    return workspace;
  },
  checkWorkspaceInviteHashIsValid: async (
    _source,
    { inviteHash }: { inviteHash: string },
    context,
  ) => ({ isValid: Boolean(await invitedWorkspace(context, inviteHash)) }),
  getApprovedAccessDomains: async (_source, _arguments, context) => {
    await context.requireMetadata();
    return [];
  },
  twoFactorAuthenticationRecoveryStatus: async (
    _source,
    { userId }: { userId: string },
    context,
  ) => {
    const auth = await context.requireAuth();
    if (
      auth.userId !== userId &&
      !(await context.requireMetadata()).permissions.permissionFlags.includes(
        'WORKSPACE_MEMBERS',
      )
    )
      throw apiError('Permission denied', 'FORBIDDEN');
    return {
      hasVerifiedTwoFactorAuthenticationMethod: false,
      isAwaitingRecoveryEnrollment: false,
      pendingRecoveryCodeExpiresAt: null,
    };
  },
};

const removeMember = async (
  context: MetadataContext,
  membership: UserWorkspaceRow,
) => {
  const auth = await context.requireAuth();
  const ownMembership = await context.store.membership(
    auth.userId,
    membership.workspaceId,
  );
  if (!ownMembership) throw apiError('Workspace access denied', 'FORBIDDEN');
  const response = JSON.parse(
    await context.workspace(membership.workspaceId).removeWorkspaceMember(
      membership.workspaceId,
      {
        userId: auth.userId,
        userWorkspaceId: ownMembership.id,
        workspaceMemberId: ownMembership.workspaceMemberId,
      },
      {
        userId: membership.userId,
        userWorkspaceId: membership.id,
        workspaceMemberId: membership.workspaceMemberId,
      },
    ),
  ) as { errors?: { message: string; extensions: Record<string, unknown> }[] };
  if (response.errors)
    throw new GraphQLError(response.errors[0].message, {
      extensions: response.errors[0].extensions,
    });
  context.invalidateMetadata();
};

export const MEMBER_MUTATION_RESOLVERS: Record<string, Resolver> = {
  updateWorkspace: (_source, { data }, context) =>
    updateWorkspace(context, data),
  deleteUserFromWorkspace: async (
    _source,
    { workspaceMemberIdToDelete }: { workspaceMemberIdToDelete: string },
    context,
  ) => {
    const { workspace, auth } = await requireWorkspace(context);
    const membership = (
      await context.store.membershipsForWorkspace(workspace.id)
    ).find(
      (membership) =>
        membership.workspaceMemberId === workspaceMemberIdToDelete,
    );
    if (!membership) throw apiError('Workspace member not found', 'NOT_FOUND');
    await removeMember(context, membership);
    if (membership.userId === auth.userId)
      clearSessionCookies(context.responseHeaders);
    return {
      ...membership,
      updatedAt: new Date().toISOString(),
      permissionFlags: [],
      objectRecordsPermissions: [],
    };
  },
  deleteUser: async (_source, _arguments, context) => {
    const account = await currentUser(context);
    const auth = await context.requireAuth();
    const workspaces = await context.store.workspacesForUser(auth.userId);
    for (const workspace of workspaces) {
      const membership = await context.store.membership(
        auth.userId,
        workspace.id,
      );
      if (membership) await removeMember(context, membership);
    }
    await context.env.CORE_DB.batch([
      context.env.CORE_DB.prepare(
        'UPDATE "user" SET "disabled" = 1, "deletedAt" = ?, "updatedAt" = ?, "email" = ?, "passwordHash" = \'\', "firstName" = \'\', "lastName" = \'\' WHERE "id" = ?',
      ).bind(
        new Date().toISOString(),
        new Date().toISOString(),
        `${auth.userId}@deleted.invalid`,
        auth.userId,
      ),
      context.env.CORE_DB.prepare(
        'UPDATE "userSession" SET "revokedAt" = ? WHERE "userId" = ?',
      ).bind(new Date().toISOString(), auth.userId),
    ]);
    clearSessionCookies(context.responseHeaders);
    return {
      ...account,
      disabled: true,
      workspaceMember: null,
      workspaceMembers: [],
      currentWorkspace: null,
      currentUserWorkspace: null,
    };
  },
};
