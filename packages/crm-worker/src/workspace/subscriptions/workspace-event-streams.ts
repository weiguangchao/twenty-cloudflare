import { GraphQLError } from 'graphql';
import { isPlainObject } from 'crm-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { metadataWritePermissions } from '@/workspace/metadata/operations/execute-metadata-mutation.util';
import {
  type RecordQueryContext,
  type RecordQueryIdentity,
} from '@/workspace/record-api/types/record-query.type';
import {
  type OutboxItem,
  processOutbox,
} from '@/workspace/events/process-outbox.util';
import { isStreamSessionActive } from '@/workspace/subscriptions/event-stream-session.util';
import { readableMetadataEvent } from '@/workspace/subscriptions/metadata-event-payload.util';
import {
  matchesRecordEvent,
  readableRecordEvent,
} from '@/workspace/subscriptions/record-event-payload.util';
import {
  type EventPayload,
  type MetadataChange,
  type QuerySignature,
  type RecordEvent,
  type StreamAttachment,
  type StreamIdentity,
} from '@/workspace/subscriptions/event-stream.type';

const validateId = (value: unknown) => {
  if (typeof value !== 'string' || !value.length || value.length > 256)
    throw apiError('Invalid event stream identifier');
  return value;
};

export class WorkspaceEventStreams {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
    private readonly recordContext: (
      identity: StreamAttachment,
    ) => RecordQueryContext,
  ) {}

  restore() {
    const connections = this.state
      .getWebSockets()
      .map((socket) => socket.deserializeAttachment() as StreamAttachment);
    this.state.storage.sql.exec(
      'DELETE FROM "sys_eventStream" WHERE "connectionId" NOT IN (SELECT value FROM json_each(?))',
      JSON.stringify(connections.map((connection) => connection.connectionId)),
    );
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );
  }

  async connect(eventStreamId: string, identity: StreamIdentity) {
    validateId(eventStreamId);
    const sql = this.state.storage.sql;
    metadataWritePermissions({ sql, store: new MetadataStore(sql) }, identity);
    if (!(await isStreamSessionActive(this.env.CORE_DB, identity)))
      throw apiError('Session is invalid or has expired', 'UNAUTHENTICATED');
    const activeConnections = this.state.getWebSockets();
    if (
      activeConnections.filter(
        (socket) =>
          (socket.deserializeAttachment() as StreamAttachment)
            .userWorkspaceId === identity.userWorkspaceId,
      ).length >= 20 ||
      activeConnections.length >= 1000
    )
      throw apiError('Too many event streams', 'TOO_MANY_REQUESTS');
    const existing = sql
      .exec<{ userWorkspaceId: string }>(
        'SELECT "userWorkspaceId" FROM "sys_eventStream" WHERE "id" = ?',
        eventStreamId,
      )
      .toArray()[0];
    if (existing && existing.userWorkspaceId !== identity.userWorkspaceId)
      throw apiError(
        'Event stream already exists',
        'FORBIDDEN',
        'EVENT_STREAM_ALREADY_EXISTS',
      );
    for (const socket of this.state.getWebSockets(eventStreamId))
      this.close(socket, 1000);
    const pair = new WebSocketPair();
    const attachment: StreamAttachment = {
      ...identity,
      eventStreamId,
      connectionId: crypto.randomUUID(),
      createdAfterSequence: sql
        .exec<{ sequence: number }>(
          'SELECT COALESCE(MAX(rowid), 0) AS "sequence" FROM "sys_outbox"',
        )
        .one().sequence,
    };
    this.state.storage.transactionSync(() => {
      sql.exec('DELETE FROM "sys_eventStream" WHERE "id" = ?', eventStreamId);
      sql.exec(
        'INSERT INTO "sys_eventStream" ("id", "connectionId", "userWorkspaceId") VALUES (?, ?, ?)',
        eventStreamId,
        attachment.connectionId,
        identity.userWorkspaceId,
      );
    });
    this.state.acceptWebSocket(pair[1], [eventStreamId]);
    pair[1].serializeAttachment(attachment);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  query(
    action: 'add' | 'remove',
    input: Record<string, unknown>,
    identity: RecordQueryIdentity,
  ) {
    const eventStreamId = validateId(input.eventStreamId),
      queryId = validateId(input.queryId);
    const sql = this.state.storage.sql;
    metadataWritePermissions({ sql, store: new MetadataStore(sql) }, identity);
    const stream = sql
      .exec<{ userWorkspaceId: string }>(
        'SELECT "userWorkspaceId" FROM "sys_eventStream" WHERE "id" = ?',
        eventStreamId,
      )
      .toArray()[0];
    if (!stream) return true;
    if (stream.userWorkspaceId !== identity.userWorkspaceId)
      throw apiError('Event stream access denied', 'FORBIDDEN');
    if (action === 'remove') {
      sql.exec(
        'DELETE FROM "sys_eventStreamQuery" WHERE "eventStreamId" = ? AND "queryId" = ?',
        eventStreamId,
        queryId,
      );
      return true;
    }
    const signature = input.operationSignature;
    if (
      !isPlainObject(signature) ||
      (!('objectNameSingular' in signature) &&
        !('metadataName' in signature)) ||
      !isPlainObject(signature.variables) ||
      JSON.stringify(signature).length > 32_000
    )
      throw apiError('Invalid operation signature');
    if (
      sql
        .exec<{ count: number }>(
          'SELECT COUNT(*) AS "count" FROM "sys_eventStreamQuery" WHERE "eventStreamId" = ?',
          eventStreamId,
        )
        .one().count >= 200 &&
      !sql
        .exec(
          'SELECT 1 FROM "sys_eventStreamQuery" WHERE "eventStreamId" = ? AND "queryId" = ?',
          eventStreamId,
          queryId,
        )
        .toArray().length
    )
      throw apiError('Too many event stream queries');
    sql.exec(
      'INSERT INTO "sys_eventStreamQuery" ("eventStreamId", "queryId", "signature") VALUES (?, ?, ?) ON CONFLICT ("eventStreamId", "queryId") DO UPDATE SET "signature" = excluded."signature"',
      eventStreamId,
      queryId,
      JSON.stringify(signature),
    );
    return true;
  }

  close(socket: WebSocket, code = 1000) {
    const attachment =
      socket.deserializeAttachment() as StreamAttachment | null;
    if (attachment)
      this.state.storage.sql.exec(
        'DELETE FROM "sys_eventStream" WHERE "id" = ? AND "connectionId" = ?',
        attachment.eventStreamId,
        attachment.connectionId,
      );
    socket.close(
      code,
      code === 1000 ? 'Event stream closed' : 'Event stream must reconnect',
    );
  }

  async publish() {
    const sql = this.state.storage.sql;
    const sessions = new Map<string, Promise<boolean>>();
    const contexts = new Map<string, RecordQueryContext>();
    const deliver = async (item: OutboxItem) => {
      for (const socket of this.state.getWebSockets()) {
        const identity = socket.deserializeAttachment() as StreamAttachment;
        if (
          identity.createdAfterSequence >=
          sql
            .exec<{ sequence: number }>(
              'SELECT rowid AS "sequence" FROM "sys_outbox" WHERE "id" = ?',
              item.id,
            )
            .one().sequence
        )
          continue;
        const active =
          sessions.get(identity.sessionId) ??
          isStreamSessionActive(this.env.CORE_DB, identity);
        sessions.set(identity.sessionId, active);
        if (!(await active)) {
          this.close(socket, 1008);
          continue;
        }
        const store = new MetadataStore(sql);
        let context: RecordQueryContext;
        try {
          if (!contexts.has(identity.connectionId))
            metadataWritePermissions({ sql, store }, identity);
          context =
            contexts.get(identity.connectionId) ?? this.recordContext(identity);
          contexts.set(identity.connectionId, context);
        } catch {
          this.close(socket, 1008);
          continue;
        }
        const payload: EventPayload = {
          eventStreamId: identity.eventStreamId,
          objectRecordEventsWithQueryIds: [],
          metadataEvents: [],
          queueJobEvents: [],
        };
        if (item.kind === 'metadata-event') {
          payload.metadataEvents = (item.payload as MetadataChange[]).flatMap(
            (event) => {
              const readable = readableMetadataEvent(
                store,
                context.permissions,
                event,
              );
              return readable ? [readable] : [];
            },
          );
        } else {
          const batch = item.payload as {
            name: string;
            objectMetadata: { id: string; nameSingular: string };
            event: Omit<RecordEvent, 'action' | 'objectNameSingular'>;
          };
          const object = context.catalog.objectsById.get(
            batch.objectMetadata.id,
          );
          if (!object) continue;
          const event: RecordEvent = {
            ...batch.event,
            objectNameSingular: object.nameSingular,
            action: batch.name
              .split('.')[1]
              .toUpperCase() as RecordEvent['action'],
          };
          const queryIds = sql
            .exec<{ queryId: string; signature: string }>(
              'SELECT "queryId", "signature" FROM "sys_eventStreamQuery" WHERE "eventStreamId" = ?',
              identity.eventStreamId,
            )
            .toArray()
            .flatMap((query) => {
              try {
                return matchesRecordEvent(
                  context,
                  object,
                  JSON.parse(query.signature) as QuerySignature,
                  event,
                )
                  ? [query.queryId]
                  : [];
              } catch (error) {
                if (error instanceof GraphQLError) return [];
                throw error;
              }
            });
          if (!queryIds.length) continue;
          const readable = readableRecordEvent(context, object, event);
          if (readable)
            payload.objectRecordEventsWithQueryIds.push({
              queryIds,
              objectRecordEvent: readable,
            });
        }
        if (
          !payload.metadataEvents.length &&
          !payload.objectRecordEventsWithQueryIds.length
        )
          continue;
        const message = JSON.stringify(payload);
        if (new TextEncoder().encode(message).length > 512_000) {
          this.close(socket, 1013);
          continue;
        }
        try {
          socket.send(message);
        } catch {
          this.close(socket, 1011);
        }
      }
    };
    for (let batch = 0; batch < 50; batch++) {
      const due = sql
        .exec(
          'SELECT 1 FROM "sys_outbox" WHERE "kind" IN (\'record-event\', \'metadata-event\') AND (("status" = \'pending\' AND "availableAt" <= ?) OR ("status" = \'processing\' AND "leaseUntil" <= ?)) LIMIT 1',
          Date.now(),
          Date.now(),
        )
        .toArray().length;
      if (!due) break;
      await processOutbox(this.state.storage, {
        'record-event': deliver,
        'metadata-event': deliver,
      });
    }
  }
}
