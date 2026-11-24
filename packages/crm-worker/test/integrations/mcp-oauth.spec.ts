import { env, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';

import { hashToken, randomToken } from '@/auth/token.service';
import { resolveMcpClient } from '@/mcp/oauth/mcp-oauth-client.util';
import standardMetadata from '@/workspace/seed/standard-metadata.json';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
  user,
} from '../utils/auth-test.util';

let connection = client();
let account: Awaited<ReturnType<typeof prepareWorkspace>>;
const REDIRECT_URI = 'https://agent.example/callback';
const RESOURCE = `${ORIGIN}/mcp/v1`;

beforeAll(setupCoreTestDatabase);
beforeEach(async () => {
  connection = client();
  await clearCoreTestDatabase();
  account = await prepareWorkspace(connection);
});

const http = (path: string, options: RequestInit = {}) =>
  SELF.fetch(`${ORIGIN}${path}`, {
    ...options,
    redirect: 'manual',
    headers: { 'cf-connecting-ip': crypto.randomUUID(), ...options.headers },
  });
const session = () => ({
  cookie: connection.cookie,
  origin: ORIGIN,
  'x-crm-session-cookie': '1',
});
const postJson = (path: string, input: unknown, authenticated = false) =>
  http(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authenticated ? session() : {}),
    },
    body: JSON.stringify(input),
  });
const tokenRequest = (input: Record<string, string>) =>
  http('/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(input).toString(),
  });
const mcp = (
  token: string,
  method = 'tools/list',
  params?: Record<string, unknown>,
  headers: Record<string, string> = {},
  path = '/mcp/v1',
) =>
  http(path, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
const begin = async (patch: Record<string, string> = {}) => {
  const registered = await postJson('/oauth/register', {
    client_name: 'Test agent',
    redirect_uris: [REDIRECT_URI],
    token_endpoint_auth_method: 'none',
  });
  expect(registered.status).toBe(201);
  const { client_id: clientId } = await registered.json<{
    client_id: string;
  }>();
  const verifier = randomToken();
  const parameters = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    code_challenge: await hashToken(verifier),
    code_challenge_method: 'S256',
    resource: RESOURCE,
    scope: 'crm',
    state: 'client-state',
    ...patch,
  });
  const response = await http(`/oauth/authorize?${parameters}`);
  return {
    clientId,
    verifier,
    response,
    path: new URL(response.headers.get('location') ?? ORIGIN).searchParams.get(
      'request',
    ),
  };
};
const approve = async () => {
  const flow = await begin();
  expect(flow.response.status).toBe(302);
  const response = await postJson(
    `/oauth/mcp/requests/${flow.path}`,
    { approve: true },
    true,
  );
  expect(response.status).toBe(200);
  const { redirectUrl } = await response.json<{ redirectUrl: string }>();
  const callback = new URL(redirectUrl);
  expect(callback.searchParams.get('state')).toBe('client-state');
  expect(callback.searchParams.get('iss')).toBe(ORIGIN);
  return { ...flow, code: callback.searchParams.get('code')! };
};
const issue = async () => {
  const flow = await approve();
  const parameters = {
    grant_type: 'authorization_code',
    code: flow.code,
    code_verifier: flow.verifier,
    redirect_uri: REDIRECT_URI,
    client_id: flow.clientId,
    resource: RESOURCE,
  };
  const response = await tokenRequest(parameters);
  expect(response.status).toBe(200);
  return {
    ...flow,
    parameters,
    tokens: await response.json<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>(),
  };
};

it('advertises OAuth discovery and rejects existing credentials on the user endpoint', async () => {
  const unauthorized = await mcp('');
  expect(unauthorized.status).toBe(401);
  expect(unauthorized.headers.get('www-authenticate')).toContain(
    'resource_metadata=',
  );
  const metadata = await http('/.well-known/oauth-protected-resource/mcp/v1');
  expect(await metadata.json()).toMatchObject({
    resource: RESOURCE,
    authorization_servers: [ORIGIN],
  });
  expect(
    await (await http('/.well-known/oauth-authorization-server')).json(),
  ).toMatchObject({
    code_challenge_methods_supported: ['S256'],
    client_id_metadata_document_supported: true,
    registration_endpoint: `${ORIGIN}/oauth/register`,
  });
  expect(
    (await mcp(account.tokens.accessOrWorkspaceAgnosticToken.token)).status,
  ).toBe(401);
  expect((await http('/mcp/v1', { method: 'OPTIONS' })).status).toBe(204);
});

