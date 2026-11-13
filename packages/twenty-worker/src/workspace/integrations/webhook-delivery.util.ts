import { type RecordQueryContext } from '@/workspace/record-api/types/record-query.type';
import { type RecordEvent } from '@/workspace/subscriptions/event-stream.type';
import { type WebhookRow } from '@/workspace/integrations/types/integration.type';
import { enqueueOutbox } from '@/workspace/events/enqueue-outbox.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { buildPermissionContext } from '@/workspace/permissions/build-permission-context.util';
import { readableRecordEvent } from '@/workspace/subscriptions/record-event-payload.util';

export const enqueueWebhookDeliveries = (
  context: RecordQueryContext,
  event: RecordEvent,
) => {
  const operation = `${event.objectNameSingular}.${event.action.toLowerCase()}`;
  for (const webhook of context.sql
    .exec<WebhookRow>('SELECT * FROM "sys_webhook" WHERE "deletedAt" IS NULL')
    .toArray()) {
    const operations = JSON.parse(webhook.operations) as string[];
    if (
      !operations.some(
        (pattern) =>
          pattern === operation ||
          pattern === '*.*' ||
          pattern === `${event.objectNameSingular}.*` ||
          pattern === `*.${event.action.toLowerCase()}`,
      )
    )
      continue;
    const id = crypto.randomUUID();
    context.sql.exec(
      'INSERT INTO "sys_webhookDelivery" ("id", "webhookId", "event", "availableAt", "createdAt") VALUES (?, ?, ?, ?, ?)',
      id,
      webhook.id,
      JSON.stringify({
        event,
        workspaceId: context.fileUrl?.workspaceId,
        origin: context.fileUrl?.origin,
      }),
      Date.now(),
      Date.now(),
    );
    enqueueOutbox(context.sql, 'webhook-dispatch', { deliveryId: id });
  }
};

export const prepareWebhookDelivery = (
  storage: DurableObjectStorage,
  id: string,
  recordContext: Omit<RecordQueryContext, 'permissions'>,
  secret: string,
) =>
  storage.transactionSync(() => {
    const row = storage.sql
      .exec<{
        webhookId: string;
        event: string;
        attempts: number;
        createdAt: number;
      }>(
        'UPDATE "sys_webhookDelivery" SET "status" = \'sending\', "attempts" = "attempts" + 1, "leaseUntil" = ? WHERE "id" = ? AND "createdAt" > ? AND "attempts" < 10 AND (("status" = \'pending\' AND "availableAt" <= ?) OR ("status" = \'sending\' AND "leaseUntil" <= ?)) RETURNING "webhookId", "event", "attempts", "createdAt"',
        Date.now() + 30_000,
        id,
        Date.now() - 24 * 60 * 60 * 1000,
        Date.now(),
        Date.now(),
      )
      .toArray()[0];
    if (!row) {
      const existing = storage.sql
        .exec<{ status: string; attempts: number; createdAt: number }>(
          'SELECT "status", "attempts", "createdAt" FROM "sys_webhookDelivery" WHERE "id" = ?',
          id,
        )
        .toArray()[0];
      return existing &&
        existing.status !== 'done' &&
        existing.attempts < 10 &&
        existing.createdAt > Date.now() - 86_400_000
        ? { retry: true as const }
        : null;
    }
    const webhook = storage.sql
      .exec<WebhookRow>(
        'SELECT * FROM "sys_webhook" WHERE "id" = ? AND "deletedAt" IS NULL',
        row.webhookId,
      )
      .toArray()[0];
    const data = JSON.parse(row.event) as {
      event: RecordEvent;
      workspaceId?: string;
      origin?: string;
    };
    const object = recordContext.catalog.objects.find(
      (object) => object.nameSingular === data.event.objectNameSingular,
    );
    const permissions = webhook
      ? buildPermissionContext(new MetadataStore(storage.sql), webhook.id, [
          webhook.roleId,
        ])
      : undefined;
    const readable =
      webhook && object && permissions
        ? readableRecordEvent(
            {
              ...recordContext,
              permissions,
              fileUrl:
                data.workspaceId && data.origin
                  ? {
                      secret,
                      workspaceId: data.workspaceId,
                      origin: data.origin,
                    }
                  : undefined,
            },
            object,
            data.event,
          )
        : undefined;
    if (!webhook || !readable) {
      storage.sql.exec(
        'UPDATE "sys_webhookDelivery" SET "status" = \'done\', "event" = \'{}\', "leaseUntil" = NULL WHERE "id" = ?',
        id,
      );
      return null;
    }
    return {
      retry: false as const,
      attempt: row.attempts,
      targetUrl: webhook.targetUrl,
      secret: webhook.secret,
      body: JSON.stringify({
        deliveryId: id,
        webhookId: webhook.id,
        workspaceId: data.workspaceId,
        eventName: `${readable.objectNameSingular}.${readable.action.toLowerCase()}`,
        objectMetadata: {
          id: object!.id,
          nameSingular: readable.objectNameSingular,
        },
        record: readable.properties.after ?? readable.properties.before,
        updatedFields: readable.properties.updatedFields,
        eventDate: new Date(row.createdAt).toISOString(),
      }),
    };
  });

export const completeWebhookDelivery = (
  sql: SqlStorage,
  id: string,
  attempt: number,
  success: boolean,
) => {
  sql.exec(
    'UPDATE "sys_webhookDelivery" SET "status" = ?, "event" = CASE WHEN ? THEN \'{}\' ELSE "event" END, "availableAt" = ?, "leaseUntil" = NULL WHERE "id" = ? AND "attempts" = ? AND "status" = \'sending\'',
    success ? 'done' : 'pending',
    Number(success),
    Date.now() + Math.min(3_600_000, 1000 * 2 ** attempt),
    id,
    attempt,
  );
};
