import { env } from 'cloudflare:test';
import { beforeAll, afterEach, expect, it, vi } from 'vitest';

import { createMetadataContext } from '@/metadata-api/create-metadata-context.util';
import { createEventStream } from '@/metadata-api/subscriptions/create-event-stream.util';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
  user,
} from '../utils/auth-test.util';
import { inspectEventStreams } from '../utils/event-stream-test.util';

const connection = client();
let workspaceId: string;
beforeAll(async () => {
  await setupCoreTestDatabase();
  await clearCoreTestDatabase();
  workspaceId = (await prepareWorkspace(connection)).workspaceId;
});
afterEach(() => {
  vi.useRealTimers();
});

it('sends a heartbeat every 30 seconds for five idle minutes and releases its timer on abort', async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const request = new Request(`${ORIGIN}/metadata`, {
    headers: { cookie: connection.cookie, 'x-crm-session-cookie': '1' },
    signal: controller.signal,
  });
  const iterator = await createEventStream(
    createMetadataContext(env, request, new Headers()),
    crypto.randomUUID(),
  );
  const initial = await iterator.next();
  try {
    for (let heartbeat = 0; heartbeat < 10; heartbeat++) {
      const pending = iterator.next();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(await pending).toEqual(initial);
    }
    const pending = iterator.next();
    controller.abort();
    expect(await pending).toEqual({ done: true, value: undefined });
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    await iterator.return!();
  }
});

it('rechecks session revocation on heartbeat and closes the DO registration', async () => {
  vi.useFakeTimers();
  const session = await user(connection);
  const eventStreamId = crypto.randomUUID();
  const request = new Request(`${ORIGIN}/metadata`, {
    headers: { cookie: connection.cookie, 'x-crm-session-cookie': '1' },
  });
  const iterator = await createEventStream(
    createMetadataContext(env, request, new Headers()),
    eventStreamId,
  );
  await iterator.next();
  await env.CORE_DB.prepare(
    'UPDATE "userSession" SET "revokedAt" = ? WHERE "userWorkspaceId" = ?',
  )
    .bind(new Date().toISOString(), session.currentUserWorkspace!.id)
    .run();
  const pending = iterator.next();
  const rejected = expect(pending).rejects.toMatchObject({
    extensions: { code: 'UNAUTHENTICATED' },
  });
  await vi.advanceTimersByTimeAsync(30_000);
  await rejected;
  await iterator.return!();
  vi.useRealTimers();
  await vi.waitFor(
    async () =>
      expect(
        (await inspectEventStreams(workspaceId)).streams,
      ).not.toContainEqual({ id: eventStreamId }),
    { timeout: 2000, interval: 20 },
  );
});
