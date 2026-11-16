import { parse, serialize } from 'hono/utils/cookie';

import {
  hashToken,
  randomToken,
  signToken,
  verifyToken,
} from '@/auth/token.service';
import { type AuthContext } from '@/auth/types/auth-context.type';
import { unauthenticated } from '@/shared/errors/api-error.util';

export const SESSION_LIFETIME_SECONDS = 180 * 24 * 60 * 60;

export const extractSessionCookie = (request: Request) => {
  if (
    !request.headers.has('x-twenty-session-cookie') &&
    request.headers.get('sec-fetch-mode') !== 'navigate'
  )
    return null;

  const cookies = parse(request.headers.get('cookie') ?? '');
  return (
    (new URL(request.url).protocol === 'https:'
      ? cookies['__Host-twenty-session']
      : cookies['twenty-session']) ?? null
  );
};

export const clearSessionCookies = (headers: Headers) => {
  for (const name of ['__Host-twenty-session', 'twenty-session']) {
    headers.append(
      'set-cookie',
      serialize(name, '', {
        path: '/',
        httpOnly: true,
        secure: name.startsWith('__Host-'),
        sameSite: 'Lax',
        maxAge: 0,
        expires: new Date(0),
      }),
    );
  }
};

export const createSession = async (
  env: Env,
  request: Request,
  headers: Headers,
  userId: string,
  userWorkspaceId: string | null,
  workspaceId: string | null,
  authProvider = 'password',
) => {
  const sessionToken = `sess_${randomToken()}`;
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + SESSION_LIFETIME_SECONDS * 1000,
  ).toISOString();
  const accessToken = await signToken(
    env.APP_SECRET,
    'access',
    { sub: userId, sessionId, ...(workspaceId ? { workspaceId } : {}) },
    30 * 60,
  );
  const refreshToken = await signToken(
    env.APP_SECRET,
    'refresh',
    { sub: userId, sessionId },
    SESSION_LIFETIME_SECONDS,
  );

  await env.CORE_DB.batch([
    env.CORE_DB.prepare(
      'INSERT INTO "userSession" ("id", "tokenHash", "userId", "userWorkspaceId", "userAgent", "ipAddress", "createdAt", "lastActiveAt", "expiresAt", "authProvider") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      sessionId,
      await hashToken(sessionToken),
      userId,
      userWorkspaceId,
      request.headers.get('user-agent'),
      request.headers.get('cf-connecting-ip'),
      now,
      now,
      expiresAt,
      authProvider,
    ),
    env.CORE_DB.prepare(
      'INSERT INTO "appToken" ("id", "tokenHash", "type", "userId", "userSessionId", "expiresAt", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      crypto.randomUUID(),
      await hashToken(refreshToken.token),
      'refresh',
      userId,
      sessionId,
      refreshToken.expiresAt,
      now,
    ),
  ]);

  const secure = new URL(request.url).protocol === 'https:';
  headers.append(
    'set-cookie',
    serialize(
      secure ? '__Host-twenty-session' : 'twenty-session',
      sessionToken,
      {
        httpOnly: true,
        secure,
        path: '/',
        sameSite: 'Lax',
        maxAge: SESSION_LIFETIME_SECONDS,
        expires: new Date(expiresAt),
      },
    ),
  );

  return { accessOrWorkspaceAgnosticToken: accessToken, refreshToken };
};

export const authenticateRequest = async (
  request: Request,
  env: Env,
): Promise<AuthContext> => {
  const bearer = /^Bearer\s+(\S+)$/i.exec(
    request.headers.get('authorization') ?? '',
  )?.[1];
  const cookie = extractSessionCookie(request);
  let sessionPredicate: string;
  let sessionBinding: string;
  let bearerUserId: string | undefined;
  let bearerWorkspaceId: string | undefined;

  if (bearer) {
    const claims = await verifyToken(env.APP_SECRET, 'access', bearer);
    if (!claims.sessionId) throw unauthenticated();
    sessionPredicate = '"session"."id" = ?';
    sessionBinding = claims.sessionId;
    bearerUserId = claims.sub;
    bearerWorkspaceId = claims.workspaceId;
  } else if (cookie) {
    sessionPredicate = '"session"."tokenHash" = ?';
    sessionBinding = await hashToken(cookie);
  } else {
    throw unauthenticated();
  }

  const auth = await env.CORE_DB.prepare(
    `SELECT "session"."id" AS "sessionId", "session"."userId", "session"."userWorkspaceId", "membership"."workspaceId", "membership"."workspaceMemberId" FROM "userSession" AS "session" JOIN "user" ON "user"."id" = "session"."userId" LEFT JOIN "userWorkspace" AS "membership" ON "membership"."id" = "session"."userWorkspaceId" AND "membership"."userId" = "session"."userId" WHERE ${sessionPredicate} AND "session"."revokedAt" IS NULL AND "session"."expiresAt" > ? AND "user"."disabled" = 0`,
  )
    .bind(sessionBinding, new Date().toISOString())
    .first<AuthContext>();

  if (
    !auth ||
    (bearerUserId && bearerUserId !== auth.userId) ||
    (bearerWorkspaceId && bearerWorkspaceId !== auth.workspaceId)
  ) {
    throw unauthenticated('Session is invalid or has expired.');
  }

  return auth;
};

export const cleanupExpiredCredentials = async (database: D1Database) => {
  const now = new Date().toISOString();
  await database.batch([
    database
      .prepare('DELETE FROM "mcpOAuthRequest" WHERE "expiresAt" <= ?')
      .bind(now),
    database
      .prepare('DELETE FROM "mcpOAuthToken" WHERE "expiresAt" <= ?')
      .bind(now),
    database
      .prepare('DELETE FROM "oauthState" WHERE "expiresAt" <= ?')
      .bind(now),
    database.prepare('DELETE FROM "appToken" WHERE "expiresAt" <= ?').bind(now),
    database
      .prepare('DELETE FROM "usedLoginToken" WHERE "expiresAt" <= ?')
      .bind(now),
    database
      .prepare(
        'DELETE FROM "userSession" WHERE "expiresAt" <= ? OR "revokedAt" IS NOT NULL',
      )
      .bind(now),
  ]);
};
