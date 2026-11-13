import {
  applyD1Migrations,
  env,
  SELF,
  runInDurableObject,
} from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import migration from '../../migrations/0001-core-auth.sql?raw';
import signupFixture from '../../contract/fixtures/auth-signup-onboarding/005-SignUp.json';
import userFixture from '../../contract/fixtures/auth-signup-onboarding/006-GetCurrentUser.json';
import createWorkspaceFixture from '../../contract/fixtures/auth-signup-onboarding/008-SignUpInNewWorkspace.json';
import activateFixture from '../../contract/fixtures/auth-signup-onboarding/012-ActivateWorkspace.json';
import profileFixture from '../../contract/fixtures/auth-signup-onboarding/017-UpdateWorkspaceMemberSettings.json';
import invitationsFixture from '../../contract/fixtures/auth-signup-onboarding/019-SendInvitations.json';
import sessionsFixture from '../../contract/fixtures/auth-signout-signin/014-CurrentUserSessions.json';
import { signToken } from '@/auth/token.service';
import { cleanupExpiredCredentials } from '@/auth/session.service';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';

const ORIGIN = 'http://localhost';
const PASSWORD = 'Password123!';

type Tokens = {
  accessOrWorkspaceAgnosticToken: { token: string };
  refreshToken: { token: string };
};
type CurrentUser = {
  id: string;
  firstName: string;
  email: string;
  onboardingStatus: string | null;
  userVars: Record<string, boolean>;
  workspaceMember: {
    id: string;
    name: { firstName: string; lastName: string };
  } | null;
  currentWorkspace: {
    id: string;
    activationStatus: string;
    defaultRole: { label: string };
  } | null;
  currentUserWorkspace: { id: string } | null;
};
type Result<TData> = {
  data?: TData;
  errors?: {
    message: string;
    extensions: { code: string; subCode?: string; userFriendlyMessage: string };
  }[];
};

const client = (origin = ORIGIN) => {
  let cookie = '';
  const ipAddress = crypto.randomUUID();
  return {
    get cookie() {
      return cookie;
    },
    async request<TData = Record<string, unknown>>(
      query: string,
      variables: Record<string, unknown> = {},
      headers: Record<string, string> = {},
    ) {
      const response = await SELF.fetch(`${origin}/metadata`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin,
          'x-twenty-session-cookie': '1',
          'cf-connecting-ip': ipAddress,
          ...(cookie ? { cookie } : {}),
          ...headers,
        },
        body: JSON.stringify({ query, variables }),
      });
      const issued = response.headers
        .getSetCookie()
        .find(
          (value) =>
            value.startsWith('twenty-session=') ||
            value.startsWith('__Host-twenty-session='),
        );
      if (issued) cookie = issued.split(';')[0];
      return { response, result: (await response.json()) as Result<TData> };
    },
  };
};

const signup = async (connection: ReturnType<typeof client>) => {
  const email = `${crypto.randomUUID()}@example.com`;
  const response = await connection.request<{ signUp: { tokens: Tokens } }>(
    signupFixture.query,
    { email, password: PASSWORD, locale: 'en' },
  );
  expect(response.result.errors).toBeUndefined();
  return { email, ...response, tokens: response.result.data!.signUp.tokens };
};

const user = async (connection: ReturnType<typeof client>) => {
  const response = await connection.request<{ currentUser: CurrentUser }>(
    userFixture.query,
  );
  expect(response.result.errors).toBeUndefined();
  return response.result.data!.currentUser;
};

const prepareWorkspace = async (
  connection: ReturnType<typeof client>,
  activate = true,
) => {
  const account = await signup(connection);
  const creation = await connection.request<{
    signUpInNewWorkspace: {
      loginToken: { token: string };
      workspace: { id: string };
    };
  }>(createWorkspaceFixture.query, { input: { displayName: 'Acme' } });
  expect(creation.result.errors).toBeUndefined();
  const workspace = creation.result.data!.signUpInNewWorkspace;
  const exchange = await connection.request(
    'mutation($token: String!, $origin: String!) { getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) { tokens { accessOrWorkspaceAgnosticToken { token } } } }',
    { token: workspace.loginToken.token, origin: ORIGIN },
  );
  expect(exchange.result.errors).toBeUndefined();
  if (activate) {
    const activated = await connection.request(activateFixture.query, {
      input: {},
    });
    expect(activated.result.errors).toBeUndefined();
  }
  return {
    ...account,
    workspaceId: workspace.workspace.id,
    loginToken: workspace.loginToken.token,
  };
};

