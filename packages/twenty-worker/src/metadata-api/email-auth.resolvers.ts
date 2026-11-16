import { type GraphQLFieldResolver } from 'graphql';

import {
  emailPasswordResetLink,
  readEmailAction,
  resetPassword,
  sendVerificationEmail,
  verifyEmailAction,
} from '@/auth/email-action.service';
import { credentialsSession } from '@/metadata-api/auth.resolvers';
import { createLoginToken } from '@/auth/login-token.service';
import { workspaceUrls } from '@/auth/workspace-lifecycle.service';
import {
  normalizeEmail,
  limitAuthentication,
} from '@/auth/credentials.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';

type Resolver = GraphQLFieldResolver<unknown, MetadataContext>;

export const EMAIL_AUTH_QUERY_RESOLVERS: Record<string, Resolver> = {
  validatePasswordResetToken: async (
    _source,
    { passwordResetToken }: { passwordResetToken: string },
    context,
  ) => {
    await limitAuthentication(context);
    const { user } = await readEmailAction(
      context,
      passwordResetToken,
      'password-reset',
    );
    return {
      id: user.id,
      email: user.email,
      hasPassword: Boolean(user.passwordHash),
    };
  },
};

export const EMAIL_AUTH_MUTATION_RESOLVERS: Record<string, Resolver> = {
  emailPasswordResetLink: (
    _source,
    { email, captchaToken }: { email: string; captchaToken?: string | null },
    context,
  ) => emailPasswordResetLink(context, email, captchaToken),
  updatePasswordViaResetToken: (
    _source,
    {
      passwordResetToken,
      newPassword,
    }: { passwordResetToken: string; newPassword: string },
    context,
  ) => resetPassword(context, passwordResetToken, newPassword),
  resendEmailVerificationToken: async (
    _source,
    { email, origin }: { email: string; origin: string },
    context,
  ) => {
    if (origin !== new URL(context.request.url).origin)
      throw apiError('Invalid origin', 'FORBIDDEN');
    const normalized = normalizeEmail(email);
    await limitAuthentication(context, normalized);
    const user = await context.store.userByEmail(normalized);
    if (user && !user.disabled && !user.isEmailVerified)
      await sendVerificationEmail(context, user);
    return { success: true };
  },
  verifyEmailAndGetLoginToken: async (
    _source,
    {
      emailVerificationToken,
      email,
      origin,
    }: { emailVerificationToken: string; email: string; origin: string },
    context,
  ) => {
    const workspace = await context.store.workspaceByOrigin(origin);
    if (!workspace || origin !== new URL(context.request.url).origin)
      throw apiError('Workspace not found', 'NOT_FOUND');
    const user = await verifyEmailAction(
      context,
      emailVerificationToken,
      email,
    );
    if (!(await context.store.membership(user.id, workspace.id)))
      throw apiError('Workspace access denied', 'FORBIDDEN');
    return {
      loginToken: await createLoginToken(context, user.id, workspace.id),
      workspaceUrls: workspaceUrls(workspace),
    };
  },
  verifyEmailAndGetWorkspaceAgnosticToken: async (
    _source,
    {
      emailVerificationToken,
      email,
    }: { emailVerificationToken: string; email: string },
    context,
  ) =>
    credentialsSession(
      context,
      await verifyEmailAction(context, emailVerificationToken, email),
    ),
};
