import { env, SELF } from 'cloudflare:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';

import { handleOAuthRequest } from '@/auth/oauth/oauth-login.service';
import { hashToken, randomToken } from '@/auth/token.service';
import { buildClientConfig } from '@/http/build-client-config.util';
import { verifyEmailAction } from '@/auth/email-action.service';
import { createMetadataContext } from '@/metadata-api/create-metadata-context.util';
import { type EmailJob } from '@/emails/types/email-job.type';
import { sendWorkspaceInvitations } from '@/auth/workspace-invitation.service';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
  user,
} from '../utils/auth-test.util';

let connection = client();
const configuration: Env = {
  ...env,
  GOOGLE_CLIENT_ID: 'google-test-client',
  GOOGLE_CLIENT_SECRET: 'google-test-secret',
  MICROSOFT_CLIENT_ID: 'microsoft-test-client',
  MICROSOFT_CLIENT_SECRET: 'microsoft-test-secret',
  EMAIL_FROM: 'crm@example.com',
};
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let publicKey: Awaited<ReturnType<typeof exportJWK>>;
let account: Awaited<ReturnType<typeof prepareWorkspace>>;
let identityToken: string;
const tenant = '11111111-1111-4111-8111-111111111111';

beforeAll(async () => {
  await setupCoreTestDatabase();
  keys = await generateKeyPair('RS256');
  publicKey = {
    ...(await exportJWK(keys.publicKey)),
    kid: 'oauth-test-key',
    alg: 'RS256',
    use: 'sig',
  };
});
beforeEach(async () => {
  connection = client();
  await clearCoreTestDatabase();
  account = await prepareWorkspace(connection);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const url = String(input);
    if (url.includes('/certs') || url.includes('/keys'))
      return Response.json({ keys: [publicKey] });
    if (url.endsWith('/token')) {
      const parameters = options?.body as URLSearchParams;
      expect(parameters.get('code_verifier')).toHaveLength(43);
      expect(parameters.get('grant_type')).toBe('authorization_code');
      return Response.json({
        id_token: identityToken,
        access_token: 'not-persisted',
        refresh_token: 'not-persisted',
      });
    }
    throw new Error('Unexpected outbound OAuth request');
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const begin = async (
  provider = 'google',
  authenticated = false,
  parameters = '',
) => {
  const response = await handleOAuthRequest(
    new Request(`${ORIGIN}/auth/${provider}${parameters}`, {
      headers: {
        'cf-connecting-ip': crypto.randomUUID(),
        ...(authenticated ? { cookie: connection.cookie } : {}),
      },
    }),
    configuration,
    provider,
    false,
  );
  expect(response.status).toBe(302);
  const authorization = new URL(response.headers.get('location')!);
  expect(authorization.searchParams.get('scope')).toBe('openid profile email');
  expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
  expect(authorization.searchParams.get('code_challenge')).toHaveLength(43);
  return {
    provider,
    authorization,
    state: authorization.searchParams.get('state')!,
    cookie: response.headers.getSetCookie()[0].split(';')[0],
  };
};
const issueToken = async (
  flow: Awaited<ReturnType<typeof begin>>,
  patch: Record<string, unknown> = {},
) => {
  identityToken = await new SignJWT({
    email: account.email,
    email_verified: true,
    hd: 'example.com',
    nonce: flow.authorization.searchParams.get('nonce'),
    ...(flow.provider === 'microsoft' ? { tid: tenant } : {}),
    ...patch,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'oauth-test-key' })
    .setIssuer(
      flow.provider === 'google'
        ? 'https://accounts.google.com'
        : `https://login.microsoftonline.com/${tenant}/v2.0`,
    )
    .setAudience(
      flow.provider === 'google'
        ? configuration.GOOGLE_CLIENT_ID!
        : configuration.MICROSOFT_CLIENT_ID!,
    )
    .setSubject('provider-subject')
    .setIssuedAt()
    .setExpirationTime('5 minutes')
    .sign(keys.privateKey);
};
const finish = (
  flow: Awaited<ReturnType<typeof begin>>,
  cookie = flow.cookie,
) =>
  handleOAuthRequest(
    new Request(
      `${ORIGIN}/auth/${flow.provider}/redirect?state=${flow.state}&code=test-code`,
      { headers: { cookie } },
    ),
    configuration,
    flow.provider,
    true,
  );

it('validates Google OIDC and returns a single-use workspace login token', async () => {
  const flow = await begin();
  await issueToken(flow);
  const response = await finish(flow);
  expect(response.status).toBe(302);
  const redirect = new URL(response.headers.get('location')!);
  expect(redirect.pathname).toBe('/verify');
  const exchanged = await connection.request(
    'mutation($token: String!, $origin: String!) {getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) {tokens {accessOrWorkspaceAgnosticToken {token}}}}',
    { token: redirect.searchParams.get('loginToken'), origin: ORIGIN },
  );
  expect(exchanged.result.errors).toBeUndefined();
  const sessions = await env.CORE_DB.prepare(
    'SELECT "authProvider" FROM "userSession" ORDER BY rowid DESC LIMIT 1',
  ).first();
  expect(sessions).toEqual({ authProvider: 'google' });
  expect((await finish(flow)).status).toBe(400);
});

it.each([
  '/authorize?request=authorization-request',
  '//attacker.example/callback',
])(
  'preserves only safe authorization return paths: %s',
  async (returnToPath) => {
    const flow = await begin(
      'google',
      false,
      `?returnToPath=${encodeURIComponent(returnToPath)}`,
    );
    await issueToken(flow);
    const response = await finish(flow);
    expect(
      new URL(response.headers.get('location')!).searchParams.get(
        'returnToPath',
      ),
    ).toBe(returnToPath.startsWith('//') ? null : returnToPath);
  },
);

it('requires a matching browser state cookie and consumes state once', async () => {
  const flow = await begin();
  await issueToken(flow);
  expect((await finish(flow, 'crm-oauth=wrong')).status).toBe(400);
  expect((await finish(flow)).status).toBe(302);
  expect((await finish(flow)).status).toBe(400);
});

it('rejects a mismatched nonce and expired state before linking an account', async () => {
  const flow = await begin();
  await issueToken(flow, { nonce: 'wrong' });
  expect((await finish(flow)).status).toBe(400);
  expect(
    await env.CORE_DB.prepare('SELECT 1 FROM "oauthIdentity"').first(),
  ).toBeNull();
  const expired = await begin();
  await issueToken(expired);
  await env.CORE_DB.prepare('UPDATE "oauthState" SET "expiresAt" = ?')
    .bind(new Date(0).toISOString())
    .run();
  expect((await finish(expired)).status).toBe(400);
});

it('links Microsoft with an authenticated owner, then signs in by issuer and subject', async () => {
  const flow = await begin('microsoft', true);
  await issueToken(flow);
  expect((await finish(flow)).status).toBe(302);
  const subsequent = await begin('microsoft');
  await issueToken(subsequent, { email: 'changed-claim@example.com' });
  expect((await finish(subsequent)).status).toBe(302);
  expect((await user(connection)).email).toBe(account.email);
});

it('requires local email proof before linking an untrusted Microsoft email claim', async () => {
  const flow = await begin('microsoft');
  await issueToken(flow, { email_verified: false });
  const pending = await finish(flow);
  expect(pending.status).toBe(200);
  expect(await pending.text()).toContain('Check your email');
  expect(
    await env.CORE_DB.prepare('SELECT 1 FROM "oauthIdentity"').first(),
  ).toBeNull();
  const email = await env.CORE_DB.prepare(
    'SELECT "payload" FROM "emailDelivery" ORDER BY rowid DESC LIMIT 1',
  ).first<{ payload: string }>();
  const job = JSON.parse(email!.payload) as EmailJob;
  const token = new URL(job.link).searchParams.get('emailVerificationToken')!;
  await verifyEmailAction(
    createMetadataContext(
      configuration,
      new Request(`${ORIGIN}/metadata`),
      new Headers(),
    ),
    token,
    account.email,
  );
  const subsequent = await begin('microsoft');
  await issueToken(subsequent);
  expect((await finish(subsequent)).status).toBe(302);
});

it('preserves MCP consent through Microsoft email verification', async () => {
  const registered = await SELF.fetch(`${ORIGIN}/oauth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Email proof client',
      redirect_uris: ['https://agent.example/callback'],
    }),
  });
  const { client_id: clientId } = await registered.json<{
    client_id: string;
  }>();
  const verifier = randomToken();
  const parameters = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: 'https://agent.example/callback',
    resource: `${ORIGIN}/mcp/v1`,
    code_challenge_method: 'S256',
    code_challenge: await hashToken(verifier),
  });
  const authorization = await SELF.fetch(
    `${ORIGIN}/oauth/authorize?${parameters}`,
    { redirect: 'manual' },
  );
  expect(authorization.status).toBe(302);
  const consent = new URL(authorization.headers.get('location')!);
  const returnToPath = `${consent.pathname}${consent.search}`;
  const flow = await begin(
    'microsoft',
    false,
    `?returnToPath=${encodeURIComponent(returnToPath)}`,
  );
  await issueToken(flow, { email_verified: false });
  expect((await finish(flow)).status).toBe(200);
  const email = await env.CORE_DB.prepare(
    'SELECT "payload" FROM "emailDelivery" ORDER BY rowid DESC LIMIT 1',
  ).first<{ payload: string }>();
  const job = JSON.parse(email!.payload) as EmailJob;
  const link = new URL(job.link);
  expect(link.searchParams.get('returnToPath')).toBe(returnToPath);
  const verified = await connection.request<{
    verifyEmailAndGetLoginToken: { loginToken: { token: string } };
  }>(
    'mutation($token: String!, $email: String!, $origin: String!) {verifyEmailAndGetLoginToken(emailVerificationToken: $token, email: $email, origin: $origin) {loginToken {token}}}',
    {
      token: link.searchParams.get('emailVerificationToken'),
      email: account.email,
      origin: ORIGIN,
    },
  );
  expect(verified.result.errors).toBeUndefined();
  const exchanged = await connection.request(
    'mutation($token: String!, $origin: String!) {getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) {tokens {accessOrWorkspaceAgnosticToken {token}}}}',
    {
      token: verified.result.data!.verifyEmailAndGetLoginToken.loginToken.token,
      origin: ORIGIN,
    },
  );
  expect(exchanged.result.errors).toBeUndefined();
  const details = await SELF.fetch(
    `${ORIGIN}/oauth/mcp/requests/${consent.searchParams.get('request')}`,
    {
      headers: { cookie: connection.cookie, 'x-crm-session-cookie': '1' },
    },
  );
  expect(await details.json()).toMatchObject({
    clientName: 'Email proof client',
    workspaceName: 'Acme',
  });
});

it('keeps providers disabled until both credentials are configured', async () => {
  expect(buildClientConfig(new URL(ORIGIN), env).authProviders).toMatchObject({
    google: false,
    microsoft: false,
  });
  expect(
    buildClientConfig(new URL(ORIGIN), configuration).authProviders,
  ).toMatchObject({ google: true, microsoft: true });
  const response = await handleOAuthRequest(
    new Request(`${ORIGIN}/auth/google`),
    env,
    'google',
    false,
  );
  expect(response.status).toBe(503);
});

it('creates a new verified Google account for initial workspace setup without a password', async () => {
  await clearCoreTestDatabase();
  const flow = await begin();
  await issueToken(flow, { email: 'new-owner@gmail.com', hd: null });
  const response = await finish(flow);
  expect(response.status).toBe(302);
  expect(new URL(response.headers.get('location')!).pathname).toBe('/welcome');
  const cookie = response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith('crm-session='))!
    .split(';')[0];
  const current = await SELF.fetch(`${ORIGIN}/metadata`, {
    method: 'POST',
    headers: {
      cookie,
      origin: ORIGIN,
      'x-crm-session-cookie': '1',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: 'query {currentUser {email hasPassword isEmailVerified}}',
    }),
  });
  expect(await current.json()).toMatchObject({
    data: {
      currentUser: {
        email: 'new-owner@gmail.com',
        hasPassword: false,
        isEmailVerified: true,
      },
    },
  });
});

it('accepts a private invitation with Microsoft and gives the new member a workspace login token', async () => {
  const context = createMetadataContext(
    configuration,
    new Request(`${ORIGIN}/metadata`, {
      headers: { cookie: connection.cookie, 'x-crm-session-cookie': '1' },
    }),
    new Headers(),
  );
  const email = 'microsoft-invite@example.com';
  await sendWorkspaceInvitations(context, [email]);
  const row = await env.CORE_DB.prepare(
    'SELECT "payload" FROM "emailDelivery" ORDER BY rowid DESC LIMIT 1',
  ).first<{ payload: string }>();
  const job = JSON.parse(row!.payload) as EmailJob;
  const invitationToken = new URL(job.link).searchParams.get('inviteToken')!;
  const flow = await begin(
    'microsoft',
    false,
    `?inviteToken=${invitationToken}`,
  );
  await issueToken(flow, { email, email_verified: false });
  const response = await finish(flow);
  expect(response.status).toBe(302);
  const login = new URL(response.headers.get('location')!).searchParams.get(
    'loginToken',
  )!;
  const member = client();
  const exchange = await member.request(
    'mutation($token: String!, $origin: String!) {getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) {tokens {accessOrWorkspaceAgnosticToken {token}}}}',
    { token: login, origin: ORIGIN },
  );
  expect(exchange.result.errors).toBeUndefined();
  expect((await user(member)).email).toBe(email);
});

it('rejects a tampered identity signature without creating a link', async () => {
  const flow = await begin();
  await issueToken(flow);
  const parts = identityToken.split('.');
  parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
  identityToken = parts.join('.');
  expect((await finish(flow)).status).toBe(400);
  expect(
    await env.CORE_DB.prepare('SELECT 1 FROM "oauthIdentity"').first(),
  ).toBeNull();
});