beforeAll(async () => {
  await applyD1Migrations(env.CORE_DB, [
    {
      name: '0001-core-auth.sql',
      queries: migration
        .split(';')
        .map((query) => query.trim())
        .filter(Boolean),
    },
  ]);
});

beforeEach(async () => {
  await env.CORE_DB.batch(
    [
      'appToken',
      'usedLoginToken',
      'userSession',
      'userWorkspace',
      'workspace',
      'user',
    ].map((table) => env.CORE_DB.prepare(`DELETE FROM "${table}"`)),
  );
});

describe('authentication and onboarding contracts', () => {
  it('replays signup, workspace activation, profile, invitations, signout and signin', async () => {
    const connection = client();
    const { email, workspaceId } = await prepareWorkspace(connection, false);
    expect(await user(connection)).toMatchObject({
      onboardingStatus: 'WORKSPACE_ACTIVATION',
      currentWorkspace: { activationStatus: 'PENDING_CREATION' },
    });
    expect(
      (await connection.request(activateFixture.query, { input: {} })).result
        .errors,
    ).toBeUndefined();
    const activatedUser = await user(connection);
    expect(activatedUser).toMatchObject({
      onboardingStatus: 'PROFILE_CREATION',
      userVars: {
        ONBOARDING_CREATE_PROFILE_PENDING: true,
        ONBOARDING_INVITE_TEAM_PENDING: true,
        ONBOARDING_CONNECT_ACCOUNT_PENDING: false,
      },
      currentWorkspace: {
        activationStatus: 'ACTIVE',
        defaultRole: { label: 'Member' },
      },
    });
    expect(
      (
        await connection.request(profileFixture.query, {
          input: {
            workspaceMemberId: activatedUser.workspaceMember!.id,
            update: {
              name: { firstName: 'Alice', lastName: 'Admin' },
              colorScheme: 'System',
              jobTitle: '',
            },
          },
        })
      ).result.errors,
    ).toBeUndefined();
    expect(await user(connection)).toMatchObject({
      onboardingStatus: 'INVITE_TEAM',
      firstName: 'Alice',
    });
    expect(
      (await connection.request(invitationsFixture.query, { emails: [] }))
        .result.errors,
    ).toBeUndefined();
    expect(await user(connection)).toMatchObject({
      onboardingStatus: 'COMPLETED',
      userVars: {
        ONBOARDING_CREATE_PROFILE_PENDING: false,
        ONBOARDING_INVITE_TEAM_PENDING: false,
      },
      workspaceMember: { name: { firstName: 'Alice', lastName: 'Admin' } },
    });
    const signedOut = await connection.request('mutation { signOut }');
    expect(signedOut.response.headers.getSetCookie()).toHaveLength(2);
    expect(
      (await connection.request(userFixture.query)).result.errors?.[0]
        .extensions.code,
    ).toBe('UNAUTHENTICATED');
    expect(
      (
        await connection.request(
          'mutation($email: String!, $password: String!) { signIn(email: $email, password: $password) { tokens { accessOrWorkspaceAgnosticToken { token } } } }',
          { email, password: PASSWORD },
        )
      ).result.errors,
    ).toBeUndefined();
    expect(await user(connection)).toMatchObject({
      onboardingStatus: 'COMPLETED',
      currentWorkspace: { id: workspaceId },
    });
  });

  it('restores the profile step from invite onboarding and rejects changes to identity fields', async () => {
    const connection = client();
    await prepareWorkspace(connection);
    const current = await user(connection);
    const input = {
      workspaceMemberId: current.workspaceMember!.id,
      update: { name: { firstName: 'Alice', lastName: 'Admin' } },
    };
    expect(
      (await connection.request(profileFixture.query, { input })).result.errors,
    ).toBeUndefined();
    expect(
      (
        await connection.request(
          'mutation { goBackToPreviousOnboardingStep { onboardingStatus previousOnboardingStatus } }',
        )
      ).result.errors,
    ).toBeUndefined();
    expect(await user(connection)).toMatchObject({
      onboardingStatus: 'PROFILE_CREATION',
      userVars: { ONBOARDING_CREATE_PROFILE_PENDING: true },
    });
    expect(
      (
        await connection.request(profileFixture.query, {
          input: { ...input, update: { userId: crypto.randomUUID() } },
        })
      ).result.errors?.[0].extensions.code,
    ).toBe('BAD_USER_INPUT');
    expect(
      (
        await connection.request(profileFixture.query, {
          input: {
            ...input,
            update: { name: { firstName: '', lastName: '' } },
          },
        })
      ).result.errors?.[0].extensions.code,
    ).toBe('BAD_USER_INPUT');
    expect((await user(connection)).workspaceMember!.name.firstName).toBe(
      'Alice',
    );
  });

  it('assigns Admin and seeds records once when activation is retried', async () => {
    const connection = client();
    const { workspaceId } = await prepareWorkspace(connection);
    expect(
      (await connection.request(activateFixture.query, { input: {} })).result
        .errors,
    ).toBeUndefined();
    await env.CORE_DB.prepare(
      'UPDATE "workspace" SET "activationStatus" = ?, "updatedAt" = ? WHERE "id" = ?',
    )
      .bind('ONGOING_CREATION', '2000-01-01T00:00:00.000Z', workspaceId)
      .run();
    expect(
      (await connection.request(activateFixture.query, { input: {} })).result
        .errors,
    ).toBeUndefined();
    const stub = env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId));
    await runInDurableObject(
      stub,
      (_instance: WorkspaceDurableObject, state) => {
        for (const [table, count] of [
          ['workspaceMember', 1],
          ['company', 5],
          ['person', 5],
          ['opportunity', 6],
        ] as const) {
          const actual = state.storage.sql
            .exec<{ count: number }>(
              `SELECT COUNT(*) AS "count" FROM "rec_${table}"`,
            )
            .one().count;
          expect(actual).toBe(count);
        }
        expect(
          state.storage.sql
            .exec<{ label: string }>(
              'SELECT "role"."label" FROM "meta_role" AS "role" JOIN "meta_roleTarget" AS "target" ON "target"."roleId" = "role"."id"',
            )
            .one().label,
        ).toBe('Admin');
      },
    );
  });

  it('rejects unsigned, expired and wrong-origin login tokens without consuming a valid token', async () => {
    const connection = client();
    const { workspaceId } = await prepareWorkspace(connection);
    const { id: userId } = await user(connection);
    const query =
      'mutation($token: String!, $origin: String!) { getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) { tokens { accessOrWorkspaceAgnosticToken { token } } } }';
    const expired = await signToken(
      env.APP_SECRET,
      'login',
      { sub: userId, workspaceId },
      -1,
    );
    expect(
      (
        await connection.request(query, {
          token: expired.token,
          origin: ORIGIN,
        })
      ).result.errors?.[0].extensions.code,
    ).toBe('UNAUTHENTICATED');
    const fresh = await signToken(
      env.APP_SECRET,
      'login',
      { sub: userId, workspaceId },
      900,
    );
    expect(
      (
        await connection.request(query, {
          token: fresh.token,
          origin: 'https://other.example',
        })
      ).result.errors?.[0].extensions.code,
    ).toBe('NOT_FOUND');
    expect(
      (await connection.request(query, { token: fresh.token, origin: ORIGIN }))
        .result.errors,
    ).toBeUndefined();
  });

  it('enforces single workspace signup and assigns invited users the default Member role', async () => {
    const creator = client();
    const { workspaceId } = await prepareWorkspace(creator);
    const connection = client();
    const email = `${crypto.randomUUID()}@example.com`;
    const blocked = await connection.request(signupFixture.query, {
      email,
      password: PASSWORD,
    });
    expect(blocked.result.errors?.[0].extensions).toMatchObject({
      code: 'FORBIDDEN',
      subCode: 'SIGNUP_DISABLED',
    });
    const query =
      'mutation($email: String!, $password: String!, $workspaceId: UUID!, $hash: String!) { signUpInWorkspace(email: $email, password: $password, workspaceId: $workspaceId, workspaceInviteHash: $hash) { loginToken { token } } }';
    expect(
      (
        await connection.request(query, {
          email,
          password: PASSWORD,
          workspaceId,
          hash: 'wrong',
        })
      ).result.errors?.[0].extensions.code,
    ).toBe('FORBIDDEN');
    const workspace = await env.CORE_DB.prepare(
      'UPDATE "workspace" SET "isPublicInviteLinkEnabled" = 1 WHERE "id" = ? RETURNING "inviteHash"',
    )
      .bind(workspaceId)
      .first<{ inviteHash: string }>();
    const invited = await connection.request<{
      signUpInWorkspace: { loginToken: { token: string } };
    }>(query, {
      email,
      password: PASSWORD,
      workspaceId,
      hash: workspace!.inviteHash,
    });
    expect(invited.result.errors).toBeUndefined();
    const exchanged = await connection.request(
      'mutation($token: String!, $origin: String!) { getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) { tokens { accessOrWorkspaceAgnosticToken { token } } } }',
      {
        token: invited.result.data!.signUpInWorkspace.loginToken.token,
        origin: ORIGIN,
      },
    );
    expect(exchanged.result.errors).toBeUndefined();
    const invitedUser = await user(connection);
    expect(invitedUser.onboardingStatus).toBe('PROFILE_CREATION');
    const creatorUser = await user(creator);
    expect(
      (
        await connection.request(profileFixture.query, {
          input: {
            workspaceMemberId: creatorUser.workspaceMember!.id,
            update: { name: { firstName: 'Unauthorized', lastName: '' } },
          },
        })
      ).result.errors?.[0].extensions.code,
    ).toBe('FORBIDDEN');
    const assigned = await env.WORKSPACE.get(
      env.WORKSPACE.idFromName(workspaceId),
    ).getWorkspaceAuthData({
      workspaceMemberId: invitedUser.workspaceMember!.id,
      userWorkspaceId: invitedUser.currentUserWorkspace!.id,
    });
    expect(assigned.roles.map((role) => role?.label)).toEqual(['Member']);
  });

  it('rate limits repeated credential attempts and only lists the current user’s sessions', async () => {
    const connection = client();
    const { email } = await signup(connection);
    const sessions = await connection.request<{
      currentUserSessions: { id: string; isCurrent: boolean }[];
    }>(sessionsFixture.query);
    expect(sessions.result.errors).toBeUndefined();
    expect(sessions.result.data!.currentUserSessions).toHaveLength(1);
    expect(sessions.result.data!.currentUserSessions[0].isCurrent).toBe(true);
    let code: string | undefined;
    for (let attempt = 0; attempt < 25; attempt++) {
      const login = await connection.request(
        'mutation($email: String!, $password: String!) { signIn(email: $email, password: $password) { tokens { accessOrWorkspaceAgnosticToken { token } } } }',
        { email, password: 'WrongPassword' },
      );
      code = login.result.errors?.[0].extensions.code;
      if (code === 'TOO_MANY_REQUESTS') break;
    }
    expect(code).toBe('TOO_MANY_REQUESTS');
  });

  it('rejects duplicate email, unknown users, wrong passwords and short passwords with contract codes', async () => {
    const connection = client();
    const { email } = await signup(connection);
    const duplicate = await connection.request(signupFixture.query, {
      email: email.toUpperCase(),
      password: PASSWORD,
    });
    expect(duplicate.result.errors?.[0].extensions).toMatchObject({
      code: 'FORBIDDEN',
      subCode: 'USER_ALREADY_EXISTS',
    });
    const query =
      'mutation($email: String!, $password: String!) { signIn(email: $email, password: $password) { tokens { accessOrWorkspaceAgnosticToken { token } } } }';
    expect(
      (await connection.request(query, { email, password: 'WrongPassword1' }))
        .result.errors?.[0].extensions,
    ).toMatchObject({ code: 'FORBIDDEN', subCode: 'FORBIDDEN_EXCEPTION' });
    expect(
      (
        await connection.request(query, {
          email: 'nobody@example.com',
          password: PASSWORD,
        })
      ).result.errors?.[0].extensions,
    ).toMatchObject({ code: 'UNAUTHENTICATED', subCode: 'USER_NOT_FOUND' });
    expect(
      (
        await connection.request(signupFixture.query, {
          email: 'short@example.com',
          password: 'short',
        })
      ).result.errors?.[0].extensions.code,
    ).toBe('BAD_USER_INPUT');
  });

  it('allows only one redemption under concurrent login token exchanges', async () => {
    const connection = client();
    const { loginToken } = await prepareWorkspace(connection);
    const query =
      'mutation($token: String!, $origin: String!) { getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) { tokens { accessOrWorkspaceAgnosticToken { token } } } }';
    const replay = await connection.request(query, {
      token: loginToken,
      origin: ORIGIN,
    });
    expect(replay.result.errors?.[0]).toMatchObject({
      message: 'Login token has already been used',
      extensions: { code: 'UNAUTHENTICATED' },
    });
    const login = await connection.request<{
      getLoginTokenFromCredentials: { loginToken: { token: string } };
    }>(
      'mutation($email: String!, $password: String!, $origin: String!) { getLoginTokenFromCredentials(email: $email, password: $password, origin: $origin) { loginToken { token } } }',
      {
        email: (await user(connection)).email,
        password: PASSWORD,
        origin: ORIGIN,
      },
    );
    const token =
      login.result.data!.getLoginTokenFromCredentials.loginToken.token;
    const results = await Promise.all([
      client().request(query, { token, origin: ORIGIN }),
      client().request(query, { token, origin: ORIGIN }),
    ]);
    expect(results.filter((result) => !result.result.errors)).toHaveLength(1);
    expect(
      results.find((result) => result.result.errors)?.result.errors?.[0]
        .message,
    ).toBe('Login token has already been used');
  });
});

