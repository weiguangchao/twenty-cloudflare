import { env, evictDurableObject, runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';

import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
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
import {
  inspectEventStreams,
  metadataRequest,
  openEventStream,
  recordRequest,
} from '../utils/event-stream-test.util';

const connection = client();
let workspaceId: string;
const streams: Awaited<ReturnType<typeof openEventStream>>[] = [];
const open = async (owner = connection) => {
  const stream = await openEventStream(owner);
  streams.push(stream);
  return stream;
};

beforeAll(async () => {
  await setupCoreTestDatabase();
  await clearCoreTestDatabase();
  workspaceId = (await prepareWorkspace(connection)).workspaceId;
});
afterEach(async () => {
  await Promise.all(streams.splice(0).map((stream) => stream.close()));
});

it('delivers created, updated, deleted, restored and destroyed records through authenticated SSE', async () => {
  const stream = await open();
  await stream.add('companies', {
    objectNameSingular: 'company',
    variables: { filter: {} },
  });
  const created = (
    await recordRequest<{ createCompany: { id: string } }>(
      connection,
      'mutation {createCompany(data: {name: "Realtime"}) {id}}',
    )
  ).createCompany;
  for (const [action, query] of [
    ['CREATED', null],
    [
      'UPDATED',
      'mutation($id: UUID!) {updateCompany(id: $id, data: {name: "Changed"}) {id}}',
    ],
    ['DELETED', 'mutation($id: UUID!) {deleteCompany(id: $id) {id}}'],
    ['RESTORED', 'mutation($id: UUID!) {restoreCompany(id: $id) {id}}'],
    ['DESTROYED', 'mutation($id: UUID!) {destroyCompany(id: $id) {id}}'],
  ] as const) {
    if (query) await recordRequest(connection, query, { id: created.id });
    const payload = await stream.until((payload) =>
      payload.objectRecordEventsWithQueryIds.some(
        (entry) =>
          entry.objectRecordEvent.action === action &&
          entry.objectRecordEvent.recordId === created.id,
      ),
    );
    const event = payload.objectRecordEventsWithQueryIds[0];
    expect(event.queryIds).toEqual(['companies']);
    expect(event.objectRecordEvent.objectNameSingular).toBe('company');
    if (action === 'UPDATED')
      expect(event.objectRecordEvent.properties.diff).toMatchObject({
        name: { before: 'Realtime', after: 'Changed' },
      });
  }
});

it('matches either side of updates and honors filters, relation filters and removed query ids', async () => {
  const stream = await open();
  await stream.add('match-old', {
    objectNameSingular: 'company',
    variables: { filter: { name: { eq: 'Old' } } },
  });
  await stream.add('match-new', {
    objectNameSingular: 'company',
    variables: { filter: { name: { eq: 'New' } } },
  });
  await stream.add('other', {
    objectNameSingular: 'company',
    variables: { filter: { name: { eq: 'Unrelated' } } },
  });
  await stream.add('removed', { objectNameSingular: 'company', variables: {} });
  await stream.remove('removed');
  const company = (
    await recordRequest<{ createCompany: { id: string } }>(
      connection,
      'mutation {createCompany(data: {name: "Old"}) {id}}',
    )
  ).createCompany;
  await stream.until(
    (payload) => payload.objectRecordEventsWithQueryIds.length > 0,
  );
  await recordRequest(
    connection,
    'mutation($id: UUID!) {updateCompany(id: $id, data: {name: "New"}) {id}}',
    { id: company.id },
  );
  const payload = await stream.until((payload) =>
    payload.objectRecordEventsWithQueryIds.some(
      (entry) => entry.objectRecordEvent.action === 'UPDATED',
    ),
  );
  expect(payload.objectRecordEventsWithQueryIds[0].queryIds.sort()).toEqual([
    'match-new',
    'match-old',
  ]);
  await stream.add('related', {
    objectNameSingular: 'person',
    variables: { filter: { company: { name: { eq: 'New' } } } },
  });
  const person = (
    await recordRequest<{ createPerson: { id: string } }>(
      connection,
      'mutation($id: ID!) {createPerson(data: {name: {firstName: "Related"}, companyId: $id}) {id}}',
      { id: company.id },
    )
  ).createPerson;
  const related = await stream.until((payload) =>
    payload.objectRecordEventsWithQueryIds.some(
      (entry) => entry.objectRecordEvent.recordId === person.id,
    ),
  );
  expect(
    related.objectRecordEventsWithQueryIds[0].objectRecordEvent.properties
      .after,
  ).toMatchObject({ company: { id: company.id, name: 'New' } });
});

it('broadcasts field metadata and its collection hash after commit and suppresses rolled-back writes', async () => {
  const stream = await open();
  const company = standardMetadata.tables.objectMetadata.find(
    (object) => object.nameSingular === 'company',
  )!;
  const name = `realtime${Date.now()}`;
  const created = await metadataRequest<{ createOneField: { id: string } }>(
    connection,
    'mutation($input: CreateOneFieldMetadataInput!) {createOneField(input: $input) {id}}',
    {
      input: {
        field: {
          objectMetadataId: company.id,
          name,
          label: 'Realtime field',
          type: 'TEXT',
          icon: 'IconText',
        },
      },
    },
  );
  const payload = await stream.until((payload) =>
    payload.metadataEvents.some(
      (event) => event.recordId === created.createOneField.id,
    ),
  );
  expect(
    payload.metadataEvents.find(
      (event) => event.recordId === created.createOneField.id,
    ),
  ).toMatchObject({
    metadataName: 'fieldMetadata',
    type: 'CREATED',
    updatedCollectionHash: expect.any(String),
    properties: {
      after: { name, objectMetadataId: company.id, relation: null },
    },
  });
  await stream.add('company', { objectNameSingular: 'company', variables: {} });
  const failed = await connection.request(
    'mutation {createOneRole(createRoleInput: {label: "Invalid", canUpdateAllObjectRecords: true}) {id}}',
  );
  expect(failed.result.errors).toBeDefined();
  const owner = await user(connection);
  await runInDurableObject(
    env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId)),
    (instance: WorkspaceDurableObject, { storage }) => {
      const before = storage.sql
        .exec<{ count: number }>('SELECT COUNT(*) AS "count" FROM "sys_outbox"')
        .one().count;
      const response = JSON.parse(
        instance.executeRecordQuery(
          {
            query:
              'mutation {createCompany(data: {name: "Must roll back"}) {id} createPerson(data: {emails: {primaryEmail: "invalid"}}) {id}}',
          },
          {
            userId: owner.id,
            userWorkspaceId: owner.currentUserWorkspace!.id,
            workspaceMemberId: owner.workspaceMember!.id,
          },
        ),
      );
      expect(response.errors).toBeDefined();
      expect(
        storage.sql
          .exec<{ count: number }>(
            'SELECT COUNT(*) AS "count" FROM "sys_outbox"',
          )
          .one().count,
      ).toBe(before);
      expect(
        storage.sql
          .exec(
            'SELECT 1 FROM "rec_company" WHERE "name" = ?',
            'Must roll back',
          )
          .toArray(),
      ).toEqual([]);
    },
  );
});

