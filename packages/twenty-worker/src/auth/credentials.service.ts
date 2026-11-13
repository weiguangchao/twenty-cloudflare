import { sendVerificationEmail } from '@/auth/email-action.service';
import { requireEmailSending } from '@/emails/email-delivery.service';
import { emailSchema } from 'twenty-shared/utils';

import { hashPassword, verifyPassword } from '@/auth/password.util';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';

export const normalizeEmail = (email: string) => {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !emailSchema.safeParse(normalized).success)
    throw apiError('Invalid email address');
  return normalized;
};

export const limitAuthentication = async (
  context: MetadataContext,
  email?: string,
) => {
  const keys = [
    `ip:${context.request.headers.get('cf-connecting-ip') ?? 'local'}`,
    ...(email ? [`email:${email}`] : []),
  ];

  for (const key of keys) {
    if (!(await context.env.AUTH_RATE_LIMITER.limit({ key })).success) {
      throw apiError(
        'Too many authentication attempts. Please try again later.',
        'TOO_MANY_REQUESTS',
      );
    }
  }
};

export const userFromCredentials = async (
  context: MetadataContext,
  email: string,
  password: string,
) => {
  const normalized = normalizeEmail(email);
  await limitAuthentication(context, normalized);
  const user = await context.store.userByEmail(normalized);
  if (!user)
    throw apiError('User not found', 'UNAUTHENTICATED', 'USER_NOT_FOUND');
  if (
    password.length > 50 ||
    !(await verifyPassword(password, user.passwordHash)) ||
    user.disabled
  ) {
    throw apiError('Wrong password', 'FORBIDDEN', 'FORBIDDEN_EXCEPTION');
  }
  return user;
};

export const registerUser = async (
  context: MetadataContext,
  input: { email: string; password: string; locale?: string | null },
  inWorkspace = false,
) => {
  const email = normalizeEmail(input.email);
  await limitAuthentication(context, email);
  if (await context.store.userByEmail(email))
    throw apiError('User already exists', 'FORBIDDEN', 'USER_ALREADY_EXISTS');
  if (
    !inWorkspace &&
    (await context.env.CORE_DB.prepare(
      'SELECT "id" FROM "workspace" LIMIT 1',
    ).first())
  ) {
    throw apiError(
      'New workspace setup is disabled',
      'FORBIDDEN',
      'SIGNUP_DISABLED',
    );
  }

  if (context.env.EMAIL_VERIFICATION_REQUIRED === 'true')
    requireEmailSending(context.env);
  const passwordHash = await hashPassword(input.password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await context.env.CORE_DB.prepare(
      'INSERT INTO "user" ("id", "email", "passwordHash", "locale", "isEmailVerified", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        id,
        email,
        passwordHash,
        input.locale || 'en',
        Number(context.env.EMAIL_VERIFICATION_REQUIRED !== 'true'),
        now,
        now,
      )
      .run();
  } catch (error) {
    if (await context.store.userByEmail(email))
      throw apiError('User already exists', 'FORBIDDEN', 'USER_ALREADY_EXISTS');
    throw error;
  }

  const user = (await context.store.userById(id))!;
  if (!user.isEmailVerified) await sendVerificationEmail(context, user);
  return user;
};