describe('session channel and CSRF', () => {
  it('issues a 180-day httpOnly cookie, stores only its hash and requires opt-in', async () => {
    const connection = client();
    const { response, tokens } = await signup(connection);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=15552000');
    const session = await env.CORE_DB.prepare(
      'SELECT "tokenHash" FROM "userSession"',
    ).first<{ tokenHash: string }>();
    expect(session!.tokenHash).not.toContain(connection.cookie.split('=')[1]);
    const withoutOptIn = await SELF.fetch(`${ORIGIN}/metadata`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: ORIGIN,
        cookie: connection.cookie,
      },
      body: JSON.stringify({ query: userFixture.query }),
    });
    expect(
      ((await withoutOptIn.json()) as Result<unknown>).errors?.[0].message,
    ).toBe('Missing authentication token');
    const bearer = await client().request(
      userFixture.query,
      {},
      {
        authorization: `Bearer ${tokens.accessOrWorkspaceAgnosticToken.token}`,
        origin: 'https://external.example',
      },
    );
    expect(bearer.result.errors).toBeUndefined();
  });

  it('uses a secure __Host cookie on HTTPS', async () => {
    const { response } = await signup(client('https://localhost'));
    expect(response.headers.get('set-cookie')).toMatch(
      /^__Host-twenty-session=sess_/,
    );
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('set-cookie')).toContain('Path=/');
    expect(response.headers.get('set-cookie')).not.toContain('Domain=');
  });

  it('rejects cross-origin or missing Origin on cookie POST, including Basic auth', async () => {
    const connection = client();
    await signup(connection);
    const attempts: Record<string, string>[] = [
      { origin: 'https://evil.example' },
      { origin: '' },
      { origin: 'https://evil.example', authorization: 'Basic ignored' },
    ];
    for (const headers of attempts) {
      const result = await connection.request(
        'mutation { signOut }',
        {},
        headers,
      );
      expect(result.response.status).toBe(403);
      expect(result.result).toMatchObject({ error: 'CSRF_ORIGIN_MISMATCH' });
    }
  });

  it('rejects expired sessions and revokes Bearer access at signout', async () => {
    const connection = client();
    const { tokens } = await signup(connection);
    await connection.request('mutation { signOut }');
    expect(
      (
        await client().request(
          userFixture.query,
          {},
          {
            authorization: `Bearer ${tokens.accessOrWorkspaceAgnosticToken.token}`,
          },
        )
      ).result.errors?.[0].extensions.code,
    ).toBe('UNAUTHENTICATED');
    const fresh = client();
    await signup(fresh);
    await env.CORE_DB.prepare('UPDATE "userSession" SET "expiresAt" = ?')
      .bind('2000-01-01T00:00:00.000Z')
      .run();
    expect(
      (await fresh.request(userFixture.query)).result.errors?.[0],
    ).toMatchObject({
      message: 'Session is invalid or has expired.',
      extensions: { code: 'UNAUTHENTICATED' },
    });
    await cleanupExpiredCredentials(env.CORE_DB);
    expect(
      await env.CORE_DB.prepare('SELECT "id" FROM "userSession"').first(),
    ).toBeNull();
  });
});
