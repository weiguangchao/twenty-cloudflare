import {
  normalizeEmail,
  registerUser,
  userFromCredentials,
} from '@/auth/credentials.service';
import { hashToken, randomToken } from '@/auth/token.service';
import { createLoginToken } from '@/auth/login-token.service';
import { memberInput, workspaceUrls } from '@/auth/workspace-lifecycle.service';
import {
  enqueueEmail,
  requireEmailSending,
} from '@/emails/email-delivery.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';

export type WorkspaceInvitation = {
  id: string;
  workspaceId: string;
  email: string;
  roleId: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdByUserId: string;
};

export const requireInvitationManagement = async (context: MetadataContext) => {
  const data = await context.requireMetadata();
  if (!data.permissions.permissionFlags.includes('WORKSPACE_MEMBERS'))
    throw apiError('Permission denied', 'FORBIDDEN');
  return data;
};

export const sendWorkspaceInvitations = async (
  context: MetadataContext,
  emails: string[],
  roleId?: string | null,
) => {
  requireEmailSending(context.env);
  const data = await requireInvitationManagement(context);
  if (emails.length > 50)
    throw apiError('At most 50 invitations can be sent at once');
  if (
    roleId &&
    (!data.permissions.permissionFlags.includes('ROLES') ||
      !data.tables.role.some((role) => role.id === roleId))
  )
    throw apiError('Role assignment is not allowed', 'FORBIDDEN');
  const sender = (await context.store.userById(
    (await context.requireAuth()).userId,
  ))!;
  const result: WorkspaceInvitation[] = [];
  for (const email of new Set(emails.map(normalizeEmail))) {
    const existing = await context.store.userByEmail(email);
    if (
      existing &&
      (await context.store.membership(existing.id, data.workspace.id))
    )
      continue;
    const token = randomToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const invitation = await context.env.CORE_DB.prepare(
      'INSERT INTO "workspaceInvitation" ("id", "workspaceId", "email", "tokenHash", "roleId", "expiresAt", "createdByUserId") VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT ("workspaceId", "email") DO UPDATE SET "tokenHash" = excluded."tokenHash", "roleId" = excluded."roleId", "expiresAt" = excluded."expiresAt", "acceptedAt" = NULL, "createdByUserId" = excluded."createdByUserId" RETURNING "id", "workspaceId", "email", "roleId", "expiresAt", "acceptedAt", "createdByUserId"',
    )
      .bind(
        crypto.randomUUID(),
        data.workspace.id,
        email,
        await hashToken(token),
        roleId ?? null,
        new Date(expiresAt).toISOString(),
        sender.id,
      )
      .first<WorkspaceInvitation>();
    const link = new URL('/welcome', data.workspace.origin);
    link.searchParams.set('inviteToken', token);
    await enqueueEmail(
      context.env,
      {
        template: 'invitation',
        to: email,
        locale: sender.locale,
        link: link.href,
        sender: {
          email: sender.email,
          firstName: sender.firstName,
          lastName: sender.lastName,
        },
        workspace: {
          name: data.workspace.displayName,
          logo: data.workspace.logo ?? undefined,
        },
        serverUrl: data.workspace.origin,
      },
      expiresAt,
    );
    result.push(invitation!);
  }
  return { success: true, errors: [], result };
};

export const invitationFromToken = async (
  context: MetadataContext,
  token: string,
) => {
  if (token.length > 256)
    throw apiError('Invalid workspace invitation', 'FORBIDDEN');
  const invitation = await context.env.CORE_DB.prepare(
    'SELECT * FROM "workspaceInvitation" WHERE "tokenHash" = ? AND "acceptedAt" IS NULL AND "expiresAt" > ?',
  )
    .bind(await hashToken(token), new Date().toISOString())
    .first<WorkspaceInvitation>();
  const workspace = invitation
    ? await context.store.workspaceById(invitation.workspaceId)
    : null;
  if (
    !invitation ||
    !workspace ||
    workspace.activationStatus !== 'ACTIVE' ||
    workspace.origin !== new URL(context.request.url).origin
  )
    throw apiError('Invalid workspace invitation', 'FORBIDDEN');
  return { invitation, workspace };
};

export const acceptWorkspaceInvitation = async (
  context: MetadataContext,
  input: {
    email: string;
    password: string;
    locale?: string | null;
    workspacePersonalInviteToken: string;
    captchaToken?: string | null;
  },
) => {
  const { invitation, workspace } = await invitationFromToken(
    context,
    input.workspacePersonalInviteToken,
  );
  if (normalizeEmail(input.email) !== invitation.email)
    throw apiError('Email does not match invitation', 'FORBIDDEN');
  let user = await context.store.userByEmail(invitation.email);
  if (user)
    user = await userFromCredentials(context, input.email, input.password);
  else user = await registerUser(context, input, true);
  let membership = await context.store.membership(user.id, workspace.id);
  if (!membership) {
    const now = new Date().toISOString();
    membership = await context.env.CORE_DB.prepare(
      'INSERT INTO "userWorkspace" ("id", "userId", "workspaceId", "workspaceMemberId", "createdAt") VALUES (?, ?, ?, ?, ?) ON CONFLICT ("userId", "workspaceId") DO UPDATE SET "userId" = excluded."userId" RETURNING *',
    )
      .bind(
        crypto.randomUUID(),
        user.id,
        workspace.id,
        crypto.randomUUID(),
        now,
      )
      .first();
  }
  await context.workspace(workspace.id).addWorkspaceMember({
    ...memberInput(user, membership!),
    roleId: invitation.roleId ?? undefined,
  });
  await context.env.CORE_DB.batch([
    context.env.CORE_DB.prepare(
      'UPDATE "workspaceInvitation" SET "acceptedAt" = ? WHERE "id" = ? AND "tokenHash" = ?',
    ).bind(
      new Date().toISOString(),
      invitation.id,
      await hashToken(input.workspacePersonalInviteToken),
    ),
    context.env.CORE_DB.prepare(
      'UPDATE "user" SET "isEmailVerified" = 1 WHERE "id" = ?',
    ).bind(user.id),
  ]);
  return {
    loginToken: await createLoginToken(context, user.id, workspace.id),
    workspace: { id: workspace.id, workspaceUrls: workspaceUrls(workspace) },
  };
};