it('restores query registrations and attachment identity after DO hibernation', async () => {
  const stream = await open();
  await stream.add('survives', {
    objectNameSingular: 'company',
    variables: {},
  });
  const stub = env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId));
  await evictDurableObject(stub);
  const company = (
    await recordRequest<{ createCompany: { id: string } }>(
      connection,
      'mutation {createCompany(data: {name: "After hibernation"}) {id}}',
    )
  ).createCompany;
  const payload = await stream.until((payload) =>
    payload.objectRecordEventsWithQueryIds.some(
      (entry) => entry.objectRecordEvent.recordId === company.id,
    ),
  );
  expect(payload.objectRecordEventsWithQueryIds[0].queryIds).toEqual([
    'survives',
  ]);
  expect((await inspectEventStreams(workspaceId)).queries).toContainEqual({
    eventStreamId: stream.eventStreamId,
    queryId: 'survives',
  });
});

it('cleans the stream and its queries when the SSE reader disconnects', async () => {
  const stream = await open();
  await stream.add('cleanup', { objectNameSingular: 'company', variables: {} });
  expect((await inspectEventStreams(workspaceId)).streams).toContainEqual({
    id: stream.eventStreamId,
  });
  await stream.close();
  await vi.waitFor(
    async () => {
      const state = await inspectEventStreams(workspaceId);
      expect(state.streams).not.toContainEqual({ id: stream.eventStreamId });
      expect(
        state.queries.some(
          (query) => query.eventStreamId === stream.eventStreamId,
        ),
      ).toBe(false);
    },
    { timeout: 2000, interval: 20 },
  );
});

