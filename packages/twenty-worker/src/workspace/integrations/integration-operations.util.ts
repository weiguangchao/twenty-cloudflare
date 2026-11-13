import { CUSTOM_APPLICATION_ID } from '@/workspace/metadata/constants/metadata-application-ids.constant';
import { isPlainObject, isValidUuid } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { validateWebhookUrl } from '@/integrations/validate-webhook-url.util';
import { metadataWritePermissions } from '@/workspace/metadata/operations/execute-metadata-mutation.util';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { createUiMetadataRow } from '@/workspace/metadata/operations/utils/create-ui-metadata-row.util';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';
import {
  type ApiKeyRow,
  type WebhookRow,
} from '@/workspace/integrations/types/integration.type';

const expiration = (value: unknown) => {
  const date = typeof value === 'string' ? new Date(value) : new Date(NaN);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
    throw apiError('Expiration must be a future date');
  return date.toISOString();
};

export const integrationOperation = (
  context: MetadataOperationContext,
  identity: RecordQueryIdentity,
  operation: string,
  input: Record<string, unknown>,
) => {
  const permissions = metadataWritePermissions(context, identity);
  if (!permissions.permissionFlags.includes('API_KEYS_AND_WEBHOOKS'))
    throw apiError('Permission denied', 'FORBIDDEN');
  const { sql, store } = context;
  if (operation === 'getApiKeyRoles')
    return store.findMany('role').filter((role) => role.canBeAssignedToApiKeys);
  const role = (roleId: unknown) => {
    if (typeof roleId !== 'string') throw apiError('Role is required');
    const role = store.findById('role', roleId);
    if (!role || !role.canBeAssignedToApiKeys)
      throw apiError('Role cannot be assigned to integrations');
    return role;
  };
  const assignRole = (
    kind: 'apiKey' | 'webhook',
    id: string,
    roleId: string,
  ) => {
    store.delete(
      'roleTarget',
      store
        .findMany('roleTarget', { [`${kind}Id`]: id })
        .map((target) => target.id),
    );
    store.insert(
      'roleTarget',
      createUiMetadataRow('roleTarget', { roleId, [`${kind}Id`]: id }),
    );
  };
  const keyView = (key: ApiKeyRow) => ({
    ...key,
    tokenHash: undefined,
    role: store.findById('role', key.roleId),
  });
  const webhookView = (webhook: WebhookRow) => ({
    ...webhook,
    operations: JSON.parse(webhook.operations),
    role: store.findById('role', webhook.roleId),
  });
  if (operation === 'apiKeys')
    return sql
      .exec<ApiKeyRow>('SELECT * FROM "sys_apiKey" ORDER BY "createdAt"')
      .toArray()
      .map(keyView);
  if (operation === 'webhooks')
    return sql
      .exec<WebhookRow>(
        'SELECT * FROM "sys_webhook" WHERE "deletedAt" IS NULL ORDER BY "createdAt"',
      )
      .toArray()
      .map(webhookView);
  const id = input.id ?? crypto.randomUUID();
  if (typeof id !== 'string' || !isValidUuid(id))
    throw apiError('Invalid integration identifier');
  const now = new Date().toISOString();
  if (operation === 'apiKey') {
    const key = sql
      .exec<ApiKeyRow>('SELECT * FROM "sys_apiKey" WHERE "id" = ?', id)
      .toArray()[0];
    return key ? keyView(key) : null;
  }
  if (operation === 'assignRoleToApiKey') {
    const assigned = role(input.roleId);
    const key = sql
      .exec<ApiKeyRow>(
        'UPDATE "sys_apiKey" SET "roleId" = ?, "updatedAt" = ? WHERE "id" = ? RETURNING *',
        assigned.id,
        now,
        id,
      )
      .toArray()[0];
    if (!key) throw apiError('API key not found', 'NOT_FOUND');
    assignRole('apiKey', id, assigned.id);
    return true;
  }
  if (operation === 'createApiKey') {
    const assigned = role(input.roleId);
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.length > 256
    )
      throw apiError('API key name is required');
    sql.exec(
      'INSERT INTO "sys_apiKey" ("id", "name", "roleId", "expiresAt", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
      id,
      input.name.trim(),
      assigned.id,
      expiration(input.expiresAt),
      now,
      now,
    );
    assignRole('apiKey', id, assigned.id);
  } else if (
    ['updateApiKey', 'revokeApiKey', 'generateApiKeyToken'].includes(operation)
  ) {
    const key = sql
      .exec<ApiKeyRow>('SELECT * FROM "sys_apiKey" WHERE "id" = ?', id)
      .toArray()[0];
    if (!key) throw apiError('API key not found', 'NOT_FOUND');
    if (operation === 'revokeApiKey')
      sql.exec(
        'UPDATE "sys_apiKey" SET "revokedAt" = ?, "tokenHash" = NULL, "updatedAt" = ? WHERE "id" = ?',
        now,
        now,
        id,
      );
    else if (operation === 'generateApiKeyToken') {
      if (
        key.revokedAt ||
        key.expiresAt <= now ||
        typeof input.tokenHash !== 'string'
      )
        throw apiError('API key is revoked or expired', 'FORBIDDEN');
      const expiresAt = expiration(input.expiresAt);
      if (expiresAt > key.expiresAt)
        throw apiError('Token expiration cannot exceed API key expiration');
      sql.exec(
        'UPDATE "sys_apiKey" SET "tokenHash" = ?, "expiresAt" = ?, "updatedAt" = ? WHERE "id" = ?',
        input.tokenHash,
        expiresAt,
        now,
        id,
      );
    } else {
      if (
        input.name !== undefined &&
        (typeof input.name !== 'string' ||
          !input.name.trim() ||
          input.name.length > 256)
      )
        throw apiError('Invalid API key name');
      sql.exec(
        'UPDATE "sys_apiKey" SET "name" = ?, "expiresAt" = ?, "revokedAt" = ?, "updatedAt" = ? WHERE "id" = ?',
        typeof input.name === 'string' ? input.name.trim() : key.name,
        input.expiresAt === undefined
          ? key.expiresAt
          : expiration(input.expiresAt),
        input.revokedAt ? now : key.revokedAt,
        now,
        id,
      );
    }
  } else if (operation === 'createWebhook' || operation === 'updateWebhook') {
    const existing = sql
      .exec<WebhookRow>(
        'SELECT * FROM "sys_webhook" WHERE "id" = ? AND "deletedAt" IS NULL',
        id,
      )
      .toArray()[0];
    if (operation === 'updateWebhook' && !existing)
      throw apiError('Webhook not found', 'NOT_FOUND');
    const patch = operation === 'updateWebhook' ? input.update : input;
    if (!isPlainObject(patch)) throw apiError('Invalid webhook input');
    const assigned = role(patch.roleId ?? existing?.roleId);
    const operations =
      patch.operations ??
      (existing ? (JSON.parse(existing.operations) as unknown) : []);
    if (
      !Array.isArray(operations) ||
      operations.length > 100 ||
      !operations.length ||
      operations.some(
        (operation) =>
          typeof operation !== 'string' ||
          !/^(\*|[A-Za-z][A-Za-z0-9]*)\.(\*|created|updated|deleted|destroyed|restored)$/.test(
            operation,
          ),
      )
    )
      throw apiError('Invalid webhook operations');
    const targetUrl = validateWebhookUrl(
      String(patch.targetUrl ?? existing?.targetUrl ?? ''),
    );
    const secret = patch.secret ?? existing?.secret;
    if (typeof secret !== 'string' || secret.length < 16 || secret.length > 256)
      throw apiError('Webhook secret must contain 16 to 256 characters');
    const applicationId = CUSTOM_APPLICATION_ID;
    if (!applicationId) throw apiError('Workspace application is missing');
    sql.exec(
      'INSERT INTO "sys_webhook" ("id", "targetUrl", "operations", "description", "secret", "roleId", "applicationId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT ("id") DO UPDATE SET "targetUrl" = excluded."targetUrl", "operations" = excluded."operations", "description" = excluded."description", "secret" = excluded."secret", "roleId" = excluded."roleId", "updatedAt" = excluded."updatedAt"',
      id,
      targetUrl,
      JSON.stringify(operations),
      typeof patch.description === 'string'
        ? patch.description.slice(0, 2000)
        : (existing?.description ?? null),
      secret,
      assigned.id,
      applicationId,
      existing?.createdAt ?? now,
      now,
    );
    assignRole('webhook', id, assigned.id);
    return webhookView(
      sql
        .exec<WebhookRow>('SELECT * FROM "sys_webhook" WHERE "id" = ?', id)
        .one(),
    );
  } else if (operation === 'deleteWebhook') {
    const webhook = sql
      .exec<WebhookRow>(
        'SELECT * FROM "sys_webhook" WHERE "id" = ? AND "deletedAt" IS NULL',
        id,
      )
      .toArray()[0];
    if (!webhook) throw apiError('Webhook not found', 'NOT_FOUND');
    sql.exec(
      'UPDATE "sys_webhook" SET "deletedAt" = ?, "updatedAt" = ? WHERE "id" = ?',
      now,
      now,
      id,
    );
    store.delete(
      'roleTarget',
      store
        .findMany('roleTarget', { webhookId: id })
        .map((target) => target.id),
    );
    return webhookView({ ...webhook, deletedAt: now, updatedAt: now });
  } else if (operation === 'webhook') {
    const webhook = sql
      .exec<WebhookRow>(
        'SELECT * FROM "sys_webhook" WHERE "id" = ? AND "deletedAt" IS NULL',
        id,
      )
      .toArray()[0];
    return webhook ? webhookView(webhook) : null;
  } else throw apiError('Unknown integration operation');
  return keyView(
    sql.exec<ApiKeyRow>('SELECT * FROM "sys_apiKey" WHERE "id" = ?', id).one(),
  );
};
