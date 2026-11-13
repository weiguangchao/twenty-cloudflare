import { apiError } from '@/shared/errors/api-error.util';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { isStreamSessionActive } from '@/workspace/subscriptions/event-stream-session.util';
import {
  type EventPayload,
  type StreamIdentity,
} from '@/workspace/subscriptions/event-stream.type';
import { HEARTBEAT_INTERVAL_MILLISECONDS } from '@/metadata-api/subscriptions/event-stream.constant';

export const createEventStream = async (
  context: MetadataContext,
  eventStreamId: string,
): Promise<AsyncIterableIterator<EventPayload>> => {
  const data = await context.requireMetadata();
  const auth = await context.requireAuth();
  const identity: StreamIdentity = {
    userId: auth.userId,
    userWorkspaceId: data.membership.id,
    workspaceMemberId: data.membership.workspaceMemberId,
    workspaceId: data.workspace.id,
    sessionId: auth.sessionId,
    origin: new URL(context.request.url).origin,
  };
  const url = new URL('/_event-stream', context.request.url);
  url.searchParams.set('eventStreamId', eventStreamId);
  const headers = new Headers(context.request.headers);
  headers.set('upgrade', 'websocket');
  const response = await context
    .workspace(data.workspace.id)
    .fetch(new Request(url, { headers }));
  if (response.status !== 101 || !response.webSocket) {
    const result = (await response.json()) as {
      error?: { message: string; code: string };
    };
    throw apiError(
      result.error?.message ?? 'Unable to connect to event stream',
      result.error?.code ?? 'INTERNAL_SERVER_ERROR',
    );
  }
  const socket = response.webSocket;
  const initial: EventPayload = {
    eventStreamId,
    objectRecordEventsWithQueryIds: [],
    metadataEvents: [],
    queueJobEvents: [],
  };
  const queue: EventPayload[] = [initial];
  let queuedBytes = 0;
  let closed = false;
  let failure: Error | undefined;
  let pending:
    | {
        resolve: (value: IteratorResult<EventPayload>) => void;
        reject: (error: Error) => void;
      }
    | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let checking = false;
  const close = (error?: Error) => {
    if (closed) return;
    closed = true;
    failure = error;
    clearInterval(timer);
    queue.length = 0;
    socket.removeEventListener('message', onMessage);
    socket.removeEventListener('close', onClose);
    socket.removeEventListener('error', onError);
    context.request.signal.removeEventListener('abort', onAbort);
    try {
      socket.close(1000, 'SSE connection closed');
    } catch {
      // The peer may already have closed.
    }
    if (pending)
      error
        ? pending.reject(error)
        : pending.resolve({ done: true, value: undefined });
    pending = undefined;
  };
  const push = (payload: EventPayload, size = 0) => {
    if (closed) return;
    if (pending) {
      pending.resolve({ done: false, value: payload });
      pending = undefined;
      return;
    }
    queuedBytes += size;
    if (queue.length >= 100 || queuedBytes > 1_000_000) {
      close(
        apiError(
          'Event stream consumer is too slow',
          'EVENT_STREAM_INTERRUPTED',
        ),
      );
      return;
    }
    queue.push(payload);
  };
  const onMessage = (event: MessageEvent) => {
    if (event.data === 'pong') return;
    if (typeof event.data !== 'string') {
      close(apiError('Invalid event stream message'));
      return;
    }
    try {
      const payload = JSON.parse(event.data) as EventPayload;
      if (payload.eventStreamId !== eventStreamId)
        throw new Error('Invalid event stream');
      context.invalidateMetadata();
      push(payload, new TextEncoder().encode(event.data).length);
    } catch {
      close(apiError('Invalid event stream message'));
    }
  };
  const onClose = () =>
    close(apiError('Event stream disconnected', 'EVENT_STREAM_INTERRUPTED'));
  const onError = () =>
    close(apiError('Event stream interrupted', 'EVENT_STREAM_INTERRUPTED'));
  const onAbort = () => close();
  socket.addEventListener('message', onMessage);
  socket.addEventListener('close', onClose);
  socket.addEventListener('error', onError);
  socket.accept();
  if (context.request.signal.aborted) close();
  else {
    context.request.signal.addEventListener('abort', onAbort, { once: true });
    timer = setInterval(() => {
      if (checking || closed) return;
      checking = true;
      void isStreamSessionActive(context.env.CORE_DB, identity)
        .then((active) => {
          if (!active) {
            close(
              apiError('Session is invalid or has expired', 'UNAUTHENTICATED'),
            );
            return;
          }
          if (!closed) {
            socket.send('ping');
            push(initial);
          }
        })
        .catch(() =>
          close(
            apiError(
              'Event stream authorization failed',
              'EVENT_STREAM_INTERRUPTED',
            ),
          ),
        )
        .finally(() => {
          checking = false;
        });
    }, HEARTBEAT_INTERVAL_MILLISECONDS);
  }
  const iterator: AsyncIterableIterator<EventPayload> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (failure) return Promise.reject(failure);
      if (closed) return Promise.resolve({ done: true, value: undefined });
      if (queue.length) {
        const value = queue.shift()!;
        queuedBytes = queue.reduce(
          (bytes, payload) =>
            bytes + new TextEncoder().encode(JSON.stringify(payload)).length,
          0,
        );
        return Promise.resolve({ done: false, value });
      }
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
      });
    },
    return() {
      close();
      return Promise.resolve({ done: true, value: undefined });
    },
    throw(error: Error) {
      close(error);
      return Promise.reject(error);
    },
  };
  return iterator;
};
