import { SELF } from 'cloudflare:test';
import { beforeAll, expect, it } from 'vitest';

import manyMembers from '../../contract/fixtures/members-roles/017-FindManyWorkspaceMembers.json';
import oneMember from '../../contract/fixtures/members-roles/052-FindOneWorkspaceMember.json';
import companies from '../../contract/fixtures/auth-signup-onboarding/042-FindManyCompanies.json';
import {
  projectRecordQuery,
  standardRecordSchema,
} from '../utils/project-record-query.util';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
  user,
  type Result,
} from '../utils/auth-test.util';

const connection = client();
const schema = standardRecordSchema();

const recordsRequest = async <TData = Record<string, unknown>>(
  query: string,
  variables: Record<string, unknown> = {},
  origin = ORIGIN,
) => {
  const response = await SELF.fetch(`${ORIGIN}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-twenty-session-cookie': '1',
      origin,
      cookie: connection.cookie,
    },
    body: JSON.stringify({
      query: projectRecordQuery(query, schema),
      variables,
    }),
  });
  return { response, result: (await response.json()) as Result<TData> };
};

beforeAll(async () => {
  await setupCoreTestDatabase();
  await clearCoreTestDatabase();
  await prepareWorkspace(connection);
});

it('reads member settings fields through the captured record API contracts', async () => {
  const current = await user(connection);
  const list = await recordsRequest<{
    workspaceMembers: {
      totalCount: number;
      edges: {
        node: {
          id: string;
          createdBy: { source: string };
          name: { firstName: string };
        };
      }[];
    };
  }>(manyMembers.query, { limit: 60 });
  expect(list.result.errors).toBeUndefined();
  expect(list.result.data!.workspaceMembers.totalCount).toBe(1);
  expect(list.result.data!.workspaceMembers.edges[0].node).toMatchObject({
    id: current.workspaceMember!.id,
    name: { firstName: '' },
    createdBy: { source: 'MANUAL' },
  });
  const detail = await recordsRequest<{
    workspaceMember: { id: string; assignedTasks: { edges: unknown[] } };
  }>(oneMember.query, { objectRecordId: current.workspaceMember!.id });
  expect(detail.result.errors).toBeUndefined();
  expect(detail.result.data!.workspaceMember).toMatchObject({
    id: current.workspaceMember!.id,
    assignedTasks: { edges: [] },
  });
});

it('filters and pages members and reads demo CRM records', async () => {
  const absent = await recordsRequest<{
    workspaceMembers: { totalCount: number; edges: unknown[] };
  }>(manyMembers.query, {
    filter: {
      or: [
        { name: { firstName: { ilike: '%Nobody%' } } },
        { userEmail: { ilike: '%not-a-member%' } },
      ],
    },
    limit: 60,
  });
  expect(absent.result.errors).toBeUndefined();
  expect(absent.result.data!.workspaceMembers).toMatchObject({
    totalCount: 0,
    edges: [],
  });
  const page = await recordsRequest<{
    workspaceMembers: { totalCount: number; edges: unknown[] };
  }>(manyMembers.query, { offset: 1, limit: 60 });
  expect(page.result.data!.workspaceMembers).toMatchObject({
    totalCount: 1,
    edges: [],
  });
  const records = await recordsRequest<{ companies: { edges: unknown[] } }>(
    companies.query,
    { limit: 60 },
  );
  expect(records.result.errors).toBeUndefined();
  expect(records.result.data!.companies.edges).toHaveLength(5);
});

it('authenticates shell queries, rejects cross-origin requests, and blocks record mutations', async () => {
  const unauthorized = await SELF.fetch(`${ORIGIN}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: manyMembers.query,
      variables: { limit: 60 },
    }),
  });
  expect(
    ((await unauthorized.json()) as Result<unknown>).errors?.[0].extensions
      .code,
  ).toBe('UNAUTHENTICATED');
  expect(
    (await recordsRequest(manyMembers.query, {}, 'https://evil.example'))
      .response.status,
  ).toBe(403);
  const mutation = await recordsRequest(
    'mutation { createCompany(data: {name: "Do not create"}) { id } }',
  );
  expect(mutation.result.errors?.[0].extensions.code).toBe('NOT_IMPLEMENTED');
});
