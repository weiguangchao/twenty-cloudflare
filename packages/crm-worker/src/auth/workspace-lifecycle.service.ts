import { createLoginToken } from '@/auth/login-token.service';
import { randomToken } from '@/auth/token.service';
import {
  type UserRow,
  type UserWorkspaceRow,
  type WorkspaceRow,
} from '@/core-db/types/core-rows.type';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError, unauthenticated } from '@/shared/errors/api-error.util';

export const workspaceUrls = (workspace: Pick<WorkspaceRow, 'origin'>) => ({
  subdomainUrl: `${workspace.origin}/`,
  customUrl: null,
});

export const memberInput = (user: UserRow, membership: UserWorkspaceRow) => ({
  userId: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  locale: user.locale,
  userWorkspaceId: membership.id,
  workspaceMemberId: membership.workspaceMemberId,
});

export const requireWorkspace = async (context: MetadataContext) => {
  const auth = await context.requireAuth();
  if (!(await context.store.userById(auth.userId))?.isEmailVerified)
    throw apiError(
      'Verify your email address first',
      'FORBIDDEN',
      'EMAIL_NOT_VERIFIED',
    );
  if (!auth.workspaceId)
    throw unauthenticated('A workspace session is required');
  const workspace = await context.store.workspaceById(auth.workspaceId);
  const membership = await context.store.membership(
    auth.userId,
    auth.workspaceId,
  );
  if (!workspace || !membership) throw unauthenticated();

  return { auth, workspace, membership };
};

export const availableWorkspaces = async (
  context: MetadataContext,
  userId: string,
) => ({
  availableWorkspacesForSignIn: await Promise.all(
    (await context.store.workspacesForUser(userId)).map(async (workspace) => ({
      ...workspace,
      workspaceUrls: workspaceUrls(workspace),
      loginToken: (await createLoginToken(context, userId, workspace.id)).token,
      sso: [],
    })),
  ),
  availableWorkspacesForSignUp: [],
});

const signUpResult = async (
  context: MetadataContext,
  userId: string,
  workspace: WorkspaceRow,
) => ({
  loginToken: await createLoginToken(context, userId, workspace.id),
  workspace: { id: workspace.id, workspaceUrls: workspaceUrls(workspace) },
});

export const createWorkspace = async (
  context: MetadataContext,
  displayName?: string | null,
) => {
  const auth = await context.requireAuth();
  if (!(await context.store.userById(auth.userId))?.isEmailVerified)
    throw apiError(
      'Verify your email address first',
      'FORBIDDEN',
      'EMAIL_NOT_VERIFIED',
    );
  const origin = new URL(context.request.url).origin;
  const existing = await context.store.workspaceByOrigin(origin);
  if (existing?.creatorUserId === auth.userId)
    return signUpResult(context, auth.userId, existing);
  if (
    await context.env.CORE_DB.prepare(
      'SELECT "id" FROM "workspace" LIMIT 1',
    ).first()
  )
    throw apiError(
      'New workspace setup is disabled',
      'FORBIDDEN',
      'SIGNUP_DISABLED',
    );
  const name = displayName?.trim() || 'My Workspace';
  if (name.length > 255) throw apiError('Workspace name is too long');
  const workspaceId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await context.env.CORE_DB.batch([
      context.env.CORE_DB.prepare(
        'INSERT INTO "workspace" ("id", "displayName", "origin", "singleWorkspaceKey", "inviteHash", "creatorUserId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        workspaceId,
        name,
        origin,
        'single',
        randomToken(),
        auth.userId,
        now,
        now,
      ),
      context.env.CORE_DB.prepare(
        'INSERT INTO "userWorkspace" ("id", "userId", "workspaceId", "workspaceMemberId", "inviteTeamPending", "createdAt") VALUES (?, ?, ?, ?, 1, ?)',
      ).bind(
        crypto.randomUUID(),
        auth.userId,
        workspaceId,
        crypto.randomUUID(),
        now,
      ),
    ]);
  } catch (error) {
    const workspace = await context.store.workspaceByOrigin(origin);
    if (workspace?.creatorUserId === auth.userId)
      return signUpResult(context, auth.userId, workspace);
    if (
      await context.env.CORE_DB.prepare(
        'SELECT "id" FROM "workspace" LIMIT 1',
      ).first()
    )
      throw apiError(
        'New workspace setup is disabled',
        'FORBIDDEN',
        'SIGNUP_DISABLED',
      );
    throw error;
  }

  return signUpResult(
    context,
    auth.userId,
    (await context.store.workspaceById(workspaceId))!,
  );
};

export const activateWorkspace = async (context: MetadataContext) => {
  const { auth, workspace, membership } = await requireWorkspace(context);
  if (workspace.creatorUserId !== auth.userId)
    throw apiError('Only the workspace creator can activate it', 'FORBIDDEN');
  if (workspace.activationStatus === 'ACTIVE') return workspace;
  const now = new Date().toISOString();
  const locked = await context.env.CORE_DB.prepare(
    'UPDATE "workspace" SET "activationStatus" = ?, "updatedAt" = ? WHERE "id" = ? AND ("activationStatus" = ? OR ("activationStatus" = ? AND "updatedAt" < ?))',
  )
    .bind(
      'ONGOING_CREATION',
      now,
      workspace.id,
      'PENDING_CREATION',
      'ONGOING_CREATION',
      new Date(Date.now() - 120_000).toISOString(),
    )
    .run();
  if (locked.meta.changes !== 1)
    throw apiError('Workspace is already being created', 'CONFLICT');

  try {
    const user = (await context.store.userById(auth.userId))!;
    const { defaultRoleId } = await context
      .workspace(workspace.id)
      .activateWorkspace(memberInput(user, membership));
    await context.env.CORE_DB.prepare(
      'UPDATE "workspace" SET "activationStatus" = ?, "defaultRoleId" = ?, "updatedAt" = ? WHERE "id" = ? AND "updatedAt" = ?',
    )
      .bind(
        'ACTIVE',
        defaultRoleId,
        new Date().toISOString(),
        workspace.id,
        now,
      )
      .run();
  } catch (error) {
    await context.env.CORE_DB.prepare(
      'UPDATE "workspace" SET "activationStatus" = ? WHERE "id" = ? AND "updatedAt" = ?',
    )
      .bind('PENDING_CREATION', workspace.id, now)
      .run();
    throw error;
  }

  return (await context.store.workspaceById(workspace.id))!;
};
