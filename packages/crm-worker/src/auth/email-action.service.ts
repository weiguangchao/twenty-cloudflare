import {
  normalizeEmail,
  limitAuthentication,
} from '@/auth/credentials.service';
import { type OAuthBinding } from '@/auth/oauth/oauth-provider.util';
import { hashToken, randomToken } from '@/auth/token.service';
import { hashPassword } from '@/auth/password.util';
import {
  enqueueEmail,
  requireEmailSending,
} from '@/emails/email-delivery.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';
import { type UserRow } from '@/core-db/types/core-rows.type';
import { isSafeInternalPath } from 'crm-shared/utils';

type EmailAction = { userId: string; type: string; payload: string };

export const issueEmailAction = async (
  context: MetadataContext,
  userId: string,
  type: 'password-reset' | 'email-verification',
  payload: { email: string; origin: string; oauth?: OAuthBinding },
) => {
  const token = randomToken();
  const expiresAt = Date.now() + 60 * 60 * 1000;
  await context.env.CORE_DB.batch([
    context.env.CORE_DB.prepare(
      'DELETE FROM "appToken" WHERE "userId" = ? AND "type" = ?',
    ).bind(userId, type),
    context.env.CORE_DB.prepare(
      'INSERT INTO "appToken" ("id", "tokenHash", "type", "userId", "payload", "expiresAt", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      crypto.randomUUID(),
      await hashToken(token),
      type,
      userId,
      JSON.stringify(payload),
      new Date(expiresAt).toISOString(),
      new Date().toISOString(),
    ),
  ]);
  return { token, expiresAt };
};

export const readEmailAction = async (
  context: MetadataContext,
  token: string,
  type: string,
) => {
  if (token.length > 256)
    throw apiError('Invalid or expired email link', 'UNAUTHENTICATED');
  const action = await context.env.CORE_DB.prepare(
    'SELECT "userId", "type", "payload" FROM "appToken" WHERE "tokenHash" = ? AND "type" = ? AND "expiresAt" > ?',
  )
    .bind(await hashToken(token), type, new Date().toISOString())
    .first<EmailAction>();
  const user = action ? await context.store.userById(action.userId) : null;
  if (!action || !user || user.disabled)
    throw apiError('Invalid or expired email link', 'UNAUTHENTICATED');
  const payload = JSON.parse(action.payload) as {
    email: string;
    origin: string;
    oauth?: OAuthBinding;
  };
  if (payload.origin !== new URL(context.request.url).origin)
    throw apiError('Invalid email link origin', 'FORBIDDEN');
  return { action, user, payload };
};

export const sendVerificationEmail = async (
  context: MetadataContext,
  user: UserRow,
  nextPath?: string | null,
  newEmail?: string,
  oauth?: OAuthBinding,
) => {
  requireEmailSending(context.env);
  const email = newEmail ? normalizeEmail(newEmail) : user.email;
  const origin = new URL(context.request.url).origin;
  const { token, expiresAt } = await issueEmailAction(
    context,
    user.id,
    'email-verification',
    { email, origin, oauth },
  );
  const url = new URL('/verify-email', origin);
  url.searchParams.set('email', email);
  url.searchParams.set('emailVerificationToken', token);
  if (nextPath?.startsWith('/') && isSafeInternalPath(nextPath)) {
    url.searchParams.set('nextPath', nextPath);
    url.searchParams.set('returnToPath', nextPath);
  }
  await enqueueEmail(
    context.env,
    {
      template: 'email-verification',
      to: email,
      locale: user.locale,
      link: url.href,
      isEmailUpdate: Boolean(newEmail),
    },
    expiresAt,
  );
};

