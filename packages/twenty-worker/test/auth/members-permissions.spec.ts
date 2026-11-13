import { runMetadataOperation } from '@/workspace/metadata/operations/run-metadata-operation.util';
import {
  projectRecordQuery,
  standardRecordSchema,
} from '../utils/project-record-query.util';
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { beforeAll, expect, it } from 'vitest';

import standardMetadata from '@/workspace/seed/standard-metadata.json';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import { processOutbox } from '@/workspace/events/process-outbox.util';
import {
  removeWorkspaceMember,
  processMemberCleanup,
} from '@/workspace/lifecycle/remove-workspace-member.util';
import {
  updateWorkspaceSettings,
  processWorkspaceSettings,
} from '@/workspace/lifecycle/workspace-settings.util';
import createRoleFixture from '../../contract/fixtures/members-roles/024-CreateOneRole.json';
import fieldFixture from '../../contract/fixtures/members-roles/033-UpsertFieldPermissions.json';
import roleFixture from '../../contract/fixtures/members-roles/021-GetRoles.json';
import inviteFixture from '../../contract/fixtures/members-roles/071-GetWorkspaceFromInviteHash.json';
import projectionFixture from '../../contract/fixtures/permissions-api/004-FindPeopleWithJobTitle.json';
import allowedProjectionFixture from '../../contract/fixtures/permissions-api/005-FindPeopleWithoutJobTitle.json';
import filterFixture from '../../contract/fixtures/permissions-api/006-FilterPeopleByJobTitle.json';
import sortFixture from '../../contract/fixtures/permissions-api/007-SortPeopleByJobTitle.json';
import updateFixture from '../../contract/fixtures/permissions-api/008-UpdateOnePerson.json';
import deleteFixture from '../../contract/fixtures/permissions-api/009-DeleteManyPeople.json';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  PASSWORD,
  prepareWorkspace,
  setupCoreTestDatabase,
  user,
  type Result,
} from '../utils/auth-test.util';

const administrator = client();
const member = client();
const person = standardMetadata.tables.objectMetadata.find(
  (object) => object.nameSingular === 'person',
)!;
const company = standardMetadata.tables.objectMetadata.find(
  (object) => object.nameSingular === 'company',
)!;
const jobTitle = standardMetadata.tables.fieldMetadata.find(
  (field) => field.objectMetadataId === person.id && field.name === 'jobTitle',
)!;
let workspaceId: string;
let memberId: string;
let memberUserId: string;
let readRoleId: string;
let invitationHash: string;

const request = async <TData>(
  connection: ReturnType<typeof client>,
  query: string,
  variables: Record<string, unknown> = {},
) => {
  const { result } = await connection.request<TData>(query, variables);
  expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
  return result.data!;
};
const recordRequest = async <TData = Record<string, unknown>>(
  connection: ReturnType<typeof client>,
  query: string,
  variables: Record<string, unknown> = {},
) => {
  const response = await SELF.fetch(`${ORIGIN}/graphql`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': 'application/json',
      'x-twenty-session-cookie': '1',
      cookie: connection.cookie,
    },
    body: JSON.stringify({
      query: projectRecordQuery(query, standardRecordSchema()),
      variables,
    }),
  });
  return (await response.json()) as Result<TData>;
};
const changeRole = (roleId: string, workspaceMemberId = memberId) =>
  request(
    administrator,
    'mutation($member: UUID!, $role: UUID!) {updateWorkspaceMemberRole(workspaceMemberId: $member, roleId: $role) {id roles {id}}}',
    { member: workspaceMemberId, role: roleId },
  );
const updateWorkspace = (data: Record<string, unknown>) =>
  request<{
    updateWorkspace: {
      inviteHash: string;
      displayName: string;
      trashRetentionDays: number;
      defaultRole: { id: string };
    };
  }>(
    administrator,
    'mutation($data: UpdateWorkspaceInput!) {updateWorkspace(data: $data) {inviteHash displayName trashRetentionDays defaultRole {id}}}',
    { data },
  );
