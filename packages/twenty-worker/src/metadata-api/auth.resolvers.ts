import { oauthProviders } from '@/auth/oauth/oauth-provider.util';
import {
  acceptWorkspaceInvitation,
  sendWorkspaceInvitations,
} from '@/auth/workspace-invitation.service';
import { GraphQLError, type GraphQLFieldResolver } from 'graphql';
import { verifyToken } from '@/auth/token.service';

import {
  limitAuthentication,
  normalizeEmail,
  registerUser,
  userFromCredentials,
} from '@/auth/credentials.service';
import { currentUser } from '@/auth/current-user.service';
import {
  createLoginToken,
  exchangeLoginToken,
} from '@/auth/login-token.service';
import { clearSessionCookies, createSession } from '@/auth/session.service';
import { updateProfile } from '@/auth/update-profile.service';
import {
  activateWorkspace,
  availableWorkspaces,
  createWorkspace,
  memberInput,
  requireWorkspace,
  workspaceUrls,
} from '@/auth/workspace-lifecycle.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';

type Credentials = { email: string; password: string; locale?: string | null };
type Resolver = GraphQLFieldResolver<unknown, MetadataContext>;

export const credentialsSession = async (
  context: MetadataContext,
  user: Awaited<ReturnType<typeof userFromCredentials>>,
) => {
  const workspace = (await context.store.workspacesForUser(user.id)).find(
    (candidate) => candidate.origin === new URL(context.request.url).origin,
  );
  const membership = workspace
    ? await context.store.membership(user.id, workspace.id)
    : null;
  return {
    tokens: await createSession(
      context.env,
      context.request,
      context.responseHeaders,
      user.id,
      membership?.id ?? null,
      workspace?.id ?? null,
    ),
    availableWorkspaces: await availableWorkspaces(context, user.id),
  };
};

export const AUTH_QUERY_RESOLVERS: Record<string, Resolver> = {
  checkUserExists: async (_source, { email }: { email: string }, context) => {
    const normalized = normalizeEmail(email);
    await limitAuthentication(context, normalized);
    const user = await context.store.userByEmail(normalized);
    return {
      exists: Boolean(user),
      availableWorkspacesCount: user
        ? (await context.store.workspacesForUser(user.id)).length
        : 0,
      isEmailVerified: Boolean(user?.isEmailVerified),
    };
  },
  currentUser: (_source, _arguments, context) => currentUser(context),
  getWorkspaceCreationDefaults: async (_source, _arguments, context) => {
    await context.requireAuth();
    return { displayName: '', subdomain: '' };
  },
  getPublicWorkspaceDataByDomain: async (
    _source,
    { origin }: { origin?: string | null },
    context,
  ) => {
    const workspace = await context.store.workspaceByOrigin(
      origin ?? new URL(context.request.url).origin,
    );
    if (!workspace)
      throw apiError('Workspace not found', 'NOT_FOUND', 'WORKSPACE_NOT_FOUND');
    return {
      id: workspace.id,
      displayName: workspace.displayName,
      logo: workspace.logo,
      workspaceUrls: workspaceUrls(workspace),
      authProviders: oauthProviders(context.env),
      authBypassProviders: { google: false, microsoft: false, password: false },
    };
  },
  getInviteSuggestions: async (_source, _arguments, context) => {
    await requireWorkspace(context);
    return [];
  },
  currentUserSessions: async (_source, _arguments, context) => {
    const auth = await context.requireAuth();
    const sessions = await context.env.CORE_DB.prepare(
      'SELECT "session"."id", "membership"."workspaceId", "session"."authProvider", "session"."userAgent", "session"."ipAddress", "session"."country", "session"."region", "session"."city", "session"."createdAt", "session"."lastActiveAt", "session"."expiresAt" FROM "userSession" AS "session" LEFT JOIN "userWorkspace" AS "membership" ON "membership"."id" = "session"."userWorkspaceId" WHERE "session"."userId" = ? AND "session"."revokedAt" IS NULL AND "session"."expiresAt" > ? ORDER BY "session"."createdAt" DESC',
    )
      .bind(auth.userId, new Date().toISOString())
      .all<{ id: string }>();
    return sessions.results.map((session) => ({
      ...session,
      isCurrent: session.id === auth.sessionId,
      isImpersonating: false,
    }));
  },
};