export const emailPasswordResetLink = async (
  context: MetadataContext,
  email: string,
) => {
  requireEmailSending(context.env);
  const normalized = normalizeEmail(email);
  await limitAuthentication(context, normalized);
  const user = await context.store.userByEmail(normalized);
  if (user && !user.disabled) {
    const origin = new URL(context.request.url).origin;
    const { token, expiresAt } = await issueEmailAction(
      context,
      user.id,
      'password-reset',
      { email: normalized, origin },
    );
    await enqueueEmail(
      context.env,
      {
        template: 'password-reset',
        to: normalized,
        locale: user.locale,
        hasPassword: Boolean(user.passwordHash),
        link: new URL(`/reset-password/${token}`, origin).href,
      },
      expiresAt,
    );
  }
  return { success: true };
};

export const resetPassword = async (
  context: MetadataContext,
  token: string,
  password: string,
) => {
  await limitAuthentication(context);
  const { user } = await readEmailAction(context, token, 'password-reset');
  const passwordHash = await hashPassword(password);
  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();
  const results = await context.env.CORE_DB.batch([
    context.env.CORE_DB.prepare(
      'UPDATE "user" SET "passwordHash" = ?, "updatedAt" = ? WHERE "id" = ? AND EXISTS (SELECT 1 FROM "appToken" WHERE "tokenHash" = ? AND "type" = \'password-reset\' AND "expiresAt" > ?)',
    ).bind(passwordHash, now, user.id, tokenHash, now),
    context.env.CORE_DB.prepare(
      'DELETE FROM "appToken" WHERE "tokenHash" = ? AND "type" = \'password-reset\' RETURNING "id"',
    ).bind(tokenHash),
    context.env.CORE_DB.prepare(
      'UPDATE "userSession" SET "revokedAt" = ? WHERE "userId" = ?',
    ).bind(now, user.id),
  ]);
  if (results[0].meta.changes !== 1)
    throw apiError('Email link has already been used', 'UNAUTHENTICATED');
  return { success: true };
};

export const verifyEmailAction = async (
  context: MetadataContext,
  token: string,
  email: string,
) => {
  await limitAuthentication(context);
  const { user, payload } = await readEmailAction(
    context,
    token,
    'email-verification',
  );
  if (normalizeEmail(email) !== payload.email)
    throw apiError('Email does not match verification link', 'FORBIDDEN');
  const existing = await context.store.userByEmail(payload.email);
  if (existing && existing.id !== user.id)
    throw apiError('Email is already in use', 'CONFLICT');
  if (payload.oauth) {
    const identity = await context.env.CORE_DB.prepare(
      'SELECT "userId" FROM "oauthIdentity" WHERE "provider" = ? AND "issuer" = ? AND "subject" = ?',
    )
      .bind(payload.oauth.provider, payload.oauth.issuer, payload.oauth.subject)
      .first<{ userId: string }>();
    if (identity && identity.userId !== user.id)
      throw apiError('Login identity is already linked', 'CONFLICT');
  }
  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();
  const results = await context.env.CORE_DB.batch([
    ...(payload.oauth
      ? [
          context.env.CORE_DB.prepare(
            'INSERT INTO "oauthIdentity" ("provider", "issuer", "subject", "userId") SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM "appToken" WHERE "tokenHash" = ? AND "type" = \'email-verification\' AND "expiresAt" > ?) ON CONFLICT ("provider", "issuer", "subject") DO NOTHING',
          ).bind(
            payload.oauth.provider,
            payload.oauth.issuer,
            payload.oauth.subject,
            user.id,
            tokenHash,
            now,
          ),
        ]
      : []),
    context.env.CORE_DB.prepare(
      'UPDATE "user" SET "email" = ?, "isEmailVerified" = 1, "updatedAt" = ? WHERE "id" = ? AND EXISTS (SELECT 1 FROM "appToken" WHERE "tokenHash" = ? AND "type" = \'email-verification\' AND "expiresAt" > ?)',
    ).bind(payload.email, now, user.id, tokenHash, now),
    context.env.CORE_DB.prepare(
      'DELETE FROM "appToken" WHERE "tokenHash" = ? AND "type" = \'email-verification\'',
    ).bind(tokenHash),
  ]);
  if (results[payload.oauth ? 1 : 0].meta.changes !== 1)
    throw apiError('Email link has already been used', 'UNAUTHENTICATED');
  return (await context.store.userById(user.id))!;
};