const invite = async (
  connection: ReturnType<typeof client>,
  hash = invitationHash,
) => {
  const email = `${crypto.randomUUID()}@example.com`;
  const joined = await request<{
    signUpInWorkspace: { loginToken: { token: string } };
  }>(
    connection,
    'mutation($email: String!, $password: String!, $hash: String!) {signUpInWorkspace(email: $email, password: $password, workspaceInviteHash: $hash) {loginToken {token}}}',
    { email, password: PASSWORD, hash },
  );
  const token = joined.signUpInWorkspace.loginToken.token;
  const exchange = await request<{
    getAuthTokensFromLoginToken: {
      tokens: {
        accessOrWorkspaceAgnosticToken: { token: string };
        refreshToken: { token: string };
      };
    };
  }>(
    connection,
    'mutation($token: String!, $origin: String!) {getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) {tokens {accessOrWorkspaceAgnosticToken {token} refreshToken {token}}}}',
    { token, origin: ORIGIN },
  );
  return {
    email,
    loginToken: token,
    tokens: exchange.getAuthTokensFromLoginToken.tokens,
  };
};

beforeAll(async () => {
  await setupCoreTestDatabase();
  await clearCoreTestDatabase();
  workspaceId = (await prepareWorkspace(administrator)).workspaceId;
  invitationHash = (await updateWorkspace({ isPublicInviteLinkEnabled: true }))
    .updateWorkspace.inviteHash;
  await invite(member);
  const current = await user(member);
  memberId = current.workspaceMember!.id;
  memberUserId = current.id;
});

it('resolves the captured invitation landing query and joins with Member', async () => {
  expect(
    await request(client(), inviteFixture.query, {
      inviteHash: invitationHash,
    }),
  ).toMatchObject({
    findWorkspaceFromInviteHash: { id: workspaceId, displayName: 'Acme' },
  });
  expect(
    await request(member, '{currentUser {workspaceMember {roles {label}}}}'),
  ).toMatchObject({
    currentUser: { workspaceMember: { roles: [{ label: 'Member' }] } },
  });
});

it('creates the captured read-only role, assigns it, and immediately forbids record writes', async () => {
  const created = await request<{ createOneRole: { id: string } }>(
    administrator,
    createRoleFixture.query,
    {
      createRoleInput: {
        ...createRoleFixture.variables.createRoleInput,
        id: crypto.randomUUID(),
        canUpdateAllSettings: false,
      },
    },
  );
  readRoleId = created.createOneRole.id;
  await changeRole(readRoleId);
  const permissions = (
    await user(member)
  ).currentUserWorkspace!.objectRecordsPermissions.find(
    (permission) => permission.objectMetadataId === person.id,
  )!;
  expect(permissions).toMatchObject({
    canReadAllRecords: true,
    canCreateAllRecords: false,
    canUpdateAllRecords: false,
    canSoftDeleteAllRecords: false,
    canDestroyAllRecords: false,
  });
  expect(
    (
      await recordRequest(
        member,
        '{people(first: 1) {edges {node {id name {firstName}}}}}',
      )
    ).errors,
  ).toBeUndefined();
  for (const fixture of [updateFixture, deleteFixture])
    expect(
      (await recordRequest(member, fixture.query, fixture.variables))
        .errors?.[0].extensions.code,
    ).toBe('FORBIDDEN');
  for (const query of [
    'mutation {createPerson(data: {name: {firstName: "Denied"}}) {id}}',
    'mutation {destroyPerson(id: "00000000-0000-4000-8000-000000000000") {id}}',
  ])
    expect(
      (await recordRequest(member, query)).errors?.[0].extensions.code,
    ).toBe('FORBIDDEN');
});

it('hides the captured job title field from projection, aliases, filters, sorts and aggregation', async () => {
  await request(administrator, fieldFixture.query, {
    upsertFieldPermissionsInput: {
      roleId: readRoleId,
      fieldPermissions: [
        {
          objectMetadataId: person.id,
          fieldMetadataId: jobTitle.id,
          canReadFieldValue: false,
          canUpdateFieldValue: false,
        },
      ],
    },
  });
  const permissions = (
    await user(member)
  ).currentUserWorkspace!.objectRecordsPermissions.find(
    (permission) => permission.objectMetadataId === person.id,
  )!;
  expect(permissions.unreadableFields).toContain(jobTitle.id);
  expect(permissions.uneditableFields).toContain(jobTitle.id);
  for (const fixture of [projectionFixture, filterFixture, sortFixture])
    expect(
      (await recordRequest(member, fixture.query, fixture.variables))
        .errors?.[0].extensions.code,
    ).toBe('FORBIDDEN');
  expect(
    (
      await recordRequest(
        member,
        allowedProjectionFixture.query,
        allowedProjectionFixture.variables,
      )
    ).errors,
  ).toBeUndefined();
  for (const query of [
    '{people {edges {node {hidden: jobTitle}}}}',
    '{people {countNotEmptyJobTitle}}',
  ])
    expect(
      (await recordRequest(member, query)).errors?.[0].extensions.code,
    ).toBe('FORBIDDEN');
  const roles = await request<{
    getRoles: { id: string; fieldPermissions: { fieldMetadataId: string }[] }[];
  }>(administrator, roleFixture.query);
  expect(
    roles.getRoles.find((role) => role.id === readRoleId)?.fieldPermissions,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ fieldMetadataId: jobTitle.id }),
    ]),
  );
});

