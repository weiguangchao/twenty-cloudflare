import { SELF } from 'cloudflare:test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  createHeartbeatStream,
  HEARTBEAT_INTERVAL_MILLISECONDS,
} from '@/metadata-api/subscriptions/create-heartbeat-stream.util';
import subscriptionFixture from '../../contract/fixtures/auth-signout-signin/002-OnEventSubscription.json';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
} from '../utils/auth-test.util';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('heartbeat lifecycle', () => {
  it('sends an initial event and an empty event every 30 seconds', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const stream = createHeartbeatStream('event-stream', controller.signal);
    const first = await stream.next();
    expect(first).toEqual({
      done: false,
      value: {
        eventStreamId: 'event-stream',
        objectRecordEventsWithQueryIds: [],
        metadataEvents: [],
        queueJobEvents: [],
      },
    });
    let received = false;
    const pending = stream.next().then((value) => {
      received = true;
      return value;
    });
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MILLISECONDS - 1);
    expect(received).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual(first);
    await stream.return!();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['abort', 'return'])(
    'releases a pending read and timer on %s',
    async (reason) => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const stream = createHeartbeatStream('event-stream', controller.signal);
      await stream.next();
      const pending = stream.next();
      if (reason === 'abort') controller.abort();
      else await stream.return!();
      expect(await pending).toEqual({ done: true, value: undefined });
      expect(await stream.next()).toEqual({ done: true, value: undefined });
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});

describe('GraphQL over SSE', () => {
  const connection = client();

  beforeAll(async () => {
    await setupCoreTestDatabase();
    await clearCoreTestDatabase();
    await prepareWorkspace(connection);
  });

  it('serves the captured subscription through the authenticated cookie channel', async () => {
    const response = await SELF.fetch(`${ORIGIN}/metadata`, {
      method: 'POST',
      headers: {
        accept: 'text/event-stream',
        'content-type': 'application/json',
        origin: ORIGIN,
        'x-twenty-session-cookie': '1',
        cookie: connection.cookie,
      },
      body: JSON.stringify({
        query: subscriptionFixture.query,
        variables: { eventStreamId: 'stage-4-stream' },
      }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    try {
      for (let chunk = 0; chunk < 5 && !text.includes('event: next'); chunk++) {
        const result = await reader.read();
        if (result.done) break;
        text += decoder.decode(result.value, { stream: true });
      }
      expect(text).toContain('event: next');
      expect(text).toContain('"eventStreamId":"stage-4-stream"');
      expect(text).toContain('"metadataEvents":[]');
      expect(text).not.toContain('"errors"');
    } finally {
      await reader.cancel();
    }
  });
});
