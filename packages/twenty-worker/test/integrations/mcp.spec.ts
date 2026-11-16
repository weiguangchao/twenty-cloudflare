import { env, SELF, runInDurableObject } from 'cloudflare:test';
import { beforeAll, beforeEach, expect, it } from 'vitest';

import standardMetadata from '@/workspace/seed/standard-metadata.json';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
} from '../utils/auth-test.util';
import { metadataRequest } from '../utils/event-stream-test.util';

type Tool = {
  name: string;
  inputSchema: {
    properties: Record<string, unknown>;
    definitions: Record<string, unknown>;
  };
  annotations: { readOnlyHint: boolean; destructiveHint: boolean };
};
type ProtocolResult = {
  jsonrpc: string;
  id: string | number | null;
  result?: {
    tools?: Tool[];
    isError?: boolean;
    content?: { type: string; text: string }[];
    structuredContent?: Record<string, unknown>;
  };
  error?: { code: number; message: string };
};

let connection = client();
const EXPIRES_AT = '2030-01-01T00:00:00.000Z';
let token: string;
let keyId: string;
let roleId: string;
let workspaceId: string;

beforeAll(setupCoreTestDatabase);
beforeEach(async () => {
  connection = client();
  await clearCoreTestDatabase();
  workspaceId = (await prepareWorkspace(connection)).workspaceId;
  roleId = (
    await metadataRequest<{ createOneRole: { id: string } }>(
      connection,
      'mutation {createOneRole(createRoleInput: {label: "MCP role", canReadAllObjectRecords: true, canUpdateAllObjectRecords: true, canSoftDeleteAllObjectRecords: true, canDestroyAllObjectRecords: true}) {id}}',
    )
  ).createOneRole.id;
  keyId = (
    await metadataRequest<{ createApiKey: { id: string } }>(
      connection,
      'mutation($input: CreateApiKeyInput!) {createApiKey(input: $input) {id}}',
      { input: { name: 'MCP client', roleId, expiresAt: EXPIRES_AT } },
    )
  ).createApiKey.id;
  token = await rotateToken();
});

const rotateToken = async () =>
  (
    await metadataRequest<{ generateApiKeyToken: { token: string } }>(
      connection,
      'mutation($id: UUID!, $expires: String!) {generateApiKeyToken(apiKeyId: $id, expiresAt: $expires) {token}}',
      { id: keyId, expires: EXPIRES_AT },
    )
  ).generateApiKeyToken.token;

const send = (
  body: unknown,
  headers: Record<string, string> = {},
  path = '/mcp',
) =>
  SELF.fetch(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
const request = async (
  method: string,
  params?: Record<string, unknown>,
  path = '/mcp',
) => {
  const response = await send(
    { jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) },
    {},
    path,
  );
  return { response, body: (await response.json()) as ProtocolResult };
};
const call = async (
  name: string,
  arguments_: Record<string, unknown> = {},
  path = '/mcp',
) => {
  const result = await request(
    'tools/call',
    { name, arguments: arguments_ },
    path,
  );
  expect(result.response.status).toBe(200);
  expect(result.body.error).toBeUndefined();
  return result.body.result!;
};
const successfulCall = async (
  name: string,
  arguments_: Record<string, unknown> = {},
  path = '/mcp',
) => {
  const result = await call(name, arguments_, path);
  expect(result.isError, JSON.stringify(result.content)).toBe(false);
  expect(JSON.parse(result.content![0].text)).toEqual(result.structuredContent);
  return result.structuredContent!;
};

it('negotiates protocol versions and returns authenticated stateless initialization', async () => {
  for (const protocolVersion of [
    '2025-11-25',
    '2025-06-18',
    '2025-03-26',
    'unknown',
  ]) {
    const initialized = await request('initialize', {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: 'Integration test', version: '1.0' },
    });
    expect(initialized.response.status).toBe(200);
    expect(initialized.response.headers.get('mcp-session-id')).toBeNull();
    expect(initialized.response.headers.get('cache-control')).toBe('no-store');
    expect(initialized.body).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion:
          protocolVersion === 'unknown' ? '2025-11-25' : protocolVersion,
        capabilities: { tools: { listChanged: false } },
      },
    });
  }
  expect((await request('initialize')).body.error?.code).toBe(-32602);
  expect((await request('ping')).body.result).toEqual({});
  expect((await request('resources/list')).body.result).toEqual({
    resources: [],
  });
  expect((await request('resources/templates/list')).body.result).toEqual({
    resourceTemplates: [],
  });
  expect((await request('prompts/list')).body.result).toEqual({ prompts: [] });
});