export const AUTH_MUTATION_RESOLVERS: Record<string, Resolver> = {
  signUp: async (_source, input: Credentials, context) =>
    credentialsSession(context, await registerUser(context, input)),
  signIn: async (_source, input: Credentials, context) =>
    credentialsSession(
      context,
      await userFromCredentials(context, input.email, input.password),
    ),
  getLoginTokenFromCredentials: async (
    _source,
    { email, password, origin }: Credentials & { origin: string },
    context,
  ) => {
    const user = await userFromCredentials(context, email, password);
    const workspace = await context.store.workspaceByOrigin(origin);
    if (!workspace || !(await context.store.membership(user.id, workspace.id)))
      throw apiError('Workspace not found', 'NOT_FOUND', 'WORKSPACE_NOT_FOUND');
    return {
      loginToken: await createLoginToken(context, user.id, workspace.id),
    };
  },
  getAuthTokensFromLoginToken: async (
    _source,
    { loginToken, origin }: { loginToken: string; origin: string },
    context,
  ) => {
    await limitAuthentication(context);
    return exchangeLoginToken(context, loginToken, origin);
  },
  signUpInNewWorkspace: (
    _source,
    { input }: { input?: { displayName?: string } | null },
    context,
  ) => createWorkspace(context, input?.displayName),
  signUpInWorkspace: async (
    _source,
    input: Credentials & {
      workspaceId?: string;
      workspaceInviteHash?: string;
      workspacePersonalInviteToken?: string;
    },
    context,
  ) => {
    if (input.workspacePersonalInviteToken)
      return acceptWorkspaceInvitation(context, {
        ...input,
        workspacePersonalInviteToken: input.workspacePersonalInviteToken,
      });
    const workspace = await context.store.workspaceByOrigin(
      new URL(context.request.url).origin,
    );
    if (
      !workspace ||
      (input.workspaceId && input.workspaceId !== workspace.id) ||
      !workspace.isPublicInviteLinkEnabled ||
      !input.workspaceInviteHash ||
      input.workspaceInviteHash !== workspace.inviteHash ||
      workspace.activationStatus !== 'ACTIVE'
    )
      throw apiError('Invalid workspace invitation', 'FORBIDDEN');
    const user = await registerUser(context, input, true);
    const membership = {
      id: crypto.randomUUID(),
      userId: user.id,
      workspaceId: workspace.id,
      workspaceMemberId: crypto.randomUUID(),
      profilePending: 1,
      inviteTeamPending: 0,
      previousOnboardingStatus: null,
      createdAt: new Date().toISOString(),
    };
    await context.env.CORE_DB.prepare(
      'INSERT INTO "userWorkspace" ("id", "userId", "workspaceId", "workspaceMemberId", "createdAt") VALUES (?, ?, ?, ?, ?)',
    )
      .bind(
        membership.id,
        user.id,
        workspace.id,
        membership.workspaceMemberId,
        membership.createdAt,
      )
      .run();
    await context
      .workspace(workspace.id)
      .addWorkspaceMember(memberInput(user, membership));
    return {
      loginToken: await createLoginToken(context, user.id, workspace.id),
      workspace: { id: workspace.id, workspaceUrls: workspaceUrls(workspace) },
    };
  },
  activateWorkspace: (_source, _arguments, context) =>
    activateWorkspace(context),
  updateWorkspaceMemberSettings: (
    _source,
    { input }: { input: { workspaceMemberId: string; update: unknown } },
    context,
  ) => updateProfile(context, input.workspaceMemberId, input.update),
  skipSyncEmailOnboardingStep: async (_source, _arguments, context) => {
    await requireWorkspace(context);
    return { success: true };
  },
  sendInvitations: async (
    _source,
    { emails, roleId }: { emails: string[]; roleId?: string },
    context,
  ) => {
    const { membership } = await requireWorkspace(context);
    if (emails.length > 0)
      return sendWorkspaceInvitations(context, emails, roleId);
    if (membership.profilePending)
      throw apiError('Complete your profile first');
    await context.env.CORE_DB.prepare(
      'UPDATE "userWorkspace" SET "inviteTeamPending" = 0, "previousOnboardingStatus" = CASE WHEN "inviteTeamPending" = 1 THEN ? ELSE "previousOnboardingStatus" END WHERE "id" = ?',
    )
      .bind('INVITE_TEAM', membership.id)
      .run();
    return { success: true, errors: [], result: [] };
  },
  goBackToPreviousOnboardingStep: async (_source, _arguments, context) => {
    const { workspace, membership } = await requireWorkspace(context);
    const previous = membership.previousOnboardingStatus;
    if (
      workspace.activationStatus !== 'ACTIVE' ||
      !['PROFILE_CREATION', 'INVITE_TEAM'].includes(previous ?? '')
    )
      throw apiError(
        'No previous onboarding step',
        'BAD_USER_INPUT',
        'NO_PREVIOUS_ONBOARDING_STEP',
      );
    const previousOnboardingStatus =
      previous === 'INVITE_TEAM' ? 'PROFILE_CREATION' : null;
    await context.env.CORE_DB.prepare(
      'UPDATE "userWorkspace" SET "profilePending" = ?, "inviteTeamPending" = ?, "previousOnboardingStatus" = ? WHERE "id" = ?',
    )
      .bind(
        Number(previous === 'PROFILE_CREATION'),
        Number(workspace.creatorUserId === membership.userId),
        previousOnboardingStatus,
        membership.id,
      )
      .run();
    return { onboardingStatus: previous, previousOnboardingStatus };
  },
  signOut: async (
    _source,
    { refreshToken }: { refreshToken?: string | null },
    context,
  ) => {
    const auth = await context.requireAuth().catch((error: unknown) => {
      if (
        error instanceof GraphQLError &&
        error.extensions.code === 'UNAUTHENTICATED'
      )
        return null;
      throw error;
    });
    if (!auth && refreshToken) {
      const claims = await verifyToken(
        context.env.APP_SECRET,
        'refresh',
        refreshToken,
      ).catch(() => null);
      if (claims?.sessionId) {
        await context.env.CORE_DB.prepare(
          'UPDATE "userSession" SET "revokedAt" = ? WHERE "id" = ? AND "userId" = ?',
        )
          .bind(new Date().toISOString(), claims.sessionId, claims.sub)
          .run();
      }
    }
    if (auth)
      await context.env.CORE_DB.prepare(
        'UPDATE "userSession" SET "revokedAt" = ? WHERE "id" = ?',
      )
        .bind(new Date().toISOString(), auth.sessionId)
        .run();
    clearSessionCookies(context.responseHeaders);
    return true;
  },
  revokeUserSession: async (
    _source,
    { userSessionId }: { userSessionId: string },
    context,
  ) => {
    const auth = await context.requireAuth();
    await context.env.CORE_DB.prepare(
      'UPDATE "userSession" SET "revokedAt" = ? WHERE "id" = ? AND "userId" = ?',
    )
      .bind(new Date().toISOString(), userSessionId, auth.userId)
      .run();
    return true;
  },
};