it('obtains user consent and records CRM writes as that user through both discovery modes', async () => {
  const flow = await issue();
  const current = await user(connection);
  expect(flow.tokens.expires_in).toBe(1800);
  const initialized = await mcp(flow.tokens.access_token, 'initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'Test', version: '1' },
  });
  expect(initialized.status).toBe(200);
  expect(
    (
      await mcp(
        flow.tokens.access_token,
        'tools/list',
        undefined,
        {},
        '/mcp/v1?mode=meta',
      )
    ).status,
  ).toBe(200);
  const created = await (
    await mcp(flow.tokens.access_token, 'tools/call', {
      name: 'create_one_company',
      arguments: { name: 'Authorized company' },
    })
  ).json<{
    result: {
      structuredContent: {
        record: { createdBy: { source: string; workspaceMemberId: string } };
      };
    };
  }>();
  expect(created.result.structuredContent.record.createdBy).toMatchObject({
    source: 'AGENT',
    workspaceMemberId: current.workspaceMembers.find(
      (member) => member.userId === current.id,
    )!.id,
  });
  const stored = await env.CORE_DB.prepare(
    'SELECT "tokenHash" FROM "mcpOAuthToken"',
  ).all<{ tokenHash: string }>();
  expect(stored.results.map((row) => row.tokenHash)).not.toContain(
    flow.tokens.access_token,
  );
  expect(
    (await mcp(flow.tokens.access_token, 'ping', undefined, {}, '/mcp')).status,
  ).toBe(401);
  const ordinaryApi = await http('/graphql', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${flow.tokens.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: '{companies {edges {node {id}}}}' }),
  });
  expect(await ordinaryApi.json()).toMatchObject({
    errors: [{ extensions: { code: 'UNAUTHENTICATED' } }],
  });
});

it.each([
  { code_challenge_method: 'plain' },
  { code_challenge: 'bad' },
  { resource: `${ORIGIN}/mcp` },
  { scope: 'admin' },
  { redirect_uri: 'https://attacker.example/callback' },
] as Record<string, string>[])(
  'rejects invalid authorization parameters %j',
  async (patch) => {
    const { response } = await begin(patch);
    if (patch.redirect_uri) expect(response.status).toBe(400);
    else {
      expect(response.status).toBe(302);
      expect(
        new URL(response.headers.get('location')!).searchParams.get('error'),
      ).toBeTruthy();
    }
  },
);

it('reflects current user object and field permissions without reauthorizing', async () => {
  const flow = await issue();
  const current = await user(connection);
  const role = await connection.request<{ createOneRole: { id: string } }>(
    'mutation {createOneRole(createRoleInput: {label: "MCP restricted user", canReadAllObjectRecords: true, canUpdateAllSettings: true}) {id}}',
  );
  expect(role.result.errors).toBeUndefined();
  const roleId = role.result.data!.createOneRole.id;
  const person = standardMetadata.tables.objectMetadata.find(
    (object) => object.nameSingular === 'person',
  )!;
  const field = standardMetadata.tables.fieldMetadata.find(
    (field) =>
      field.objectMetadataId === person.id && field.name === 'jobTitle',
  )!;
  const restricted = await connection.request(
    'mutation($input: UpsertFieldPermissionsInput!) {upsertFieldPermissions(upsertFieldPermissionsInput: $input) {id}}',
    {
      input: {
        roleId,
        fieldPermissions: [
          {
            objectMetadataId: person.id,
            fieldMetadataId: field.id,
            canReadFieldValue: false,
          },
        ],
      },
    },
  );
  expect(restricted.result.errors).toBeUndefined();
  const changed = await connection.request(
    'mutation($member: UUID!, $role: UUID!) {updateWorkspaceMemberRole(workspaceMemberId: $member, roleId: $role) {id}}',
    {
      member: current.workspaceMembers.find(
        (member) => member.userId === current.id,
      )!.id,
      role: roleId,
    },
  );
  expect(changed.result.errors).toBeUndefined();
  const tools = await (
    await mcp(flow.tokens.access_token)
  ).json<{
    result: {
      tools: {
        name: string;
        inputSchema: { properties: Record<string, unknown> };
      }[];
    };
  }>();
  expect(
    tools.result.tools.some((tool) => tool.name === 'create_one_person'),
  ).toBe(false);
  expect(
    tools.result.tools.find((tool) => tool.name === 'find_many_people')!
      .inputSchema.properties,
  ).not.toHaveProperty('jobTitle');
  const direct = await (
    await mcp(flow.tokens.access_token, 'tools/call', {
      name: 'create_one_person',
      arguments: {},
    })
  ).json();
  expect(direct).toHaveProperty('error');
  const meta = await (
    await mcp(
      flow.tokens.access_token,
      'tools/call',
      {
        name: 'execute_tool',
        arguments: { toolName: 'create_one_person', arguments: {} },
      },
      {},
      '/mcp/v1?mode=meta',
    )
  ).json();
  expect(meta).toMatchObject({ result: { isError: true } });
});