it('supports the SSE response envelope and ignores notifications without executing tools', async () => {
  const response = await send(
    { jsonrpc: '2.0', id: 'ping', method: 'ping' },
    {
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
    },
  );
  expect(response.headers.get('content-type')).toBe('text/event-stream');
  expect(await response.text()).toBe(
    'event: message\ndata: {"jsonrpc":"2.0","id":"ping","result":{}}\n\n',
  );
  for (const message of [
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'create_one_company',
        arguments: { name: 'Notification must not write' },
      },
    },
  ]) {
    const notification = await send(message);
    expect(notification.status).toBe(202);
    expect(await notification.text()).toBe('');
  }
  expect(
    (
      await successfulCall('find_many_companies', {
        name: { eq: 'Notification must not write' },
      })
    ).count,
  ).toBe(0);
});

it('discovers permission-aware tools and supports the upstream meta discovery mode', async () => {
  const tools = (await request('tools/list')).body.result!.tools!;
  expect(tools.map((tool) => tool.name)).toEqual(
    expect.arrayContaining([
      'find_many_people',
      'find_one_company',
      'create_one_company',
      'update_many_companies',
      'delete_one_company',
      'restore_one_company',
      'destroy_one_company',
      'merge_many_companies',
      'aggregate_companies',
      'group_by_opportunities',
      'search',
      'list_object_metadata_names',
      'get_object_metadata',
    ]),
  );
  expect(tools.map((tool) => tool.name)).not.toContain(
    'create_one_workspace_member',
  );
  expect(
    tools.find((tool) => tool.name === 'find_many_people')!.annotations
      .readOnlyHint,
  ).toBe(true);
  expect(
    tools.find((tool) => tool.name === 'destroy_one_company')!.annotations
      .destructiveHint,
  ).toBe(true);
  const meta = (await request('tools/list', undefined, '/mcp?mode=meta')).body
    .result!.tools!;
  expect(meta.map((tool) => tool.name)).toEqual([
    'list_object_metadata_names',
    'get_object_metadata',
    'get_tool_catalog',
    'learn_tools',
    'execute_tool',
  ]);
  const learned = await successfulCall(
    'learn_tools',
    { toolNames: ['find_many_companies', 'unavailable'] },
    '/mcp?mode=meta',
  );
  expect(learned).toMatchObject({
    tools: [{ name: 'find_many_companies', inputSchema: { type: 'object' } }],
    notFound: ['unavailable'],
  });
  const catalog = await successfulCall('get_tool_catalog', {
    categories: ['METADATA'],
  });
  expect(Object.keys(catalog.catalog as object)).toEqual(['METADATA']);
  const records = await successfulCall(
    'execute_tool',
    {
      toolName: 'find_many_companies',
      arguments: { limit: 1, select: ['id', 'name'] },
    },
    '/mcp?mode=meta',
  );
  expect(records.records).toHaveLength(1);
  expect(
    (await call('execute_tool', { toolName: 'execute_tool', arguments: {} }))
      .isError,
  ).toBe(true);
});

it('uses CRM writes, relations and lifecycle operations with an agent actor', async () => {
  const created = await successfulCall('create_one_company', {
    name: 'MCP company',
  });
  const company = created.record as { id: string };
  expect(created.record).toMatchObject({
    name: 'MCP company',
    createdBy: { source: 'AGENT', name: 'MCP client' },
  });
  const person = await successfulCall('create_one_person', {
    name: { firstName: 'MCP', lastName: 'Person' },
    companyId: company.id,
  });
  expect(person.record).toMatchObject({
    companyId: company.id,
    company: { id: company.id },
  });
  expect(
    await successfulCall('find_one_company', {
      id: company.id,
      select: ['name'],
    }),
  ).toEqual({ record: { id: company.id, name: 'MCP company' } });
  expect(
    await successfulCall('update_one_company', {
      id: company.id,
      name: 'MCP updated',
    }),
  ).toMatchObject({
    record: { name: 'MCP updated', updatedBy: { source: 'AGENT' } },
  });
  await successfulCall('delete_one_company', { id: company.id });
  expect((await call('find_one_company', { id: company.id })).isError).toBe(
    true,
  );
  await successfulCall('restore_one_company', { id: company.id });
  expect(
    (await successfulCall('find_one_company', { id: company.id })).record,
  ).toMatchObject({ id: company.id });
  await successfulCall('destroy_one_company', { id: company.id });
  expect((await call('find_one_company', { id: company.id })).isError).toBe(
    true,
  );
});

