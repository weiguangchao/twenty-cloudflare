import { isNonEmptyString } from '@sniptt/guards';
import { isDefined, isPlainObject } from 'twenty-shared/utils';

import { unauthenticated } from '@/shared/errors/api-error.util';

export type TokenType = 'login' | 'access' | 'refresh' | 'file' | 'file-upload';

export type TokenClaims = {
  sub: string;
  jti: string;
  type: TokenType;
  iat: number;
  exp: number;
  workspaceId?: string;
  sessionId?: string;
  fileId?: string;
};

const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

const decode = (value: string) =>
  Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    (character) => character.charCodeAt(0),
  );

export const randomToken = () =>
  encode(crypto.getRandomValues(new Uint8Array(32)));

export const hashToken = async (value: string) =>
  encode(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  );

const signingKey = async (secret: string, type: TokenType) => {
  if (!isNonEmptyString(secret)) throw new Error('APP_SECRET is required');

  const rootKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const derivedKey = await crypto.subtle.sign(
    'HMAC',
    rootKey,
    new TextEncoder().encode(`twenty-worker:${type}`),
  );

  return crypto.subtle.importKey(
    'raw',
    derivedKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
};

export const signToken = async (
  secret: string,
  type: TokenType,
  claims: Pick<TokenClaims, 'sub' | 'workspaceId' | 'sessionId' | 'fileId'>,
  lifetimeSeconds: number,
) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: TokenClaims = {
    ...claims,
    type,
    jti: crypto.randomUUID(),
    iat: issuedAt,
    exp: issuedAt + lifetimeSeconds,
  };
  const body = `${encode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))}.${encode(new TextEncoder().encode(JSON.stringify(payload)))}`;
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(secret, type),
    new TextEncoder().encode(body),
  );

  return {
    token: `${body}.${encode(new Uint8Array(signature))}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
};

export const verifyToken = async (
  secret: string,
  type: TokenType,
  token: string,
): Promise<TokenClaims> => {
  try {
    if (token.length > 8192) throw unauthenticated();
    const parts = token.split('.');
    if (parts.length !== 3) throw unauthenticated();
    const [header, payload, signature] = parts;
    const parsedHeader: unknown = JSON.parse(
      new TextDecoder().decode(decode(header)),
    );
    const claims: unknown = JSON.parse(
      new TextDecoder().decode(decode(payload)),
    );

    if (
      !isPlainObject(parsedHeader) ||
      parsedHeader.alg !== 'HS256' ||
      parsedHeader.typ !== 'JWT' ||
      !isPlainObject(claims) ||
      claims.type !== type ||
      !isNonEmptyString(claims.sub) ||
      !isNonEmptyString(claims.jti) ||
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000 ||
      typeof claims.iat !== 'number' ||
      !Number.isFinite(claims.iat) ||
      claims.iat > Date.now() / 1000 ||
      ['workspaceId', 'sessionId', 'fileId'].some(
        (key) => isDefined(claims[key]) && !isNonEmptyString(claims[key]),
      ) ||
      !(await crypto.subtle.verify(
        'HMAC',
        await signingKey(secret, type),
        decode(signature),
        new TextEncoder().encode(`${header}.${payload}`),
      ))
    ) {
      throw unauthenticated();
    }

    return claims as TokenClaims;
  } catch {
    throw unauthenticated('Invalid or expired token');
  }
};