it('consumes authorization codes and refresh tokens once under concurrent exchanges', async () => {
  const flow = await approve();
  const parameters = {
    grant_type: 'authorization_code',
    code: flow.code,
    code_verifier: flow.verifier,
    redirect_uri: REDIRECT_URI,
    client_id: flow.clientId,
    resource: RESOURCE,
  };
  const exchanges = await Promise.all([
    tokenRequest(parameters),
    tokenRequest(parameters),
  ]);
  expect(exchanges.map((response) => response.status).sort()).toEqual([
    200, 400,
  ]);
  const fresh = await issue();
  const refresh = {
    grant_type: 'refresh_token',
    refresh_token: fresh.tokens.refresh_token,
    client_id: fresh.clientId,
    resource: RESOURCE,
  };
  const refreshes = await Promise.all([
    tokenRequest(refresh),
    tokenRequest(refresh),
  ]);
  expect(refreshes.map((response) => response.status).sort()).toEqual([
    200, 400,
  ]);
  expect((await mcp(fresh.tokens.access_token)).status).toBe(401);
});

it('requires explicit same-origin user consent and consumes the decision once', async () => {
  const flow = await begin();
  const path = `/oauth/mcp/requests/${flow.path}`;
  expect((await http(path)).status).toBe(401);
  const details = await http(path, { headers: session() });
  expect(await details.json()).toMatchObject({
    clientName: 'Test agent',
    workspaceName: 'Acme',
    redirectUri: REDIRECT_URI,
  });
  const forged = await http(path, {
    method: 'POST',
    headers: {
      ...session(),
      origin: 'https://attacker.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ approve: true }),
  });
  expect(forged.status).toBe(403);
  const denied = await postJson(path, { approve: false }, true);
  expect((await denied.json<{ redirectUrl: string }>()).redirectUrl).toContain(
    'error=access_denied',
  );
  expect((await postJson(path, { approve: true }, true)).status).toBe(400);
});

it('requires a matching PKCE verifier, client, callback and audience before consuming a code', async () => {
  const flow = await approve();
  const parameters = {
    grant_type: 'authorization_code',
    code: flow.code,
    code_verifier: flow.verifier,
    redirect_uri: REDIRECT_URI,
    client_id: flow.clientId,
    resource: RESOURCE,
  };
  for (const patch of [
    { code_verifier: randomToken() },
    { client_id: 'another-client' },
    { redirect_uri: 'https://agent.example/other' },
    { resource: `${ORIGIN}/mcp` },
  ])
    expect((await tokenRequest({ ...parameters, ...patch })).status).toBe(400);
  expect((await tokenRequest(parameters)).status).toBe(200);
  expect((await tokenRequest(parameters)).status).toBe(400);
});

it('rotates refresh tokens atomically and revokes the grant on reuse', async () => {
  const flow = await issue();
  const parameters = {
    grant_type: 'refresh_token',
    refresh_token: flow.tokens.refresh_token,
    client_id: flow.clientId,
    resource: RESOURCE,
  };
  const response = await tokenRequest(parameters);
  expect(response.status).toBe(200);
  const refreshed = await response.json<{
    access_token: string;
    refresh_token: string;
  }>();
  expect(refreshed.refresh_token).not.toBe(flow.tokens.refresh_token);
  expect((await mcp(refreshed.access_token)).status).toBe(200);
  expect((await tokenRequest(parameters)).status).toBe(400);
  expect((await mcp(refreshed.access_token)).status).toBe(401);
});

it('keeps authorization after browser logout and allows the owner to revoke it', async () => {
  const flow = await issue();
  await connection.request('mutation {signOut}');
  expect((await mcp(flow.tokens.access_token)).status).toBe(200);
  await connection.request(
    'mutation($email: String!, $password: String!) {signIn(email: $email, password: $password) {tokens {accessOrWorkspaceAgnosticToken {token}}}}',
    { email: account.email, password: 'Password123!' },
  );
  const connections = await (
    await http('/oauth/mcp/connections', { headers: session() })
  ).json<{ connections: { id: string }[] }>();
  expect(connections.connections).toHaveLength(1);
  expect(
    (
      await http(`/oauth/mcp/connections/${connections.connections[0].id}`, {
        method: 'DELETE',
        headers: session(),
      })
    ).status,
  ).toBe(200);
  expect((await mcp(flow.tokens.access_token)).status).toBe(401);
  expect(
    (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: flow.tokens.refresh_token,
        client_id: flow.clientId,
        resource: RESOURCE,
      })
    ).status,
  ).toBe(400);
});