it('checks ownership and filters forbidden object and field data with current permissions', async () => {
  const update = await metadataRequest<{
    updateWorkspace: { inviteHash: string };
  }>(
    connection,
    'mutation {updateWorkspace(data: {isPublicInviteLinkEnabled: true}) {inviteHash}}',
  );
  const member = client();
  const signup = await metadataRequest<{
    signUpInWorkspace: { loginToken: { token: string } };
  }>(
    member,
    'mutation($email: String!, $password: String!, $hash: String!) {signUpInWorkspace(email: $email, password: $password, workspaceInviteHash: $hash) {loginToken {token}}}',
    {
      email: `${crypto.randomUUID()}@example.com`,
      password: PASSWORD,
      hash: update.updateWorkspace.inviteHash,
    },
  );
  await metadataRequest(
    member,
    'mutation($token: String!, $origin: String!) {getAuthTokensFromLoginToken(loginToken: $token, origin: $origin) {tokens {accessOrWorkspaceAgnosticToken {token}}}}',
    { token: signup.signUpInWorkspace.loginToken.token, origin: ORIGIN },
  );
  const stream = await open(member);
  const currentMember = await user(member);
  const denied = await connection.request(
    'mutation($input: AddQuerySubscriptionInput!) {addQueryToEventStream(input: $input)}',
    {
      input: {
        eventStreamId: stream.eventStreamId,
        queryId: 'hijack',
        operationSignature: { objectNameSingular: 'person', variables: {} },
      },
    },
  );
  expect(denied.result.errors?.[0].extensions.code).toBe('FORBIDDEN');
  const created = await metadataRequest<{ createOneRole: { id: string } }>(
    connection,
    'mutation {createOneRole(createRoleInput: {label: "Limited realtime", canReadAllObjectRecords: true}) {id}}',
  );
  const roleId = created.createOneRole.id;
  const person = standardMetadata.tables.objectMetadata.find(
    (object) => object.nameSingular === 'person',
  )!;
  const jobTitle = standardMetadata.tables.fieldMetadata.find(
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
            fieldMetadataId: jobTitle.id,
            canReadFieldValue: false,
          },
        ],
      },
    },
  );
  await metadataRequest(
    connection,
    'mutation($member: UUID!, $role: UUID!) {updateWorkspaceMemberRole(workspaceMemberId: $member, roleId: $role) {id}}',
    { member: currentMember.workspaceMember!.id, role: roleId },
  );
  const companyObject = standardMetadata.tables.objectMetadata.find(
    (object) => object.nameSingular === 'company',
  )!;
  await metadataRequest(
    connection,
    'mutation($input: UpsertObjectPermissionsInput!) {upsertObjectPermissions(upsertObjectPermissionsInput: $input) {objectMetadataId}}',
    {
      input: {
        roleId,
        objectPermissions: [
          { objectMetadataId: companyObject.id, canReadObjectRecords: false },
        ],
      },
    },
  );
  await stream.add('forbidden-companies', {
    objectNameSingular: 'company',
    variables: {},
  });
  await recordRequest(
    connection,
    'mutation {createCompany(data: {name: "Hidden company"}) {id}}',
  );
  const administrator = await user(connection);
  const privateNavigation = await metadataRequest<{
    createNavigationMenuItem: { id: string };
  }>(
    connection,
    'mutation($input: CreateNavigationMenuItemInput!) {createNavigationMenuItem(input: $input) {id}}',
    {
      input: {
        type: 'LINK',
        name: 'Private navigation',
        link: 'https://example.com',
        userWorkspaceId: administrator.currentUserWorkspace!.id,
      },
    },
  );
  await stream.add('people', { objectNameSingular: 'person', variables: {} });
  await stream.add('secret-filter', {
    objectNameSingular: 'person',
    variables: { filter: { jobTitle: { eq: 'Secret' } } },
  });
  const record = (
    await recordRequest<{ createPerson: { id: string } }>(
      connection,
      'mutation {createPerson(data: {name: {firstName: "Public"}, jobTitle: "Secret"}) {id}}',
    )
  ).createPerson;
  const payload = await stream.until((payload) => {
    expect(
      payload.metadataEvents.some(
        (event) =>
          event.recordId === privateNavigation.createNavigationMenuItem.id,
      ),
    ).toBe(false);
    expect(
      payload.objectRecordEventsWithQueryIds.some(
        (entry) => entry.objectRecordEvent.objectNameSingular === 'company',
      ),
    ).toBe(false);
    return payload.objectRecordEventsWithQueryIds.some(
      (entry) => entry.objectRecordEvent.recordId === record.id,
    );
  });
  expect(payload.objectRecordEventsWithQueryIds[0].queryIds).toEqual([
    'people',
  ]);
  expect(JSON.stringify(payload)).not.toContain('Secret');
  await recordRequest(
    connection,
    'mutation($id: UUID!) {updatePerson(id: $id, data: {jobTitle: "Secret changed"}) {id}}',
    { id: record.id },
  );
  const changed = await stream.until((payload) =>
    payload.objectRecordEventsWithQueryIds.some(
      (entry) => entry.objectRecordEvent.action === 'UPDATED',
    ),
  );
  expect(JSON.stringify(changed)).not.toContain('Secret');
  expect(
    changed.objectRecordEventsWithQueryIds[0].objectRecordEvent.properties
      .updatedFields,
  ).not.toContain('jobTitle');
  await metadataRequest(
    connection,
    'mutation($id: String!) {deleteUserFromWorkspace(workspaceMemberIdToDelete: $id) {id}}',
    { id: currentMember.workspaceMember!.id },
  );
  await recordRequest(
    connection,
    'mutation {createPerson(data: {name: {firstName: "After revocation"}}) {id}}',
  );
  await vi.waitFor(
    async () =>
      expect(
        (await inspectEventStreams(workspaceId)).streams,
      ).not.toContainEqual({ id: stream.eventStreamId }),
    { timeout: 2000, interval: 20 },
  );
});