it('denies a Member role management, membership management and workspace settings', async () => {
  for (const [query, variables] of [
    ['mutation {createOneRole(createRoleInput: {label: "Denied"}) {id}}', {}],
    ['mutation {updateWorkspace(data: {displayName: "Denied"}) {id}}', {}],
    [
      'mutation($id: String!) {deleteUserFromWorkspace(workspaceMemberIdToDelete: $id) {id}}',
      { id: (await user(administrator)).workspaceMember!.id },
    ],
    ['query {getRoles {id}}', {}],
  ] as const)
    expect(
      (await member.request(query, variables)).result.errors?.[0].extensions
        .code,
    ).toBe('FORBIDDEN');
});

it('applies object overrides and nullable inheritance, independently of global role defaults', async () => {
  await request(
    administrator,
    'mutation($input: UpsertObjectPermissionsInput!) {upsertObjectPermissions(upsertObjectPermissionsInput: $input) {objectMetadataId canReadObjectRecords}}',
    {
      input: {
        roleId: readRoleId,
        objectPermissions: [
          { objectMetadataId: company.id, canReadObjectRecords: false },
        ],
      },
    },
  );
  expect(
    (await recordRequest(member, '{companies {edges {node {id}}}}')).errors?.[0]
      .extensions.code,
  ).toBe('FORBIDDEN');
  await request(
    administrator,
    'mutation($input: UpsertObjectPermissionsInput!) {upsertObjectPermissions(upsertObjectPermissionsInput: $input) {objectMetadataId}}',
    {
      input: {
        roleId: readRoleId,
        objectPermissions: [
          {
            objectMetadataId: company.id,
            canReadObjectRecords: null,
            canUpdateObjectRecords: true,
          },
        ],
      },
    },
  );
  expect(
    (
      await recordRequest(
        member,
        'mutation {createCompany(data: {name: "Object exception"}) {id}}',
      )
    ).errors,
  ).toBeUndefined();
  expect(
    (await recordRequest(member, '{companies {edges {node {id}}}}')).errors,
  ).toBeUndefined();
});

