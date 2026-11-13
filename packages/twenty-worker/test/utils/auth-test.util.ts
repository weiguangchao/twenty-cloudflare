import { applyD1Migrations, env, SELF } from 'cloudflare:test';
import { expect } from 'vitest';

import migration from '../../migrations/0001-core-auth.sql?raw';
import signupFixture from '../../contract/fixtures/auth-signup-onboarding/005-SignUp.json';
import userFixture from '../../contract/fixtures/auth-signup-onboarding/006-GetCurrentUser.json';
import createWorkspaceFixture from '../../contract/fixtures/auth-signup-onboarding/008-SignUpInNewWorkspace.json';
import activateFixture from '../../contract/fixtures/auth-signup-onboarding/012-ActivateWorkspace.json';
import { type ObjectRecordsPermissions } from '@/workspace/permissions/types/permission-context.type';

export const ORIGIN = 'http://localhost';
export const PASSWORD = 'Password123!';

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
  workspaceMembers: {
    id: string;
    userId: string;
    userWorkspaceId: string;
    name: { firstName: string; lastName: string };
  }[];
  currentUserWorkspace: {
    id: string;
    permissionFlags: string[];
    objectRecordsPermissions: ObjectRecordsPermissions[];
  } | null;
};
export type Result<TData> = {
  data?: TData;
  errors?: {
    message: string;
    extensions: { code: string; subCode?: string; userFriendlyMessage: string };
  }[];
};

export const client = (origin = ORIGIN) => {
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

export const signup = async (connection: ReturnType<typeof client>) => {
  const email = `${crypto.randomUUID()}@example.com`;
  const response = await connection.request<{ signUp: { tokens: Tokens } }>(
    signupFixture.query,
    { email, password: PASSWORD, locale: 'en' },
  );
  expect(response.result.errors).toBeUndefined();
  return { email, ...response, tokens: response.result.data!.signUp.tokens };
};

export const user = async (connection: ReturnType<typeof client>) => {
  const response = await connection.request<{ currentUser: CurrentUser }>(
    userFixture.query,
  );
  expect(response.result.errors).toBeUndefined();
  return response.result.data!.currentUser;
};

export const prepareWorkspace = async (
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

export const setupCoreTestDatabase = async () => {
  await applyD1Migrations(env.CORE_DB, [
    {
      name: '0001-core-auth.sql',
      queries: migration
        .split(';')
        .map((query) => query.trim())
        .filter(Boolean),
    },
  ]);
};

export const clearCoreTestDatabase = async () => {
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
};
