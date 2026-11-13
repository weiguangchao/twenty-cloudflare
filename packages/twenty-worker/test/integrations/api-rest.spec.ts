import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import { env, SELF, runInDurableObject } from 'cloudflare:test';
import { beforeAll, beforeEach, expect, it } from 'vitest';

import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
} from '../utils/auth-test.util';
import { metadataRequest } from '../utils/event-stream-test.util';
import standardMetadata from '@/workspace/seed/standard-metadata.json';

const connection = client();
const expiresAt = '2030-01-01T00:00:00.000Z';
let token: string;
let keyId: string;
let roleId: string;
let workspaceId: string;

beforeAll(setupCoreTestDatabase);
beforeEach(async () => {
  await clearCoreTestDatabase();
  workspaceId = (await prepareWorkspace(connection)).workspaceId;
  roleId = (
    await metadataRequest<{ createOneRole: { id: string } }>(
      connection,
      'mutation {createOneRole(createRoleInput: {label: "API role", canReadAllObjectRecords: true, canUpdateAllObjectRecords: true, canSoftDeleteAllObjectRecords: true, canDestroyAllObjectRecords: true}) {id}}',
    )
  ).createOneRole.id;
  keyId = (
    await metadataRequest<{ createApiKey: { id: string } }>(
      connection,
      'mutation($input: CreateApiKeyInput!) {createApiKey(input: $input) {id name role {id}}}',
      { input: { name: 'Integration', roleId, expiresAt } },
    )
  ).createApiKey.id;
  token = (
    await metadataRequest<{ generateApiKeyToken: { token: string } }>(
      connection,
      'mutation($id: UUID!, $expires: String!) {generateApiKeyToken(apiKeyId: $id, expiresAt: $expires) {token}}',
      { id: keyId, expires: expiresAt },
    )
  ).generateApiKeyToken.token;
});

const rest = async (
  path: string,
  method = 'GET',
  body?: unknown,
  bearer = token,
) => {
  const response = await SELF.fetch(`${ORIGIN}/rest/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${bearer}`,
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    response,
    body: (await response.json()) as {
      data?: Record<string, unknown>;
      totalCount?: number;
      pageInfo?: { hasNextPage: boolean; endCursor: string };
      error?: string;
    },
  };
};

it('uses API keys for REST CRUD, filters, pagination, soft deletion and restoration', async () => {
  const created = await rest('companies', 'POST', { name: 'API company' });
  expect(created.response.status).toBe(201);
  const company = created.body.data?.createCompany as {
    id: string;
    name: string;
    createdBy: { source: string; name: string };
  };
  expect(company).toMatchObject({
    name: 'API company',
    createdBy: { source: 'API', name: 'Integration' },
  });
  const filtered = await rest(
    `companies?filter=${encodeURIComponent('name[eq]:API company')}&fields=id,name&limit=1`,
  );
  expect(filtered.body.data?.companies).toEqual([
    { id: company.id, name: company.name },
  ]);
  expect(filtered.body.totalCount).toBe(1);
  expect(
    (
      await rest(`companies/${company.id}`, 'PATCH', {
        name: 'Updated API company',
      })
    ).body.data?.updateCompany,
  ).toMatchObject({ name: 'Updated API company' });
  expect(
    (await rest(`companies/${company.id}?soft_delete=true`, 'DELETE')).response
      .status,
  ).toBe(200);
  expect(
    (await rest(`companies/${company.id}/restore`, 'PATCH', {})).response
      .status,
  ).toBe(200);
  expect(
    (await rest(`companies/${company.id}`, 'DELETE')).response.status,
  ).toBe(200);
  expect(
    (await rest('companies?limit=2&order_by=name.AscNullsLast')).body.pageInfo
      ?.hasNextPage,
  ).toBe(true);
});

it('supports batch writes and authenticates GraphQL with the same key', async () => {
  const created = await rest('batch/companies', 'POST', [
    { name: 'Batch A' },
    { name: 'Batch B' },
  ]);
  expect(created.response.status).toBe(201);
  expect(created.body.data?.createCompanies).toHaveLength(2);
  const response = await SELF.fetch(`${ORIGIN}/graphql`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: 'query { companies(first: 1) { edges {node {id name}} } }',
    }),
  });
  expect(await response.json()).toMatchObject({
    data: {
      companies: {
        edges: [
          expect.objectContaining({
            node: { id: expect.any(String), name: expect.any(String) },
          }),
        ],
      },
    },
  });
});

