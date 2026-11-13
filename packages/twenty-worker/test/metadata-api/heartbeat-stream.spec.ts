import { SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import subscriptionFixture from '../../contract/fixtures/auth-signout-signin/002-OnEventSubscription.json';
import {
  client,
  clearCoreTestDatabase,
  ORIGIN,
  prepareWorkspace,
  setupCoreTestDatabase,
} from '../utils/auth-test.util';

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
