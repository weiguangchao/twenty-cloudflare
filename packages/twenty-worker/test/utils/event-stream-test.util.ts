import { env, SELF, runInDurableObject } from 'cloudflare:test';
import { expect } from 'vitest';

import { type EventPayload } from '@/workspace/subscriptions/event-stream.type';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import subscriptionFixture from '../../contract/fixtures/auth-signout-signin/002-OnEventSubscription.json';
import { type client, ORIGIN, type Result } from './auth-test.util';

export const metadataRequest = async <TData>(
  connection: ReturnType<typeof client>,
  query: string,
  variables: Record<string, unknown> = {},
) => {
  const { result } = await connection.request<TData>(query, variables);
  expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
  return result.data!;
};
export const recordRequest = async <TData = Record<string, unknown>>(
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
    body: JSON.stringify({ query, variables }),
  });
  const result = (await response.json()) as Result<TData>;
  expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
  return result.data!;
};
export const openEventStream = async (
  connection: ReturnType<typeof client>,
  eventStreamId = crypto.randomUUID(),
) => {
  const response = await SELF.fetch(`${ORIGIN}/metadata`, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      origin: ORIGIN,
      'content-type': 'application/json',
      'x-twenty-session-cookie': '1',
      cookie: connection.cookie,
    },
    body: JSON.stringify({
      query: subscriptionFixture.query,
      variables: { eventStreamId },
    }),
  });
  expect(response.status).toBe(200);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const next = async (): Promise<EventPayload> => {
    while (true) {
      const end = buffer.indexOf('\n\n');
      if (end >= 0) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (!frame.includes('event: next')) continue;
        const dataLine = frame
          .split('\n')
          .find((line) => line.startsWith('data:'))!;
        const result = JSON.parse(dataLine.slice(5)) as Result<{
          onEventSubscription: EventPayload;
        }>;
        expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
        return result.data!.onEventSubscription;
      }
      const chunk = await reader.read();
      if (chunk.done)
        throw new Error('Event stream closed before the expected event');
      buffer += decoder.decode(chunk.value, { stream: true });
    }
  };
  const initial = await next();
  expect(initial.eventStreamId).toBe(eventStreamId);
  return {
    eventStreamId,
    next,
    close: () => reader.cancel(),
    async until(predicate: (payload: EventPayload) => boolean) {
      for (let count = 0; count < 100; count++) {
        const payload = await next();
        if (predicate(payload)) return payload;
      }
      throw new Error('Expected event was not delivered');
    },
    add: (queryId: string, operationSignature: Record<string, unknown>) =>
      metadataRequest(
        connection,
        'mutation($input: AddQuerySubscriptionInput!) {addQueryToEventStream(input: $input)}',
        { input: { eventStreamId, queryId, operationSignature } },
      ),
    remove: (queryId: string) =>
      metadataRequest(
        connection,
        'mutation($input: RemoveQueryFromEventStreamInput!) {removeQueryFromEventStream(input: $input)}',
        { input: { eventStreamId, queryId } },
      ),
  };
};
export const inspectEventStreams = (workspaceId: string) =>
  runInDurableObject(
    env.WORKSPACE.get(env.WORKSPACE.idFromName(workspaceId)),
    (_instance: WorkspaceDurableObject, state) => ({
      streams: state.storage.sql
        .exec<{ id: string }>('SELECT "id" FROM "sys_eventStream"')
        .toArray(),
      queries: state.storage.sql
        .exec<{ eventStreamId: string; queryId: string }>(
          'SELECT "eventStreamId", "queryId" FROM "sys_eventStreamQuery"',
        )
        .toArray(),
      connections: state.getWebSockets().length,
    }),
  );