it('filters and paginates records, supports batches, upsert, aggregates and global search', async () => {
  await successfulCall('create_many_companies', {
    records: [
      {
        name: 'MCP batch A',
        annualRevenue: { amountMicros: 2, currencyCode: 'USD' },
      },
      {
        name: 'MCP batch B',
        annualRevenue: { amountMicros: 3, currencyCode: 'USD' },
      },
    ],
  });
  const first = await successfulCall('find_many_companies', {
    name: { startsWith: 'MCP batch' },
    orderBy: [{ name: 'AscNullsLast' }],
    limit: 1,
    select: ['id', 'name'],
  });
  expect(first).toMatchObject({
    count: 2,
    hasNextPage: true,
    records: [{ name: 'MCP batch A' }],
  });
  expect(
    await successfulCall('find_many_companies', {
      name: { startsWith: 'MCP batch' },
      orderBy: [{ name: 'AscNullsLast' }],
      offset: 1,
      select: ['name'],
    }),
  ).toMatchObject({ hasNextPage: false, records: [{ name: 'MCP batch B' }] });
  expect(
    await successfulCall('aggregate_companies', {
      filter: { name: { startsWith: 'MCP batch' } },
      aggregates: ['totalCount', 'sumAnnualRevenueAmountMicros'],
    }),
  ).toEqual({ aggregates: { totalCount: 2, sumAnnualRevenueAmountMicros: 5 } });
  expect(
    await successfulCall('group_by_companies', {
      groupBy: [{ annualRevenue: { amountMicros: true } }],
      filter: { name: { startsWith: 'MCP batch' } },
    }),
  ).toMatchObject({
    groups: [
      { groupByDimensionValues: [2], totalCount: 1 },
      { groupByDimensionValues: [3], totalCount: 1 },
    ],
  });
  const upserted = await successfulCall('upsert_many_companies', {
    records: [
      {
        name: 'MCP upsert',
        domainName: { primaryLinkUrl: 'https://mcp.example.com' },
      },
    ],
  });
  const updated = await successfulCall('upsert_many_companies', {
    records: [
      {
        name: 'MCP upsert changed',
        domainName: { primaryLinkUrl: 'https://mcp.example.com' },
      },
    ],
  });
  expect((updated.records as { id: string }[])[0].id).toBe(
    (upserted.records as { id: string }[])[0].id,
  );
  expect(
    await successfulCall('update_many_companies', {
      filter: { name: { startsWith: 'MCP batch' } },
      data: { annualRevenue: { amountMicros: 5, currencyCode: 'USD' } },
    }),
  ).toMatchObject({
    records: [
      { annualRevenue: { amountMicros: 5 } },
      { annualRevenue: { amountMicros: 5 } },
    ],
  });
  const searched = await successfulCall('search', {
    searchInput: 'MCP upsert changed',
  });
  expect(searched).toMatchObject({
    search: {
      edges: expect.arrayContaining([
        expect.objectContaining({
          node: expect.objectContaining({ label: 'MCP upsert changed' }),
        }),
      ]),
    },
  });
});

