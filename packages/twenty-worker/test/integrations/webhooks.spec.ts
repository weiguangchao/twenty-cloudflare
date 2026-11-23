import { createHmac } from 'node:crypto';
import { env, runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';

import { deliverWebhook } from '@/integrations/deliver-webhook.service';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import standardMetadata from '@/workspace/seed/standard-metadata.json';
import {
  client,
  clearCoreTestDatabase,
  prepareWorkspace,
  setupCoreTestDatabase,
} from '../utils/auth-test.util';
import {
  metadataRequest,
  recordRequest,
} from '../utils/event-stream-test.util';

const connection = client();
const secret = 'webhook-test-signing-secret';
let workspaceId: string;
let webhookId: string;
let roleId: string;
const stub = () => env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId));
const deliveries = () =>
  runInDurableObject(stub(), (_instance: WorkspaceDurableObject, state) =>
    state.storage.sql
      .exec<{ id: string; status: string; attempts: number }>(
        'SELECT "id", "status", "attempts" FROM "sys_webhookDelivery"',
      )
      .toArray(),
  );

beforeAll(setupCoreTestDatabase);
beforeEach(async () => {
  await clearCoreTestDatabase();
  workspaceId = (await prepareWorkspace(connection)).workspaceId;
  roleId = (
    await metadataRequest<{ createOneRole: { id: string } }>(
      connection,
      'mutation {createOneRole(createRoleInput: {label: "Webhook reader", canReadAllObjectRecords: true}) {id}}',
    )
  ).createOneRole.id;
  webhookId = (
    await metadataRequest<{ createWebhook: { id: string } }>(
      connection,
      'mutation($input: CreateWebhookInput!) {createWebhook(input: $input) {id secret role {id}}}',
      {
        input: {
          targetUrl: 'https://hooks.example.com/events',
          operations: ['person.created'],
          roleId,
          secret,
        },
      },
    )
  ).createWebhook.id;
});
afterEach(() => {
  vi.restoreAllMocks();
});

it('matches operations and sends a signed, idempotent delivery with recipient field permissions', async () => {
  await recordRequest(
    connection,
    'mutation {createCompany(data: {name: "No matching webhook"}) {id}}',
  );
  expect(await deliveries()).toHaveLength(0);
  const person = standardMetadata.tables.objectMetadata.find(
    (object) => object.nameSingular === 'person',
  )!;
  const field = standardMetadata.tables.fieldMetadata.find(
    (field) =>
      field.objectMetadataId === person.id && field.name === 'jobTitle',
  )!;
  await recordRequest(
    connection,
    'mutation {createPerson(data: {name: {firstName: "Public"}, jobTitle: "Hidden secret"}) {id}}',
  );
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
  const delivery = (await deliveries())[0];
  let called = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
    called++;
    const headers = new Headers(options?.headers);
    const body = String(options?.body);
    expect(headers.get('X-CRM-Webhook-Id')).toBe(delivery.id);
    expect(headers.get('X-CRM-Webhook-Signature')).toBe(
      createHmac('sha256', secret)
        .update(`${headers.get('X-CRM-Webhook-Timestamp')}:${body}`)
        .digest('hex'),
    );
    expect(JSON.parse(body)).toMatchObject({
      webhookId,
      eventName: 'person.created',
      record: { name: { firstName: 'Public' } },
    });
    expect(body).not.toContain('Hidden secret');
    return new Response('ok');
  });
  await deliverWebhook(env, stub().id.toString(), delivery.id);
  await deliverWebhook(env, stub().id.toString(), delivery.id);
  expect(called).toBe(1);
  expect((await deliveries())[0].status).toBe('done');
});

it('retries failed endpoints without following redirects', async () => {
  await recordRequest(connection, 'mutation {createPerson(data: {}) {id}}');
  const delivery = (await deliveries())[0];
  const sending = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('', {
      status: 302,
      headers: { location: 'http://127.0.0.1/private' },
    }),
  );
  await expect(
    deliverWebhook(env, stub().id.toString(), delivery.id),
  ).rejects.toThrow('Webhook delivery failed');
  expect((await deliveries())[0]).toMatchObject({
    status: 'pending',
    attempts: 1,
  });
  await runInDurableObject(stub(), (_instance: WorkspaceDurableObject, state) =>
    state.storage.sql.exec(
      'UPDATE "sys_webhookDelivery" SET "availableAt" = 0',
    ),
  );
  sending.mockResolvedValueOnce(new Response(null, { status: 204 }));
  await deliverWebhook(env, stub().id.toString(), delivery.id);
  expect((await deliveries())[0]).toMatchObject({
    status: 'done',
    attempts: 2,
  });
});

it('cancels pending deliveries when a webhook is deleted', async () => {
  await recordRequest(connection, 'mutation {createPerson(data: {}) {id}}');
  const delivery = (await deliveries())[0];
  await metadataRequest(
    connection,
    'mutation($id: UUID!) {deleteWebhook(id: $id) {id}}',
    { id: webhookId },
  );
  await deliverWebhook(env, stub().id.toString(), delivery.id);
  expect((await deliveries())[0].status).toBe('done');
});

it('delivers generated timeline records without their nested private diffs', async () => {
  await metadataRequest(
    connection,
    'mutation($id: UUID!) {updateWebhook(input: {id: $id, update: {operations: ["timelineActivity.created"]}}) {id}}',
    { id: webhookId },
  );
  await recordRequest(
    connection,
    'mutation {createPerson(data: {jobTitle: "Private timeline value"}) {id}}',
  );
  const delivery = (await deliveries())[0];
  expect(delivery).toBeDefined();
  const prepared = await stub().prepareWebhookDelivery(delivery.id);
  expect(prepared).toMatchObject({ retry: false });
  if (prepared && !prepared.retry) {
    expect(JSON.parse(prepared.body)).toMatchObject({
      eventName: 'timelineActivity.created',
    });
    expect(prepared.body).not.toContain('Private timeline value');
    await stub().completeWebhookDelivery(delivery.id, prepared.attempt, true);
  }
});

it('rejects private URLs and malformed operation patterns', async () => {
  for (const targetUrl of [
    'http://hooks.example.com',
    'https://127.0.0.1',
    'https://[::1]',
    'https://localhost',
    'https://localhost.',
    'https://hooks.example.com:8443',
  ]) {
    const { result } = await connection.request(
      'mutation($input: CreateWebhookInput!) {createWebhook(input: $input) {id}}',
      { input: { targetUrl, operations: ['person.created'], roleId } },
    );
    expect(result.errors?.[0].extensions.code).toBe('BAD_USER_INPUT');
  }
});
