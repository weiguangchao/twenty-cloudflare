import { setupI18n } from '@lingui/core';
import { parse, serialize } from 'hono/utils/cookie';
import { GraphQLError } from 'graphql';
import { isPlainObject, isSafeInternalPath } from 'twenty-shared/utils';

import { hashToken, randomToken } from '@/auth/token.service';
import { authenticateRequest, createSession } from '@/auth/session.service';
import {
  normalizeEmail,
  limitAuthentication,
} from '@/auth/credentials.service';
import { createLoginToken } from '@/auth/login-token.service';
import { memberInput } from '@/auth/workspace-lifecycle.service';
import { sendVerificationEmail } from '@/auth/email-action.service';
import { invitationFromToken } from '@/auth/workspace-invitation.service';
import {
  oauthProvider,
  type OAuthBinding,
} from '@/auth/oauth/oauth-provider.util';
import { verifyProviderToken } from '@/auth/oauth/verify-provider-token.util';
import { createMetadataContext } from '@/metadata-api/create-metadata-context.util';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';
import {
  type UserRow,
  type UserWorkspaceRow,
} from '@/core-db/types/core-rows.type';

type OAuthState = {
  provider: string;
  nonce: string;
  verifier: string;
  origin: string;
  invitationToken: string | null;
  inviteHash: string | null;
  linkUserId: string | null;
  returnToPath: string | null;
};
const cookieName = (url: URL) =>
  url.protocol === 'https:' ? '__Host-twenty-oauth' : 'twenty-oauth';

const joinOAuthWorkspace = async (
  context: MetadataContext,
  user: UserRow,
  saved: OAuthState,
  invitation: Awaited<ReturnType<typeof invitationFromToken>> | undefined,
) => {
  if (invitation && invitation.invitation.email !== user.email)
    throw apiError('Email does not match invitation', 'FORBIDDEN');
  const workspace = await context.store.workspaceByOrigin(saved.origin);
  let membership = workspace
    ? await context.store.membership(user.id, workspace.id)
    : null;
  if (workspace && !membership) {
    if (
      !invitation &&
      (!workspace.isPublicInviteLinkEnabled ||
        workspace.inviteHash !== saved.inviteHash)
    )
      throw apiError('A workspace invitation is required', 'FORBIDDEN');
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
      .first<UserWorkspaceRow>();
    await context.workspace(workspace.id).addWorkspaceMember({
      ...memberInput(user, membership!),
      roleId: invitation?.invitation.roleId ?? undefined,
    });
    if (invitation)
      await context.env.CORE_DB.prepare(
        'UPDATE "workspaceInvitation" SET "acceptedAt" = ? WHERE "id" = ?',
      )
        .bind(now, invitation.invitation.id)
        .run();
  }
  return { workspace, membership };
};

const startOAuth = async (
  context: MetadataContext,
  provider: ReturnType<typeof oauthProvider>,
) => {
  await limitAuthentication(context);
  const url = new URL(context.request.url);
  const state = randomToken();
  const verifier = randomToken();
  const nonce = randomToken();
  const current = await authenticateRequest(
    new Request(context.request, {
      headers: {
        ...Object.fromEntries(context.request.headers),
        'x-twenty-session-cookie': '1',
      },
    }),
    context.env,
  ).catch(() => null);
  const invitationToken = url.searchParams.get('inviteToken');
  const inviteHash = url.searchParams.get('workspaceInviteHash');
  const returnToPath = url.searchParams.get('returnToPath');
  if ((invitationToken?.length ?? 0) > 256 || (inviteHash?.length ?? 0) > 256)
    throw apiError('Invalid invitation');
  await context.env.CORE_DB.prepare(
    'INSERT INTO "oauthState" ("stateHash", "provider", "nonce", "verifier", "origin", "invitationToken", "inviteHash", "linkUserId", "expiresAt", "returnToPath") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      await hashToken(state),
      provider.name,
      nonce,
      verifier,
      url.origin,
      invitationToken,
      inviteHash,
      current?.userId ?? null,
      new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      returnToPath &&
        returnToPath.length <= 4096 &&
        isSafeInternalPath(returnToPath)
        ? returnToPath
        : null,
    )
    .run();
  context.responseHeaders.append(
    'set-cookie',
    serialize(cookieName(url), state, {
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'Lax',
      path: '/',
      maxAge: 600,
    }),
  );
  const authorization = new URL(provider.authorizationUrl);
  for (const [key, value] of Object.entries({
    client_id: provider.clientId,
    redirect_uri: `${url.origin}/auth/${provider.name}/redirect`,
    response_type: 'code',
    response_mode: 'query',
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: await hashToken(verifier),
    code_challenge_method: 'S256',
  }))
    authorization.searchParams.set(key, value);
  return new Response(null, {
    status: 302,
    headers: { location: authorization.href },
  });
};

