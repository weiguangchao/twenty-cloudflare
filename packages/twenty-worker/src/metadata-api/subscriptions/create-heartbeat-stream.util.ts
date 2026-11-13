export const HEARTBEAT_INTERVAL_MILLISECONDS = 30_000;

type Heartbeat = {
  eventStreamId: string;
  objectRecordEventsWithQueryIds: never[];
  metadataEvents: never[];
  queueJobEvents: never[];
};

export const createHeartbeatStream = (
  eventStreamId: string,
  signal: AbortSignal,
): AsyncIterableIterator<Heartbeat> => {
  let isInitial = true;
  let isClosed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingRead: ((value: IteratorResult<Heartbeat>) => void) | undefined;
  const heartbeat = (): IteratorResult<Heartbeat> => ({
    done: false,
    value: {
      eventStreamId,
      objectRecordEventsWithQueryIds: [],
      metadataEvents: [],
      queueJobEvents: [],
    },
  });
  const close = () => {
    isClosed = true;
    clearTimeout(timer);
    pendingRead?.({ done: true, value: undefined });
    pendingRead = undefined;
    signal.removeEventListener('abort', close);
  };
  if (signal.aborted) close();
  else signal.addEventListener('abort', close, { once: true });

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (isClosed) return Promise.resolve({ done: true, value: undefined });
      if (isInitial) {
        isInitial = false;
        return Promise.resolve(heartbeat());
      }
      return new Promise((resolve) => {
        pendingRead = resolve;
        timer = setTimeout(() => {
          pendingRead = undefined;
          resolve(heartbeat());
        }, HEARTBEAT_INTERVAL_MILLISECONDS);
      });
    },
    return() {
      close();
      return Promise.resolve({ done: true, value: undefined });
    },
  };
};