it('rolls back failed batches and rejects invalid arguments without writing', async () => {
  const result = await call('create_many_companies', {
    records: [{ name: 'MCP rollback' }, { employees: 'invalid' }],
  });
  expect(result.isError).toBe(true);
  const invalid = await call('create_many_companies', {
    records: [
      {
        name: 'MCP rollback',
        domainName: { primaryLinkUrl: 'https://rollback.example.com' },
      },
      {
        name: 'Invalid company',
        domainName: { primaryLinkUrl: 'https://rollback.example.com' },
      },
    ],
  });
  expect(invalid.isError).toBe(true);
  expect(
    (
      await successfulCall('find_many_companies', {
        name: { eq: 'MCP rollback' },
      })
    ).count,
  ).toBe(0);
  for (const [name, arguments_] of [
    ['find_many_companies', { limit: 101 }],
    ['find_many_companies', { name: { regex: '.*' } }],
    ['find_many_companies', { select: ['name } bad { id'] }],
    ['create_one_company', { unknown: 'value' }],
    ['create_many_companies', { records: { name: 'Invalid singleton' } }],
    ['find_many_companies', { select: 'name' }],
    ['update_one_company', { name: 'Missing id' }],
    [
      'create_many_companies',
      {
        records: Array.from({ length: 201 }, () => ({
          name: 'Too many MCP records',
        })),
      },
    ],
  ] as const)
    expect((await call(name, arguments_)).isError).toBe(true);
});

it('applies hidden fields to schemas, metadata, filters, ordering, results and writes', async () => {
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
  const tools = (await request('tools/list')).body.result!.tools!;
  for (const tool of tools) {
    if (
      ['find_many_people', 'create_one_person', 'update_one_person'].includes(
        tool.name,
      )
    )
      expect(tool.inputSchema.properties).not.toHaveProperty('jobTitle');
    for (const [name, definition] of Object.entries(
      tool.inputSchema.definitions,
    )) {
      if (
        [
          'McpPersonFilterInput',
          'McpPersonOrderByInput',
          'McpPersonCreateInput',
          'McpPersonUpdateInput',
          'McpPersonGroupByInput',
        ].includes(name)
      )
        expect(
          (definition as { properties: object }).properties,
        ).not.toHaveProperty('jobTitle');
    }
  }
  const metadata = await successfulCall('get_object_metadata', {
    objectName: 'person',
    includeFields: true,
  });
  expect(JSON.stringify(metadata)).not.toContain('jobTitle');
  for (const person of (await successfulCall('find_many_people'))
    .records as object[])
    expect(person).not.toHaveProperty('jobTitle');
  for (const [name, arguments_] of [
    ['find_many_people', { jobTitle: { eq: 'Secret' } }],
    ['find_many_people', { orderBy: [{ jobTitle: 'AscNullsLast' }] }],
    ['find_many_people', { select: ['jobTitle'] }],
    ['create_one_person', { jobTitle: 'Secret' }],
    ['aggregate_people', { aggregates: ['countEmptyJobTitle'] }],
    [
      'execute_tool',
      { toolName: 'create_one_person', arguments: { jobTitle: 'Secret' } },
    ],
  ] as const)
    expect((await call(name, arguments_)).isError).toBe(true);
});

it('rebuilds tools after role changes and prevents nested writes to protected members', async () => {
  expect(
    (
      await call('create_one_task', {
        title: 'Blocked member',
        assignee: { create: { name: { firstName: 'Injected' } } },
      })
    ).isError,
  ).toBe(true);
  const readOnly = (
    await metadataRequest<{ createOneRole: { id: string } }>(
      connection,
      'mutation {createOneRole(createRoleInput: {label: "MCP read only", canReadAllObjectRecords: true}) {id}}',
    )
  ).createOneRole.id;
  await metadataRequest(
    connection,
    'mutation($key: UUID!, $role: UUID!) {assignRoleToApiKey(apiKeyId: $key, roleId: $role)}',
    { key: keyId, role: readOnly },
  );
  const tools = (await request('tools/list')).body.result!.tools!;
  expect(
    tools.some((tool) =>
      /^(create|update|delete|restore|destroy|merge|upsert)_.+_compan(y|ies)$/.test(
        tool.name,
      ),
    ),
  ).toBe(false);
  expect(
    (
      await request('tools/call', {
        name: 'create_one_company',
        arguments: { name: 'Denied' },
      })
    ).body.error?.code,
  ).toBe(-32602);
  expect(
    (
      await call('execute_tool', {
        toolName: 'create_one_company',
        arguments: { name: 'Denied' },
      })
    ).isError,
  ).toBe(true);
  expect(
    (await successfulCall('find_many_companies', { limit: 1 })).records,
  ).toHaveLength(1);
});