it('allows explicit tool grants, replacing previous grants without enabling excluded products', async () => {
  await request(
    administrator,
    'mutation($input: UpdateRoleInput!) {updateOneRole(updateRoleInput: $input) {id}}',
    { input: { id: readRoleId, update: { canAccessAllTools: false } } },
  );
  await request(
    administrator,
    'mutation($input: UpsertPermissionFlagsInput!) {upsertPermissionFlags(upsertPermissionFlagsInput: $input) {flag}}',
    {
      input: {
        roleId: readRoleId,
        permissionFlagKeys: ['PROFILE_INFORMATION', 'DOWNLOAD_FILE'],
      },
    },
  );
  expect(
    (await user(member)).currentUserWorkspace!.permissionFlags.sort(),
  ).toEqual(['DOWNLOAD_FILE', 'PROFILE_INFORMATION']);
  await request(
    administrator,
    'mutation($input: UpsertPermissionFlagsInput!) {upsertPermissionFlags(upsertPermissionFlagsInput: $input) {flag}}',
    { input: { roleId: readRoleId, permissionFlagKeys: [] } },
  );
  expect((await user(member)).currentUserWorkspace!.permissionFlags).toEqual(
    [],
  );
  expect(
    (
      await administrator.request(
        'mutation($input: UpsertPermissionFlagsInput!) {upsertPermissionFlags(upsertPermissionFlagsInput: $input) {flag}}',
        { input: { roleId: readRoleId, permissionFlagKeys: ['AI'] } },
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('NOT_IMPLEMENTED');
});

it('persists workspace name, default role and retention, and gives new members the configured role', async () => {
  const updated = await updateWorkspace({
    displayName: 'Stage Ten',
    defaultRoleId: readRoleId,
    trashRetentionDays: 7,
  });
  expect(updated.updateWorkspace).toMatchObject({
    displayName: 'Stage Ten',
    trashRetentionDays: 7,
    defaultRole: { id: readRoleId },
  });
  const freshMember = client();
  await invite(freshMember);
  expect(
    await request(freshMember, '{currentUser {workspaceMember {roles {id}}}}'),
  ).toMatchObject({
    currentUser: { workspaceMember: { roles: [{ id: readRoleId }] } },
  });
  const stub = env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId));
  await runInDurableObject(
    stub,
    (_instance: WorkspaceDurableObject, { storage }) => {
      expect(
        JSON.parse(
          storage.sql
            .exec<{
              payload: string;
            }>(
              'SELECT "payload" FROM "sys_scheduledTask" WHERE "name" = ?',
              'trash-cleanup',
            )
            .one().payload,
        ),
      ).toEqual({ trashRetentionDays: 7 });
    },
  );
  await updateWorkspace({
    defaultRoleId: standardMetadata.tables.role.find(
      (role) => role.label === 'Member',
    )!.id,
  });
});

it('rejects invalid settings and protects built-in, assigned, default, and final administrator roles', async () => {
  const ownerId = (await user(administrator)).workspaceMember!.id;
  expect(
    (
      await administrator.request(
        'mutation($member: UUID!, $role: UUID!) {updateWorkspaceMemberRole(workspaceMemberId: $member, roleId: $role) {id}}',
        { member: ownerId, role: readRoleId },
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('FORBIDDEN');
  expect(
    (
      await administrator.request(
        'mutation($id: UUID!) {deleteOneRole(roleId: $id)}',
        { id: readRoleId },
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('BAD_USER_INPUT');
  const adminRoleId = standardMetadata.tables.role.find(
    (role) => role.label === 'Admin',
  )!.id;
  expect(
    (
      await administrator.request(
        'mutation($id: UUID!) {updateOneRole(updateRoleInput: {id: $id, update: {label: "Changed"}}) {id}}',
        { id: adminRoleId },
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('FORBIDDEN');
  for (const data of [
    { trashRetentionDays: -1 },
    { trashRetentionDays: 1.5 },
    { displayName: '  ' },
    { defaultRoleId: crypto.randomUUID() },
  ])
    expect(
      (
        await administrator.request(
          'mutation($data: UpdateWorkspaceInput!) {updateWorkspace(data: $data) {id}}',
          { data },
        )
      ).result.errors?.[0].extensions.code,
    ).toBe('BAD_USER_INPUT');
});

it('rotates and disables public invitations immediately', async () => {
  const previous = invitationHash;
  invitationHash = (await updateWorkspace({ inviteHash: crypto.randomUUID() }))
    .updateWorkspace.inviteHash;
  expect(invitationHash).not.toBe(previous);
  expect(
    (await client().request(inviteFixture.query, { inviteHash: previous }))
      .result.errors?.[0].extensions.code,
  ).toBe('FORBIDDEN');
  await updateWorkspace({ isPublicInviteLinkEnabled: false });
  expect(
    (
      await client().request(
        'mutation($email: String!, $password: String!, $hash: String!) {signUpInWorkspace(email: $email, password: $password, workspaceInviteHash: $hash) {loginToken {token}}}',
        {
          email: `${crypto.randomUUID()}@example.com`,
          password: PASSWORD,
          hash: invitationHash,
        },
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('FORBIDDEN');
  await updateWorkspace({ isPublicInviteLinkEnabled: true });
});

it('persists personal preferences and enforces profile permission during and after onboarding', async () => {
  expect(
    (
      await member.request(
        'mutation($input: UpdateWorkspaceMemberSettingsInput!) {updateWorkspaceMemberSettings(input: $input)}',
        {
          input: {
            workspaceMemberId: memberId,
            update: { name: { firstName: 'Denied', lastName: '' } },
          },
        },
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('FORBIDDEN');
  await request(
    administrator,
    'mutation($input: UpsertPermissionFlagsInput!) {upsertPermissionFlags(upsertPermissionFlagsInput: $input) {flag}}',
    {
      input: {
        roleId: readRoleId,
        permissionFlagKeys: ['PROFILE_INFORMATION'],
      },
    },
  );
  await request(
    member,
    'mutation($input: UpdateWorkspaceMemberSettingsInput!) {updateWorkspaceMemberSettings(input: $input)}',
    {
      input: {
        workspaceMemberId: memberId,
        update: {
          name: { firstName: 'Reader', lastName: 'User' },
          timeZone: 'Asia/Taipei',
          calendarStartDay: 1,
        },
      },
    },
  );
  expect(
    await request(
      member,
      '{currentUser {firstName lastName workspaceMember {name {firstName lastName} timeZone calendarStartDay}}}',
    ),
  ).toMatchObject({
    currentUser: {
      firstName: 'Reader',
      lastName: 'User',
      workspaceMember: { timeZone: 'Asia/Taipei', calendarStartDay: 1 },
    },
  });
  await request(
    administrator,
    'mutation($input: UpsertPermissionFlagsInput!) {upsertPermissionFlags(upsertPermissionFlagsInput: $input) {flag}}',
    { input: { roleId: readRoleId, permissionFlagKeys: [] } },
  );
  expect(
    (
      await member.request(
        'mutation($input: UpdateWorkspaceMemberSettingsInput!) {updateWorkspaceMemberSettings(input: $input)}',
        {
          input: {
            workspaceMemberId: memberId,
            update: { name: { firstName: 'Denied', lastName: '' } },
          },
        },
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('FORBIDDEN');
});

it('removes membership, personal navigation and roles, revokes every scoped session and rejects old bearer tokens', async () => {
  const removed = client();
  const account = await invite(removed);
  const current = await user(removed);
  const targetId = current.workspaceMember!.id;
  const membershipId = current.currentUserWorkspace!.id;
  await request(
    removed,
    'mutation($input: CreateNavigationMenuItemInput!) {createNavigationMenuItem(input: $input) {id}}',
    {
      input: {
        type: 'OBJECT',
        targetObjectMetadataId: person.id,
        userWorkspaceId: membershipId,
        position: 1,
      },
    },
  );
  await request(
    administrator,
    'mutation($id: String!) {deleteUserFromWorkspace(workspaceMemberIdToDelete: $id) {id}}',
    { id: targetId },
  );
  expect(
    (await removed.request('{currentUser {id}}')).result.errors?.[0].extensions
      .code,
  ).toBe('UNAUTHENTICATED');
  expect(
    (
      await removed.request(
        '{currentUser {id}}',
        {},
        {
          authorization: `Bearer ${account.tokens.accessOrWorkspaceAgnosticToken.token}`,
        },
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('UNAUTHENTICATED');
  const stub = env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId));
  await runInDurableObject(
    stub,
    (_instance: WorkspaceDurableObject, { storage }) => {
      expect(
        storage.sql
          .exec(
            'SELECT 1 FROM "meta_roleTarget" WHERE "userWorkspaceId" = ?',
            membershipId,
          )
          .toArray(),
      ).toEqual([]);
      expect(
        storage.sql
          .exec(
            'SELECT 1 FROM "meta_navigationMenuItem" WHERE "userWorkspaceId" = ?',
            membershipId,
          )
          .toArray(),
      ).toEqual([]);
      expect(
        storage.sql
          .exec<{
            deletedAt: string;
          }>(
            'SELECT "deletedAt" FROM "rec_workspaceMember" WHERE "id" = ?',
            targetId,
          )
          .one().deletedAt,
      ).toBeTruthy();
    },
  );
});

it('deletes a personal account and revokes its sessions', async () => {
  const deleted = client();
  await invite(deleted);
  const id = (await user(deleted)).id;
  expect(
    await request(deleted, 'mutation {deleteUser {id disabled}}'),
  ).toMatchObject({ deleteUser: { id, disabled: true } });
  expect(
    (await deleted.request('{currentUser {id}}')).result.errors?.[0].extensions
      .code,
  ).toBe('UNAUTHENTICATED');
  expect(
    await env.CORE_DB.prepare(
      'SELECT "disabled", "deletedAt" FROM "user" WHERE "id" = ?',
    )
      .bind(id)
      .first(),
  ).toMatchObject({ disabled: 1, deletedAt: expect.any(String) });
});

it('returns the member-page v1 empty contracts with authentication and scoped recovery access', async () => {
  expect(
    await request(
      administrator,
      'query($id: UUID!) {getApprovedAccessDomains {id} findWorkspaceInvitations {id} twoFactorAuthenticationRecoveryStatus(userId: $id) {hasVerifiedTwoFactorAuthenticationMethod isAwaitingRecoveryEnrollment pendingRecoveryCodeExpiresAt}}',
      { id: memberUserId },
    ),
  ).toMatchObject({
    getApprovedAccessDomains: [],
    findWorkspaceInvitations: [],
    twoFactorAuthenticationRecoveryStatus: {
      hasVerifiedTwoFactorAuthenticationMethod: false,
      isAwaitingRecoveryEnrollment: false,
      pendingRecoveryCodeExpiresAt: null,
    },
  });
});

it('blocks record access during a core outage and retries member cleanup', async () => {
  const removed = client();
  await invite(removed);
  const current = await user(removed);
  const owner = await user(administrator);
  const identity = {
    userId: owner.id,
    userWorkspaceId: owner.currentUserWorkspace!.id,
    workspaceMemberId: owner.workspaceMember!.id,
  };
  const target = {
    userId: current.id,
    userWorkspaceId: current.currentUserWorkspace!.id,
    workspaceMemberId: current.workspaceMember!.id,
  };
  const stub = env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId));
  await runInDurableObject(
    stub,
    async (_instance: WorkspaceDurableObject, { storage }) => {
      runMetadataOperation(storage, (context) =>
        removeWorkspaceMember(context, identity, target, workspaceId),
      );
      await processOutbox(storage, {
        'member-cleanup': async () => {
          throw new Error('Core temporarily unavailable');
        },
      });
    },
  );
  expect(
    (await recordRequest(removed, '{people {edges {node {id}}}}')).errors?.[0]
      .extensions.code,
  ).toBe('FORBIDDEN');
  await runInDurableObject(
    stub,
    async (_instance: WorkspaceDurableObject, { storage }) => {
      await processOutbox(
        storage,
        { 'member-cleanup': (item) => processMemberCleanup(env.CORE_DB, item) },
        Date.now() + 60_000,
      );
    },
  );
  expect(
    (await removed.request('{currentUser {id}}')).result.errors?.[0].extensions
      .code,
  ).toBe('UNAUTHENTICATED');
});

it('retries workspace settings using the latest value after an earlier delivery failed', async () => {
  const owner = await user(administrator);
  const identity = {
    userId: owner.id,
    userWorkspaceId: owner.currentUserWorkspace!.id,
    workspaceMemberId: owner.workspaceMember!.id,
  };
  const stub = env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId));
  await runInDurableObject(
    stub,
    async (_instance: WorkspaceDurableObject, { storage }) => {
      runMetadataOperation(storage, (context) =>
        updateWorkspaceSettings(
          context,
          workspaceId,
          { displayName: 'Older' },
          identity,
        ),
      );
      await processOutbox(storage, {
        'workspace-settings': async () => {
          throw new Error('Core temporarily unavailable');
        },
      });
      runMetadataOperation(storage, (context) =>
        updateWorkspaceSettings(
          context,
          workspaceId,
          { displayName: 'Latest' },
          identity,
        ),
      );
      await processOutbox(
        storage,
        {
          'workspace-settings': () =>
            processWorkspaceSettings(storage.sql, env.CORE_DB),
        },
        Date.now() + 60_000,
      );
    },
  );
  expect(
    await request(administrator, '{currentWorkspace {displayName}}'),
  ).toMatchObject({ currentWorkspace: { displayName: 'Latest' } });
});

it('updates and deletes an unassigned role, rejects duplicate labels and inconsistent grants', async () => {
  const created = await request<{ createOneRole: { id: string } }>(
    administrator,
    'mutation {createOneRole(createRoleInput: {label: "Temporary"}) {id}}',
  );
  const id = created.createOneRole.id;
  await request(
    administrator,
    'mutation($id: UUID!) {updateOneRole(updateRoleInput: {id: $id, update: {label: "Renamed"}}) {id label}}',
    { id },
  );
  expect(
    (
      await administrator.request(
        'mutation {createOneRole(createRoleInput: {label: "Renamed"}) {id}}',
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('BAD_USER_INPUT');
  expect(
    (
      await administrator.request(
        'mutation {createOneRole(createRoleInput: {label: "Invalid", canUpdateAllObjectRecords: true}) {id}}',
      )
    ).result.errors?.[0].extensions.code,
  ).toBe('BAD_USER_INPUT');
  expect(
    await request(
      administrator,
      'mutation($id: UUID!) {deleteOneRole(roleId: $id)}',
      { id },
    ),
  ).toEqual({ deleteOneRole: id });
});

it('removes omitted object overrides and restores inherited defaults', async () => {
  await request(
    administrator,
    'mutation($input: UpsertObjectPermissionsInput!) {upsertObjectPermissions(upsertObjectPermissionsInput: $input) {objectMetadataId}}',
    { input: { roleId: readRoleId, objectPermissions: [] } },
  );
  expect(
    (
      await recordRequest(
        member,
        'mutation {createCompany(data: {name: "Denied again"}) {id}}',
      )
    ).errors?.[0].extensions.code,
  ).toBe('FORBIDDEN');
});

it('enforces field updates, resets restrictions and rolls back a partially invalid permission batch', async () => {
  await request(
    administrator,
    'mutation($input: UpsertObjectPermissionsInput!) {upsertObjectPermissions(upsertObjectPermissionsInput: $input) {objectMetadataId}}',
    {
      input: {
        roleId: readRoleId,
        objectPermissions: [
          { objectMetadataId: person.id, canUpdateObjectRecords: true },
        ],
      },
    },
  );
  await request(administrator, fieldFixture.query, {
    upsertFieldPermissionsInput: {
      roleId: readRoleId,
      fieldPermissions: [
        {
          objectMetadataId: person.id,
          fieldMetadataId: jobTitle.id,
          canReadFieldValue: null,
          canUpdateFieldValue: false,
        },
      ],
    },
  });
  const created = await recordRequest<{ createPerson: { id: string } }>(
    member,
    'mutation {createPerson(data: {name: {firstName: "Editable"}}) {id}}',
  );
  expect(created.errors).toBeUndefined();
  const id = created.data!.createPerson.id;
  expect(
    (
      await recordRequest(
        member,
        'mutation($id: UUID!) {updatePerson(id: $id, data: {jobTitle: "Denied"}) {id}}',
        { id },
      )
    ).errors?.[0].extensions.code,
  ).toBe('FORBIDDEN');
  expect(
    (
      await recordRequest(
        member,
        'query($id: UUID!) {person(filter: {id: {eq: $id}}) {jobTitle}}',
        { id },
      )
    ).errors,
  ).toBeUndefined();
  const failed = await administrator.request(fieldFixture.query, {
    upsertFieldPermissionsInput: {
      roleId: readRoleId,
      fieldPermissions: [
        {
          objectMetadataId: person.id,
          fieldMetadataId: jobTitle.id,
          canUpdateFieldValue: null,
        },
        {
          objectMetadataId: company.id,
          fieldMetadataId: jobTitle.id,
          canReadFieldValue: false,
        },
      ],
    },
  });
  expect(failed.result.errors?.[0].extensions.code).toBe('BAD_USER_INPUT');
  expect(
    (
      await recordRequest(
        member,
        'mutation($id: UUID!) {updatePerson(id: $id, data: {jobTitle: "Still denied"}) {id}}',
        { id },
      )
    ).errors?.[0].extensions.code,
  ).toBe('FORBIDDEN');
  await request(administrator, fieldFixture.query, {
    upsertFieldPermissionsInput: {
      roleId: readRoleId,
      fieldPermissions: [
        {
          objectMetadataId: person.id,
          fieldMetadataId: jobTitle.id,
          canReadFieldValue: null,
          canUpdateFieldValue: null,
        },
      ],
    },
  });
  expect(
    (
      await recordRequest(
        member,
        'mutation($id: UUID!) {updatePerson(id: $id, data: {jobTitle: "Allowed"}) {id jobTitle}}',
        { id },
      )
    ).data,
  ).toMatchObject({ updatePerson: { jobTitle: 'Allowed' } });
});