it('keeps a replacement stream when the previous connection closes late', async () => {
  const first = await open();
  await first.add('old', { objectNameSingular: 'company', variables: {} });
  const replacement = await openEventStream(connection, first.eventStreamId);
  streams.push(replacement);
  await replacement.add('replacement', {
    objectNameSingular: 'company',
    variables: {},
  });
  await first.close();
  const company = (
    await recordRequest<{ createCompany: { id: string } }>(
      connection,
      'mutation {createCompany(data: {name: "Replacement"}) {id}}',
    )
  ).createCompany;
  const payload = await replacement.until((payload) =>
    payload.objectRecordEventsWithQueryIds.some(
      (event) => event.objectRecordEvent.recordId === company.id,
    ),
  );
  expect(payload.objectRecordEventsWithQueryIds[0].queryIds).toEqual([
    'replacement',
  ]);
});

it('removes query listeners while preserving the owner’s private navigation events', async () => {
  const stream = await open();
  const owner = await user(connection);
  await stream.add('deleted-query', {
    objectNameSingular: 'company',
    variables: {},
  });
  await stream.remove('deleted-query');
  await stream.add('marker', { objectNameSingular: 'person', variables: {} });
  await recordRequest(
    connection,
    'mutation {createCompany(data: {name: "No listener"}) {id}}',
  );
  const marker = (
    await recordRequest<{ createPerson: { id: string } }>(
      connection,
      'mutation {createPerson(data: {name: {firstName: "Marker"}}) {id}}',
    )
  ).createPerson;
  const received = await stream.until((payload) => {
    expect(
      payload.objectRecordEventsWithQueryIds.every(
        (entry) => entry.objectRecordEvent.objectNameSingular !== 'company',
      ),
    ).toBe(true);
    return payload.objectRecordEventsWithQueryIds.some(
      (entry) => entry.objectRecordEvent.recordId === marker.id,
    );
  });
  expect(received.objectRecordEventsWithQueryIds[0].queryIds).toEqual([
    'marker',
  ]);
  const created = await metadataRequest<{
    createNavigationMenuItem: { id: string };
  }>(
    connection,
    'mutation($input: CreateNavigationMenuItemInput!) {createNavigationMenuItem(input: $input) {id}}',
    {
      input: {
        type: 'LINK',
        link: 'https://example.com',
        name: 'Private',
        userWorkspaceId: owner.currentUserWorkspace!.id,
      },
    },
  );
  const metadata = await stream.until((payload) =>
    payload.metadataEvents.some(
      (event) => event.recordId === created.createNavigationMenuItem.id,
    ),
  );
  expect(metadata.metadataEvents[0].properties.after?.userWorkspaceId).toBe(
    owner.currentUserWorkspace!.id,
  );
});