it('discovers custom objects and fields immediately after metadata changes', async () => {
  const object = (
    await metadataRequest<{ createOneObject: { id: string } }>(
      connection,
      'mutation($input: CreateOneObjectInput!) {createOneObject(input: $input) {id}}',
      {
        input: {
          object: {
            nameSingular: 'mcpProject',
            namePlural: 'mcpProjects',
            labelSingular: 'MCP Project',
            labelPlural: 'MCP Projects',
            icon: 'IconTarget',
          },
        },
      },
    )
  ).createOneObject;
  const field = (
    await metadataRequest<{ createOneField: { id: string } }>(
      connection,
      'mutation($input: CreateOneFieldMetadataInput!) {createOneField(input: $input) {id}}',
      {
        input: {
          field: {
            objectMetadataId: object.id,
            name: 'reference',
            label: 'Reference',
            type: 'TEXT',
          },
        },
      },
    )
  ).createOneField;
  expect(
    (await request('tools/list')).body.result!.tools!.map((tool) => tool.name),
  ).toContain('create_one_mcp_project');
  expect(
    await successfulCall('create_one_mcp_project', {
      name: 'Custom CRM',
      reference: 'Preserved',
    }),
  ).toMatchObject({ record: { reference: 'Preserved' } });
  await metadataRequest(
    connection,
    'mutation($input: UpdateOneFieldMetadataInput!) {updateOneField(input: $input) {id}}',
    {
      input: {
        id: field.id,
        update: { name: 'trackingReference', label: 'Tracking Reference' },
      },
    },
  );
  const tool = (await request('tools/list')).body.result!.tools!.find(
    (tool) => tool.name === 'create_one_mcp_project',
  )!;
  expect(tool.inputSchema.properties).toHaveProperty('trackingReference');
  expect(tool.inputSchema.properties).not.toHaveProperty('reference');
  expect(
    await successfulCall('find_many_mcp_projects', {
      select: ['trackingReference'],
    }),
  ).toMatchObject({ records: [{ trackingReference: 'Preserved' }] });
});

it('authenticates initialization, discovery and notifications and rejects stale credentials', async () => {
  expect(
    (
      await send(
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { authorization: '' },
      )
    ).status,
  ).toBe(401);
  const oldToken = token;
  token = await rotateToken();
  const old = await send(
    { jsonrpc: '2.0', id: 1, method: 'initialize' },
    { authorization: `Bearer ${oldToken}` },
  );
  expect(old.status).toBe(401);
  expect(old.headers.get('www-authenticate')).toContain('Bearer');
  const foreign = await SELF.fetch('https://other.example.com/mcp', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  expect(foreign.status).toBe(401);
  await metadataRequest(
    connection,
    'mutation($id: UUID!) {revokeApiKey(input: {id: $id}) {id}}',
    { id: keyId },
  );
  expect((await request('tools/list')).response.status).toBe(401);
  expect(
    (await send({ jsonrpc: '2.0', method: 'notifications/initialized' }))
      .status,
  ).toBe(401);
});

it('rejects expired keys before returning protocol responses', async () => {
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
  expect((await request('ping')).response.status).toBe(401);
});

it('previews merges without writing and preserves relations when merging', async () => {
  const first = (
    await successfulCall('create_one_company', { name: 'MCP merge first' })
  ).record as { id: string };
  const second = (
    await successfulCall('create_one_company', { name: 'MCP merge second' })
  ).record as { id: string };
  const person = (
    await successfulCall('create_one_person', {
      name: { firstName: 'Merge target' },
      companyId: second.id,
    })
  ).record as { id: string };
  const input = { ids: [first.id, second.id], conflictPriorityIndex: 0 };
  expect(
    await successfulCall('merge_many_companies', { ...input, dryRun: true }),
  ).toMatchObject({ record: { id: first.id } });
  expect(
    await successfulCall('find_one_person', {
      id: person.id,
      select: ['companyId'],
    }),
  ).toMatchObject({ record: { companyId: second.id } });
  await successfulCall('merge_many_companies', input);
  expect(
    await successfulCall('find_one_person', {
      id: person.id,
      select: ['companyId'],
    }),
  ).toMatchObject({ record: { companyId: first.id } });
  expect((await call('find_one_company', { id: second.id })).isError).toBe(
    true,
  );
});

it('removes unreadable objects from tools, nested schemas, metadata and search', async () => {
  const company = standardMetadata.tables.objectMetadata.find(
    (object) => object.nameSingular === 'company',
  )!;
  await metadataRequest(
    connection,
    'mutation($input: UpsertObjectPermissionsInput!) {upsertObjectPermissions(upsertObjectPermissionsInput: $input) {objectMetadataId}}',
    {
      input: {
        roleId,
        objectPermissions: [
          {
            objectMetadataId: company.id,
            canReadObjectRecords: false,
            canUpdateObjectRecords: false,
            canSoftDeleteObjectRecords: false,
            canDestroyObjectRecords: false,
          },
        ],
      },
    },
  );
  const tools = (await request('tools/list')).body.result!.tools!;
  expect(tools.some((tool) => /_compan(y|ies)$/.test(tool.name))).toBe(false);
  for (const tool of tools)
    expect(
      Object.keys(tool.inputSchema.definitions).some((name) =>
        name.startsWith('McpCompany'),
      ),
    ).toBe(false);
  expect(
    await successfulCall('get_object_metadata', { objectName: 'company' }),
  ).toEqual({ objects: [] });
  const names = await successfulCall('list_object_metadata_names');
  expect(names.objectNames).not.toContain('companies');
  const result = await successfulCall('search', { searchInput: 'Airbnb' });
  expect(
    (
      result.search as { edges: { node: { objectNameSingular: string } }[] }
    ).edges.some((edge) => edge.node.objectNameSingular === 'company'),
  ).toBe(false);
});

it('enforces the request size limit for fixed-size and streamed bodies', async () => {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'ping',
    params: { padding: 'x'.repeat(2_000_000) },
  });
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
  const fixed = await SELF.fetch(`${ORIGIN}/mcp`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-length': String(new TextEncoder().encode(body).length),
    },
    body,
  });
  expect(fixed.status).toBe(413);
  const streamed = await SELF.fetch(`${ORIGIN}/mcp`, {
    method: 'POST',
    headers,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }),
  });
  expect(streamed.status).toBe(413);
});