const finishOAuth = async (
  context: MetadataContext,
  provider: ReturnType<typeof oauthProvider>,
) => {
  const url = new URL(context.request.url);
  const state = url.searchParams.get('state');
  const cookie = parse(context.request.headers.get('cookie') ?? '')[
    cookieName(url)
  ];
  context.responseHeaders.append(
    'set-cookie',
    serialize(cookieName(url), '', {
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'Lax',
      path: '/',
      maxAge: 0,
    }),
  );
  if (!state || !cookie || state !== cookie || state.length > 256)
    throw apiError('Invalid OAuth state', 'UNAUTHENTICATED');
  const saved = await context.env.CORE_DB.prepare(
    'DELETE FROM "oauthState" WHERE "stateHash" = ? AND "provider" = ? AND "origin" = ? AND "expiresAt" > ? RETURNING *',
  )
    .bind(
      await hashToken(state),
      provider.name,
      url.origin,
      new Date().toISOString(),
    )
    .first<OAuthState>();
  if (!saved)
    throw apiError('OAuth state is expired or already used', 'UNAUTHENTICATED');
  const code = url.searchParams.get('code');
  if (!code || code.length > 8192 || url.searchParams.has('error'))
    throw apiError('Login was declined or interrupted', 'UNAUTHENTICATED');
  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${url.origin}/auth/${provider.name}/redirect`,
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code_verifier: saved.verifier,
    }),
  });
  const tokens: unknown = await response.json();
  if (
    !response.ok ||
    !isPlainObject(tokens) ||
    typeof tokens.id_token !== 'string'
  )
    throw apiError('Identity provider rejected login', 'UNAUTHENTICATED');
  const claims = await verifyProviderToken(
    tokens.id_token,
    provider,
    saved.nonce,
  );
  const binding: OAuthBinding = {
    provider: provider.name,
    issuer: claims.iss!,
    subject: claims.sub!,
  };
  const linked = await context.env.CORE_DB.prepare(
    'SELECT "userId" FROM "oauthIdentity" WHERE "provider" = ? AND "issuer" = ? AND "subject" = ?',
  )
    .bind(binding.provider, binding.issuer, binding.subject)
    .first<{ userId: string }>();
  let user: UserRow | null = linked
    ? await context.store.userById(linked.userId)
    : null;
  if (user?.disabled) throw apiError('Account is disabled', 'FORBIDDEN');
  let provenEmail = Boolean(linked && user?.isEmailVerified);
  let invitation: Awaited<ReturnType<typeof invitationFromToken>> | undefined;
  if (saved.invitationToken)
    invitation = await invitationFromToken(context, saved.invitationToken);
  if (!user) {
    if (typeof claims.email !== 'string')
      throw apiError(
        'Login provider did not supply an email address',
        'FORBIDDEN',
      );
    const email = normalizeEmail(claims.email);
    if (invitation && invitation.invitation.email !== email)
      throw apiError('Email does not match invitation', 'FORBIDDEN');
    const existing = await context.store.userByEmail(email);
    provenEmail = Boolean(
      invitation ||
      (existing &&
        existing.id === saved.linkUserId &&
        existing.isEmailVerified) ||
      (provider.name === 'google' &&
        claims.email_verified === true &&
        (email.endsWith('@gmail.com') ||
          (typeof claims.hd === 'string' &&
            email.endsWith(`@${claims.hd.toLowerCase()}`)))),
    );
    if (existing) user = existing;
    else {
      const workspace = await context.store.workspaceByOrigin(url.origin);
      if (
        workspace &&
        !invitation &&
        (!workspace.isPublicInviteLinkEnabled ||
          workspace.inviteHash !== saved.inviteHash)
      )
        throw apiError('A workspace invitation is required', 'FORBIDDEN');
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await context.env.CORE_DB.prepare(
        'INSERT INTO "user" ("id", "email", "passwordHash", "firstName", "lastName", "isEmailVerified", "createdAt", "updatedAt") VALUES (?, ?, \'\', ?, ?, ?, ?, ?)',
      )
        .bind(
          id,
          email,
          typeof claims.given_name === 'string'
            ? claims.given_name.slice(0, 256)
            : '',
          typeof claims.family_name === 'string'
            ? claims.family_name.slice(0, 256)
            : '',
          Number(provenEmail),
          now,
          now,
        )
        .run();
      user = (await context.store.userById(id))!;
    }
    if (user.disabled) throw apiError('Account is disabled', 'FORBIDDEN');
    if (!provenEmail) {
      await joinOAuthWorkspace(context, user, saved, invitation);
      await sendVerificationEmail(
        context,
        user,
        saved.returnToPath,
        undefined,
        binding,
      );
      const i18n = setupI18n({ locale: 'en', messages: { en: {} } });
      const title = i18n._('Check your email');
      const instructions = i18n._(
        'Open the verification link we sent you to finish signing in to Twenty.',
      );
      return new Response(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>${title}</title><main><h1>${title}</h1><p>${instructions}</p></main></html>`,
        { headers: { 'content-type': 'text/html; charset=utf-8' } },
      );
    }
    await context.env.CORE_DB.prepare(
      'INSERT INTO "oauthIdentity" ("provider", "issuer", "subject", "userId") VALUES (?, ?, ?, ?)',
    )
      .bind(binding.provider, binding.issuer, binding.subject, user.id)
      .run();
    if (!user.isEmailVerified) {
      await context.env.CORE_DB.prepare(
        'UPDATE "user" SET "isEmailVerified" = 1 WHERE "id" = ?',
      )
        .bind(user.id)
        .run();
    }
  }
  const { workspace, membership } = await joinOAuthWorkspace(
    context,
    user,
    saved,
    invitation,
  );
  if (workspace && membership) {
    const login = await createLoginToken(
      context,
      user.id,
      workspace.id,
      provider.name,
    );
    const redirect = new URL('/verify', url.origin);
    redirect.searchParams.set('loginToken', login.token);
    if (saved.returnToPath)
      redirect.searchParams.set('returnToPath', saved.returnToPath);
    return new Response(null, {
      status: 302,
      headers: { location: redirect.href },
    });
  }
  await createSession(
    context.env,
    context.request,
    context.responseHeaders,
    user.id,
    null,
    null,
    provider.name,
  );
  return new Response(null, {
    status: 302,
    headers: { location: new URL('/welcome', url.origin).href },
  });
};

export const handleOAuthRequest = async (
  request: Request,
  env: Env,
  providerName: string,
  callback: boolean,
) => {
  const headers = new Headers({
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  });
  const context = createMetadataContext(env, request, headers);
  let response: Response;
  try {
    const provider = oauthProvider(env, providerName);
    response = await (callback
      ? finishOAuth(context, provider)
      : startOAuth(context, provider));
  } catch (error) {
    response = Response.json(
      {
        error:
          error instanceof GraphQLError
            ? error.extensions.code
            : 'UNAUTHENTICATED',
        message:
          error instanceof GraphQLError
            ? error.message
            : 'Unable to sign in with this provider',
      },
      {
        status:
          error instanceof GraphQLError &&
          error.extensions.code === 'NOT_IMPLEMENTED'
            ? 503
            : 400,
      },
    );
  }
  const result = new Response(response.body, response);
  for (const [name, value] of headers) result.headers.append(name, value);
  return result;
};
