import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { isPlainObject } from 'crm-shared/utils';

import { createSession } from '@/auth/session.service';
import { FieldMetadataType } from 'crm-shared/types';
import standardMetadata from '@/workspace/seed/standard-metadata.json';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  PASSWORD,
  prepareWorkspace,
  setupCoreTestDatabase,
  user,
} from '../utils/auth-test.util';
import { STARTUP_CONTRACT_FIXTURES } from './startup-contract-fixtures';
import rolesFixture from '../../contract/fixtures/members-roles/021-GetRoles.json';

const connection = client();
let workspaceId: string;

const expectContractShape = (actual: unknown, expected: unknown, path = '') => {
  if (actual === null || expected === null) return;
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    for (const item of actual as unknown[]) {
      if (expected.length > 0) {
        const matching = isPlainObject(item)
          ? expected.find(
              (candidate) =>
                isPlainObject(candidate) &&
                (typeof item.id === 'string'
                  ? candidate.id === item.id
                  : candidate.__typename === item.__typename),
            )
          : undefined;
        expectContractShape(item, matching ?? expected[0], `${path}[]`);
      }
    }
  } else if (isPlainObject(expected)) {
    expect(isPlainObject(actual), path).toBe(true);
    expect(Object.keys(actual as object).sort(), path).toEqual(
      Object.keys(expected).sort(),
    );
    for (const [key, value] of Object.entries(expected)) {
      // JSON scalars have different shapes across field types and the filtered seed.
      if (
        ['defaultValue', 'options', 'settings', 'conditionalDisplay'].includes(
          key,
        )
      )
        continue;
      expectContractShape(
        (actual as Record<string, unknown>)[key],
        value,
        `${path}.${key}`,
      );
    }
  } else {
    expect(
      typeof actual,
      `${path}: ${JSON.stringify(actual).slice(0, 100)} / ${JSON.stringify(expected).slice(0, 100)}`,
    ).toBe(typeof expected);
  }
};

beforeAll(async () => {
  await setupCoreTestDatabase();
  await clearCoreTestDatabase();
  ({ workspaceId } = await prepareWorkspace(connection));
});