it.each([
  'disabled-user',
  'removed-member',
  'inactive-workspace',
  'expired-access',
] as const)('rejects %s on subsequent calls', async (scenario) => {
  const flow = await issue();
  const current = await user(connection);
  if (scenario === 'disabled-user')
    await env.CORE_DB.prepare('UPDATE "user" SET "disabled" = 1 WHERE "id" = ?')
      .bind(current.id)
      .run();
  if (scenario === 'removed-member')
    await env.CORE_DB.prepare('DELETE FROM "userWorkspace" WHERE "id" = ?')
      .bind(current.currentUserWorkspace!.id)
      .run();
  if (scenario === 'inactive-workspace')
    await env.CORE_DB.prepare(
      'UPDATE "workspace" SET "activationStatus" = \'SUSPENDED\' WHERE "id" = ?',
    )
      .bind(account.workspaceId)
      .run();
  if (scenario === 'expired-access')
    await env.CORE_DB.prepare(
      'UPDATE "mcpOAuthToken" SET "expiresAt" = ? WHERE "type" = \'access\'',
    )
      .bind(new Date(0).toISOString())
      .run();
  expect((await mcp(flow.tokens.access_token)).status).toBe(401);
});

it('restricts cross-origin requests to the authorized client and workspace', async () => {
  const flow = await issue();
  expect(
    (
      await mcp(flow.tokens.access_token, 'ping', undefined, {
        origin: 'https://agent.example',
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await mcp(flow.tokens.access_token, 'ping', undefined, {
        origin: 'https://attacker.example',
      })
    ).status,
  ).toBe(403);
  const foreign = await SELF.fetch('https://other.example/mcp/v1', {
    method: 'POST',
    headers: { authorization: `Bearer ${flow.tokens.access_token}` },
  });
  expect(foreign.status).toBe(401);
});

it('supports standard token revocation without exposing token existence', async () => {
  const flow = await issue();
  for (const token of ['unknown', flow.tokens.refresh_token]) {
    const response = await http('/oauth/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, client_id: flow.clientId }).toString(),
    });
    expect(response.status).toBe(200);
  }
  expect((await mcp(flow.tokens.access_token)).status).toBe(401);
});

it('validates HTTPS client metadata documents and exact redirect registrations', async () => {
  const clientId = 'https://agent.example/client.json';
  const mockedFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({
      client_id: clientId,
      client_name: 'Metadata agent',
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
    }),
  );
  try {
    expect(await resolveMcpClient(env, ORIGIN, clientId)).toMatchObject({
      id: clientId,
      name: 'Metadata agent',
    });
    mockedFetch.mockResolvedValueOnce(
      Response.json({ client_id: 'https://attacker.example/client.json' }),
    );
    await expect(resolveMcpClient(env, ORIGIN, clientId)).rejects.toThrow(
      'does not match',
    );
    await expect(
      resolveMcpClient(env, ORIGIN, 'https://127.0.0.1/client.json'),
    ).rejects.toThrow('Invalid client metadata URL');
  } finally {
    mockedFetch.mockRestore();
  }
});