it('enforces current field permissions on reads, filters and writes', async () => {
  const person = standardMetadata.tables.objectMetadata.find(
    (object) => object.nameSingular === 'person',
  )!;
  const field = standardMetadata.tables.fieldMetadata.find(
    (field) =>
      field.objectMetadataId === person.id && field.name === 'jobTitle',
  )!;
  await metadataRequest(
    connection,
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
  const people = await rest('people');
  expect(people.response.status).toBe(200);
  expect(JSON.stringify(people.body)).not.toContain('jobTitle');
  expect((await rest('people?fields=id,jobTitle')).response.status).toBe(403);
  expect(
    (await rest('people?filter=jobTitle[eq]:Secret')).response.status,
  ).toBe(403);
  expect(
    (await rest('people', 'POST', { jobTitle: 'Secret' })).response.status,
  ).toBe(403);
});

it('rotates tokens and rejects revoked, expired and foreign-origin API keys', async () => {
  const original = token;
  token = (
    await metadataRequest<{ generateApiKeyToken: { token: string } }>(
      connection,
      'mutation($id: UUID!, $expires: String!) {generateApiKeyToken(apiKeyId: $id, expiresAt: $expires) {token}}',
      { id: keyId, expires: expiresAt },
    )
  ).generateApiKeyToken.token;
  expect(
    (await rest('companies', 'GET', undefined, original)).response.status,
  ).toBe(401);
  const foreign = await SELF.fetch('https://other.example.com/rest/companies', {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(foreign.status).toBe(401);
  await metadataRequest(
    connection,
    'mutation($id: UUID!) {revokeApiKey(input: {id: $id}) {id revokedAt}}',
    { id: keyId },
  );
  expect((await rest('companies')).response.status).toBe(401);
  const listed = await metadataRequest<{ apiKeys: unknown[] }>(
    connection,
    'query {apiKeys {id name revokedAt role {id}}}',
  );
  expect(listed.apiKeys).toHaveLength(1);
  expect(JSON.stringify(listed)).not.toContain('tokenHash');
});

it('loads assignable roles and key details and applies role changes immediately', async () => {
  const roles = await metadataRequest<{ getApiKeyRoles: { id: string }[] }>(
    connection,
    'query {getApiKeyRoles {id label canBeAssignedToApiKeys}}',
  );
  expect(roles.getApiKeyRoles.map((role) => role.id)).toContain(roleId);
  const details = await metadataRequest<{
    apiKey: { id: string; role: { id: string } };
  }>(
    connection,
    'query($id: UUID!) {apiKey(input: {id: $id}) {id role {id apiKeys {id name}}}}',
    { id: keyId },
  );
  expect(details.apiKey.role.id).toBe(roleId);
  expect(details.apiKey.role).toMatchObject({
    apiKeys: [{ id: keyId, name: 'Integration' }],
  });
  const readOnly = await metadataRequest<{ createOneRole: { id: string } }>(
    connection,
    'mutation {createOneRole(createRoleInput: {label: "Read only API", canReadAllObjectRecords: true}) {id}}',
  );
  await metadataRequest(
    connection,
    'mutation($key: UUID!, $role: UUID!) {assignRoleToApiKey(apiKeyId: $key, roleId: $role)}',
    { key: keyId, role: readOnly.createOneRole.id },
  );
  expect((await rest('companies')).response.status).toBe(200);
  expect(
    (await rest('companies', 'POST', { name: 'Denied after role change' }))
      .response.status,
  ).toBe(403);
  await runInDurableObject(
    env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId)),
    (_instance: WorkspaceDurableObject, state) => {
      state.storage.sql.exec(
        'UPDATE "sys_apiKey" SET "expiresAt" = ? WHERE "id" = ?',
        new Date(0).toISOString(),
        keyId,
      );
    },
  );
  expect((await rest('companies')).response.status).toBe(401);
});

it('rejects malformed paths, inputs, cursor limits and unsupported nested requests', async () => {
  expect((await rest('companies/not-an-id')).response.status).toBe(400);
  expect((await rest('companies?limit=501')).response.status).toBe(400);
  expect((await rest('companies?depth=3')).response.status).toBe(400);
  expect(
    (await rest('batch/companies', 'POST', { name: 'Invalid' })).response
      .status,
  ).toBe(400);
  expect(
    (await rest('companies', 'POST', { unknownField: 'Invalid' })).response
      .status,
  ).toBe(400);
});