describe('captured metadata startup operations', () => {
  it('reads workspace settings and both roles with the captured member selections', async () => {
    const roles = await connection.request<{
      getRoles: { label: string; workspaceMembers: { id: string }[] }[];
    }>(rolesFixture.query);
    expect(roles.result.errors).toBeUndefined();
    expect(
      roles.result.data!.getRoles.map((role) => role.label).sort(),
    ).toEqual(['Admin', 'Member']);
    expect(
      roles.result.data!.getRoles.find((role) => role.label === 'Admin')!
        .workspaceMembers,
    ).toHaveLength(1);
    const settings = await connection.request(
      '{ currentWorkspace { displayName activationStatus defaultRole { label } workspaceMembersCount } }',
    );
    expect(settings.result.errors).toBeUndefined();
    expect(settings.result.data).toEqual({
      currentWorkspace: {
        displayName: 'Acme',
        activationStatus: 'ACTIVE',
        defaultRole: { label: 'Member' },
        workspaceMembersCount: 1,
      },
    });
  });
  it.each(STARTUP_CONTRACT_FIXTURES)(
    '$operationName satisfies the captured selection set',
    async (fixture) => {
      const { result } = await connection.request(
        fixture.query,
        fixture.variables,
      );
      expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
      expectContractShape(result.data, fixture.response.data);
    },
  );

  it('returns the ten scoped objects and connected fields without physical morph subfields', async () => {
    const result = await connection.request<{
      objects: {
        edges: {
          node: {
            id: string;
            nameSingular: string;
            fieldsList: {
              id: string;
              name: string;
              isUnique: boolean;
              isSearchable: boolean;
              relation: { targetFieldMetadata: { name: string } } | null;
              morphRelations:
                | {
                    sourceFieldMetadata: { name: string };
                    targetObjectMetadata: { id: string };
                  }[]
                | null;
            }[];
          };
        }[];
      };
    }>(
      '{ objects(paging: {first: 1000}) { edges { node { id nameSingular fieldsList { id name isUnique isSearchable relation { targetFieldMetadata { name } } morphRelations { sourceFieldMetadata { name } targetObjectMetadata { id } } } } } } }',
    );
    expect(result.result.errors).toBeUndefined();
    const objects = result.result.data!.objects.edges.map((edge) => edge.node);
    expect(objects.map((object) => object.nameSingular).sort()).toEqual(
      standardMetadata.tables.objectMetadata
        .map((object) => object.nameSingular)
        .sort(),
    );
    const person = objects.find((object) => object.nameSingular === 'person')!;
    expect(
      person.fieldsList.find((field) => field.name === 'emails'),
    ).toMatchObject({ isUnique: true, isSearchable: true });
    const noteTarget = objects.find(
      (object) => object.nameSingular === 'noteTarget',
    )!;
    expect(noteTarget.fieldsList.map((field) => field.name)).not.toContain(
      'targetCompany',
    );
    const targets = noteTarget.fieldsList.find(
      (field) => field.name === 'target',
    )!.morphRelations!;
    expect(targets).toHaveLength(3);
    expect(
      targets.every(
        (target) =>
          target.sourceFieldMetadata.name === 'target' &&
          objects.some(
            (object) => object.id === target.targetObjectMetadata.id,
          ),
      ),
    ).toBe(true);
    const company = objects.find(
      (object) => object.nameSingular === 'company',
    )!;
    expect(
      company.fieldsList.find((field) => field.name === 'noteTargets')!
        .relation!.targetFieldMetadata.name,
    ).toBe('target');
  });

  it('paginates and filters metadata and rejects invalid cursors', async () => {
    const first = await connection.request<{
      objects: {
        edges: { node: { id: string } }[];
        pageInfo: { endCursor: string; hasNextPage: boolean };
      };
    }>(
      '{ objects(paging: {first: 2}, filter: {isSystem: {is: false}}) { edges { node { id } } pageInfo { endCursor hasNextPage } } }',
    );
    expect(first.result.errors).toBeUndefined();
    const page = first.result.data!.objects;
    expect(page.edges).toHaveLength(2);
    expect(page.pageInfo.hasNextPage).toBe(true);
    const second = await connection.request<{
      objects: { edges: { node: { id: string } }[] };
    }>(
      'query($after: ConnectionCursor!) { objects(paging: {first: 2, after: $after}, filter: {isSystem: {is: false}}) { edges { node { id } } } }',
      { after: page.pageInfo.endCursor },
    );
    expect(second.result.errors).toBeUndefined();
    expect(
      second.result.data!.objects.edges.every(
        (edge) =>
          !page.edges.some((previous) => previous.node.id === edge.node.id),
      ),
    ).toBe(true);
    expect(
      (
        await connection.request(
          '{ objects(paging: {after: "invalid"}) { edges { cursor } } }',
        )
      ).result.errors?.[0].extensions.code,
    ).toBe('BAD_USER_INPUT');
  });

  it('keeps optional products out of navigation, command paths and layouts', async () => {
    const result = await connection.request<{
      navigationMenuItems: { targetObjectMetadataId: string }[];
      commandMenuItems: { payload: { path?: string } | null }[];
      getPageLayouts: { tabs: { widgets: { type: string }[] }[] }[];
    }>(
      '{ navigationMenuItems { targetObjectMetadataId } commandMenuItems { payload { ... on PathCommandMenuItemPayload { path } } } getPageLayouts { tabs { widgets { type } } } }',
    );
    expect(result.result.errors).toBeUndefined();
    const data = result.result.data!;
    const objectNames = new Map(
      standardMetadata.tables.objectMetadata.map((object) => [
        object.id,
        object.nameSingular,
      ]),
    );
    expect(
      data.navigationMenuItems
        .map((item) => objectNames.get(item.targetObjectMetadataId))
        .sort(),
    ).toEqual(['company', 'note', 'opportunity', 'person', 'task']);
    const paths = data.commandMenuItems.flatMap((item) =>
      item.payload?.path ? [item.payload.path] : [],
    );
    expect(paths).toContain('/settings/objects');
    expect(
      paths.some((path) =>
        [
          '/settings/ai',
          '/settings/billing',
          '/settings/applications',
          '/settings/accounts',
          '/settings/admin-panel',
        ].includes(path),
      ),
    ).toBe(false);
    const allowedWidgets = [
      'FIELD',
      'FIELDS',
      'FIELD_RICH_TEXT',
      'FILES',
      'FORM_FIELD',
      'NOTES',
      'TASKS',
      'TIMELINE',
    ];
    expect(
      data.getPageLayouts.every((layout) =>
        layout.tabs.every((tab) =>
          tab.widgets.every((widget) => allowedWidgets.includes(widget.type)),
        ),
      ),
    ).toBe(true);
  });

  it('returns core permissions, all members, the default role, and no optional product privileges', async () => {
    const current = await user(connection);
    expect(current.currentUserWorkspace!.objectRecordsPermissions).toHaveLength(
      10,
    );
    expect(
      current.currentUserWorkspace!.objectRecordsPermissions.every(
        (permission) =>
          permission.canReadAllRecords && permission.canUpdateAllRecords,
      ),
    ).toBe(true);
    expect(current.currentUserWorkspace!.permissionFlags).toEqual(
      expect.arrayContaining([
        'DATA_MODEL',
        'ROLES',
        'WORKSPACE_MEMBERS',
        'VIEWS',
        'IMPORT_CSV',
      ]),
    );
    expect(
      current.currentUserWorkspace!.permissionFlags.filter((flag) =>
        [
          'AI',
          'WORKFLOWS',
          'APPLICATIONS',
          'BILLING',
          'SECURITY',
          'CONNECTED_ACCOUNTS',
        ].includes(flag),
      ),
    ).toEqual([]);
    expect(current.workspaceMembers).toHaveLength(1);
    expect(current.currentWorkspace!.defaultRole.label).toBe('Member');
    const knownObject = standardMetadata.tables.objectMetadata[0].id;
    const unknownObject = crypto.randomUUID();
    const result = await connection.request<{
      recordPermissions: { permissions: { canRead: boolean } }[];
    }>(
      'query($targets: [RecordTargetInput!]!) { recordPermissions(targets: $targets) { permissions { canRead } } }',
      {
        targets: [
          { objectMetadataId: knownObject, recordId: crypto.randomUUID() },
          { objectMetadataId: unknownObject, recordId: crypto.randomUUID() },
        ],
      },
    );
    expect(
      result.result.data!.recordPermissions.map(
        (record) => record.permissions.canRead,
      ),
    ).toEqual([true, false]);
  });

  it('restricts Member settings while preserving metadata and record access', async () => {
    const { inviteHash } = (await env.CORE_DB.prepare(
      'UPDATE "workspace" SET "isPublicInviteLinkEnabled" = 1 WHERE "id" = ? RETURNING "inviteHash"',
    )
      .bind(workspaceId)
      .first<{ inviteHash: string }>())!;
    const member = client();
    const signup = await member.request<{
      signUpInWorkspace: { loginToken: { token: string } };
    }>(
      'mutation($email: String!, $password: String!, $hash: String!) { signUpInWorkspace(email: $email, password: $password, workspaceInviteHash: $hash) { loginToken { token } } }',
      {
        email: `${crypto.randomUUID()}@example.com`,
        password: PASSWORD,
        hash: inviteHash,
      },
    );
    expect(signup.result.errors).toBeUndefined();
    expect(
      (
        await member.request(
          'mutation($token: String!, $origin: String!) { getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) { tokens { accessOrWorkspaceAgnosticToken { token } } } }',
          {
            token: signup.result.data!.signUpInWorkspace.loginToken.token,
            origin: ORIGIN,
          },
        )
      ).result.errors,
    ).toBeUndefined();
    const current = await user(member);
    expect(current.workspaceMembers).toHaveLength(2);
    expect((await user(connection)).workspaceMembers).toHaveLength(2);
    expect(current.currentUserWorkspace!.permissionFlags).toContain('VIEWS');
    expect(current.currentUserWorkspace!.permissionFlags).toContain(
      'IMPORT_CSV',
    );
    expect(current.currentUserWorkspace!.permissionFlags).not.toContain(
      'DATA_MODEL',
    );
    expect(
      (
        await member.request(
          '{ objects(paging: {first: 1000}) { edges { node { id } } } }',
        )
      ).result.errors,
    ).toBeUndefined();
    expect(
      (await member.request('{ getRoles { id } }')).result.errors?.[0]
        .extensions.code,
    ).toBe('FORBIDDEN');
  });

  it('refreshes field data and collection hashes after a metadata operation', async () => {
    const query =
      '{ minimalMetadata { collectionHashes { collectionName hash } } }';
    const before = await connection.request<{
      minimalMetadata: {
        collectionHashes: { collectionName: string; hash: string }[];
      };
    }>(query);
    const company = standardMetadata.tables.objectMetadata.find(
      (object) => object.nameSingular === 'company',
    )!;
    const stub = env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId));
    expect(
      (
        await stub.createField({
          objectMetadataId: company.id,
          name: 'referenceCode',
          label: 'Reference Code',
          type: FieldMetadataType.TEXT,
        })
      ).status,
    ).toBe('success');
    const after = await connection.request<{
      minimalMetadata: {
        collectionHashes: { collectionName: string; hash: string }[];
      };
    }>(query);
    expect(
      after.result.data!.minimalMetadata.collectionHashes.find(
        (item) => item.collectionName === 'fieldMetadata',
      )!.hash,
    ).not.toBe(
      before.result.data!.minimalMetadata.collectionHashes.find(
        (item) => item.collectionName === 'fieldMetadata',
      )!.hash,
    );
    const result = await connection.request<{
      object: { fieldsList: { name: string }[] };
    }>('query($id: UUID!) { object(id: $id) { fieldsList { name } } }', {
      id: company.id,
    });
    expect(
      result.result.data!.object.fieldsList.map((field) => field.name),
    ).toContain('referenceCode');
  });

  it('rejects unauthenticated metadata reads and accepts anonymous analytics without changing session state', async () => {
    const anonymous = client();
    expect(
      (
        await anonymous.request(
          '{ minimalMetadata { objectMetadataItems { id } } }',
        )
      ).result.errors?.[0].extensions.code,
    ).toBe('UNAUTHENTICATED');
    expect(
      (
        await anonymous.request(
          'mutation { trackAnalytics(type: PAGEVIEW) { success } }',
        )
      ).result.data,
    ).toEqual({ trackAnalytics: { success: true } });
  });

  it('selects metadata only from the authenticated workspace, including with Bearer credentials', async () => {
    const current = await user(connection);
    const secondWorkspaceId = crypto.randomUUID();
    const userWorkspaceId = crypto.randomUUID();
    const workspaceMemberId = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.CORE_DB.batch([
      env.CORE_DB.prepare(
        'INSERT INTO "workspace" ("id", "displayName", "origin", "inviteHash", "creatorUserId", "activationStatus", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        secondWorkspaceId,
        'Other Workspace',
        'https://other.example',
        crypto.randomUUID(),
        current.id,
        'ACTIVE',
        now,
        now,
      ),
      env.CORE_DB.prepare(
        'INSERT INTO "userWorkspace" ("id", "userId", "workspaceId", "workspaceMemberId", "createdAt") VALUES (?, ?, ?, ?, ?)',
      ).bind(
        userWorkspaceId,
        current.id,
        secondWorkspaceId,
        workspaceMemberId,
        now,
      ),
    ]);
    const otherWorkspace = env.WORKSPACE.get(
      env.WORKSPACE.idFromName(secondWorkspaceId),
    );
    await otherWorkspace.activateWorkspace({
      userId: current.id,
      email: current.email,
      firstName: 'Other',
      lastName: 'Member',
      locale: 'en',
      userWorkspaceId,
      workspaceMemberId,
    });
    const created = await otherWorkspace.createObject({
      nameSingular: 'privateProject',
      namePlural: 'privateProjects',
      labelSingular: 'Private Project',
      labelPlural: 'Private Projects',
    });
    expect(created.status).toBe('success');
    if (created.status !== 'success') return;
    const objectId = created.value.id;
    const tokens = await createSession(
      env,
      new Request(`${ORIGIN}/metadata`),
      new Headers(),
      current.id,
      userWorkspaceId,
      secondWorkspaceId,
    );
    const query = 'query($id: UUID!) { object(id: $id) { nameSingular } }';
    const scoped = await client().request(
      query,
      { id: objectId },
      {
        authorization: `Bearer ${tokens.accessOrWorkspaceAgnosticToken.token}`,
      },
    );
    expect(scoped.result.data).toEqual({
      object: { nameSingular: 'privateProject' },
    });
    expect(
      (await connection.request(query, { id: objectId })).result.errors?.[0]
        .extensions.code,
    ).toBe('NOT_FOUND');
  });
});