it('enforces session authentication, CSRF, Origin and session revocation', async () => {
  const message = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
  const headers = {
    authorization: '',
    cookie: connection.cookie,
    origin: ORIGIN,
    'x-twenty-session-cookie': '1',
  };
  expect((await send(message, headers)).status).toBe(200);
  expect((await send(message, { ...headers, origin: '' })).status).toBe(403);
  expect(
    (
      await SELF.fetch(`${ORIGIN}/mcp`, {
        method: 'POST',
        headers: {
          cookie: connection.cookie,
          origin: ORIGIN,
          'content-type': 'application/json',
        },
        body: JSON.stringify(message),
      })
    ).status,
  ).toBe(401);
  expect(
    (await send(message, { origin: 'https://attacker.example.com' })).status,
  ).toBe(403);
  await metadataRequest(connection, 'mutation {signOut}');
  expect((await send(message, headers)).status).toBe(401);
});

it('returns JSON-RPC errors for malformed messages, unsupported methods and invalid transports', async () => {
  for (const body of [
    [],
    {},
    { jsonrpc: '1.0', id: 1, method: 'ping' },
    { jsonrpc: '2.0', id: null, method: 'ping' },
    { jsonrpc: '2.0', id: 1, method: 'ping', params: [] },
  ]) {
    const response = await send(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: -32600 } });
  }
  const malformed = await SELF.fetch(`${ORIGIN}/mcp`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: '{',
  });
  expect(await malformed.json()).toMatchObject({ error: { code: -32700 } });
  expect((await request('unsupported')).body.error?.code).toBe(-32601);
  expect(
    (await request('tools/call', { name: 'unknown' })).body.error?.code,
  ).toBe(-32602);
  expect(
    (await request('tools/call', { name: 'search', arguments: [] })).body.error
      ?.code,
  ).toBe(-32602);
  expect(
    (await request('tools/list', { cursor: 'bad' })).body.error?.code,
  ).toBe(-32602);
  expect(
    (
      await send(
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { 'mcp-protocol-version': 'unsupported' },
      )
    ).status,
  ).toBe(400);
  expect((await send({}, { 'content-type': 'text/plain' })).status).toBe(415);
  expect((await send({}, { accept: 'text/html' })).status).toBe(406);
  for (const method of ['GET', 'DELETE', 'PUT']) {
    const response = await SELF.fetch(`${ORIGIN}/mcp`, {
      method,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  }
});
