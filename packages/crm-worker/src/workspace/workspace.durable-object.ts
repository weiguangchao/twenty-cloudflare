import { isPlainObject } from 'crm-shared/utils';
import { executeMcpRequest } from '@/mcp/execute-mcp-request.util';
import { type McpRequest } from '@/mcp/types/mcp.type';
import { logEvent, logOperationName } from '@/observability/log-event.util';
import { enqueueOutbox } from '@/workspace/events/enqueue-outbox.util';
import {
  prepareWebhookDelivery,
  completeWebhookDelivery,
} from '@/workspace/integrations/webhook-delivery.util';
import { integrationOperation } from '@/workspace/integrations/integration-operations.util';
import { type ApiKeyRow } from '@/workspace/integrations/types/integration.type';
import {
  buildRestOperation,
  type RestRequest,
} from '@/workspace/integrations/build-rest-operation.util';
import { authenticateRequest } from '@/auth/session.service';
import { WorkspaceEventStreams } from '@/workspace/subscriptions/workspace-event-streams';
import {
  removeWorkspaceMember,
  processMemberCleanup,
} from '@/workspace/lifecycle/remove-workspace-member.util';
import {
  updateWorkspaceSettings,
  processWorkspaceSettings,
} from '@/workspace/lifecycle/workspace-settings.util';
import { DurableObject } from 'cloudflare:workers';
import { GraphQLError } from 'graphql';
import { RecordMutationRollback } from '@/workspace/record-api/mutations/record-mutation-rollback.exception';
import {
  processOutbox,
  scheduleWorkspaceAlarm,
} from '@/workspace/events/process-outbox.util';
import { cleanupTrash } from '@/workspace/events/cleanup-trash.util';
import { initializeRecordIndexTypes } from '@/workspace/metadata/ddl/record-index-ddl.util';

import { type WorkspaceMemberInput } from '@/workspace/lifecycle/types/workspace-member-input.type';
import {
  activateWorkspaceRecords,
  addWorkspaceMember,
  getWorkspaceMember,
} from '@/workspace/lifecycle/workspace-members.util';

import { createField } from '@/workspace/metadata/operations/create-field.operation';
import { createObject } from '@/workspace/metadata/operations/create-object.operation';
import { deleteField } from '@/workspace/metadata/operations/delete-field.operation';
import { deleteObject } from '@/workspace/metadata/operations/delete-object.operation';
import {
  type CreateIndexInput,
  createIndex,
  deleteIndex,
} from '@/workspace/metadata/operations/index-operations';
import { runMetadataOperation } from '@/workspace/metadata/operations/run-metadata-operation.util';
import { updateField } from '@/workspace/metadata/operations/update-field.operation';
import { updateObject } from '@/workspace/metadata/operations/update-object.operation';
import {
  type MetadataSnapshot,
  buildMetadataSnapshot,
  computeMetadataSnapshotVersion,
} from '@/workspace/metadata/snapshot/build-metadata-snapshot.util';
import {
  type MetadataCollectionHash,
  getMetadataCollectionHashes,
} from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import {
  type CreateFieldInput,
  type UpdateFieldInput,
} from '@/workspace/metadata/types/field-metadata-inputs.type';
import {
  type CreateObjectInput,
  type UpdateObjectInput,
} from '@/workspace/metadata/types/object-metadata-inputs.type';
import { runWorkspaceMigrations } from '@/workspace/migrations/run-workspace-migrations.util';
import { WORKSPACE_MIGRATIONS } from '@/workspace/migrations/workspace-migrations.constant';
import standardMetadata from '@/workspace/seed/standard-metadata.json';
import { buildPermissionContext } from '@/workspace/permissions/build-permission-context.util';
import { readMetadataTables } from '@/workspace/metadata/read/read-metadata-tables.util';
import {
  type MetadataReadModel,
  type MetadataReadTables,
} from '@/workspace/metadata/read/types/metadata-read-model.type';
import { getWorkspaceApplications } from '@/workspace/metadata/read/workspace-applications.util';
import {
  attachRecordResolvers,
  executeRecordQuery,
} from '@/workspace/record-api/execute-record-query.util';
import { createRecordCatalog } from '@/workspace/record-api/record-catalog.util';
import { buildRecordSchema } from '@/workspace/record-api/schema/build-record-schema.util';
import {
  type RecordCatalog,
  type RecordQueryIdentity,
  type RecordQueryInput,
} from '@/workspace/record-api/types/record-query.type';
import { apiError } from '@/shared/errors/api-error.util';
import { executeFileOperation } from '@/files/execute-file-operation.util';
import { WorkspaceFileStore } from '@/files/workspace-file-store';
import { attachWorkspacePicture } from '@/files/attach-workspace-picture.util';
import {
  expireFileUploads,
  processFileCleanup,
  deleteWorkspaceFiles,
} from '@/files/cleanup-files.util';
import { navigationRecordIdentifiers } from '@/workspace/metadata/read/navigation-record-identifiers.util';
import {
  executeMetadataMutation,
  metadataWritePermissions,
} from '@/workspace/metadata/operations/execute-metadata-mutation.util';

// One instance per workspace, addressed with WORKSPACE.idFromName(workspaceId).
export class WorkspaceDurableObject extends DurableObject<Env> {
  private readonly eventStreams: WorkspaceEventStreams;
  private realtimeDelivery: Promise<void> | undefined;
  private metadataSnapshot: MetadataSnapshot | undefined;
  private recordModel:
    | { catalog: RecordCatalog; schema: ReturnType<typeof buildRecordSchema> }
    | undefined;
  private metadataReadTables:
    | { version: string; tables: MetadataReadTables }
    | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.eventStreams = new WorkspaceEventStreams(ctx, env, (identity) => {
      const snapshot = this.getMetadataSnapshot();
      if (this.recordModel?.catalog.version !== snapshot.version) {
        const catalog = createRecordCatalog(snapshot);
        const schema = buildRecordSchema(catalog);
        attachRecordResolvers(schema);
        this.recordModel = { catalog, schema };
      }
      return {
        sql: ctx.storage.sql,
        ...this.recordModel,
        permissions: buildPermissionContext(
          new MetadataStore(ctx.storage.sql),
          identity.userWorkspaceId,
        ),
        fileUrl: {
          workspaceId: identity.workspaceId,
          origin: identity.origin,
          secret: env.APP_SECRET,
        },
      };
    });

    void ctx.blockConcurrencyWhile(async () => {
      await initializeRecordIndexTypes();
      runWorkspaceMigrations(ctx.storage, WORKSPACE_MIGRATIONS);
      this.eventStreams.restore();
      await scheduleWorkspaceAlarm(ctx.storage, [
        'file-cleanup',
        'member-cleanup',
        'workspace-settings',
        'record-event',
        'metadata-event',
        'webhook-dispatch',
      ]);
    });
  }

  async fetch(request: Request) {
    try {
      if (
        new URL(request.url).pathname !== '/_event-stream' ||
        request.headers.get('upgrade')?.toLowerCase() !== 'websocket'
      )
        return new Response('Not found', { status: 404 });
      const auth = await authenticateRequest(request, this.env);
      if (!auth.workspaceId || !auth.workspaceMemberId || !auth.userWorkspaceId)
        throw apiError('A workspace session is required', 'UNAUTHENTICATED');
      return await this.eventStreams.connect(
        new URL(request.url).searchParams.get('eventStreamId') ?? '',
        {
          ...auth,
          workspaceId: auth.workspaceId,
          userWorkspaceId: auth.userWorkspaceId,
          workspaceMemberId: auth.workspaceMemberId,
          origin: new URL(request.url).origin,
        },
      );
    } catch (error) {
      if (error instanceof GraphQLError)
        return Response.json(
          { error: { message: error.message, code: error.extensions.code } },
          { status: 403 },
        );
      throw error;
    }
  }

  updateEventStreamQuery(
    action: 'add' | 'remove',
    inputJson: string,
    identity: RecordQueryIdentity,
  ) {
    try {
      return JSON.stringify({
        value: this.eventStreams.query(
          action,
          JSON.parse(inputJson) as Record<string, unknown>,
          identity,
        ),
      });
    } catch (error) {
      if (error instanceof GraphQLError)
        return JSON.stringify({ errors: [error] });
      throw error;
    }
  }

  webSocketMessage(socket: WebSocket) {
    this.eventStreams.close(socket, 1008);
  }
  webSocketClose(socket: WebSocket) {
    this.eventStreams.close(socket);
  }
  webSocketError(socket: WebSocket) {
    this.eventStreams.close(socket, 1011);
  }

  private deliverRealtimeEvents() {
    this.realtimeDelivery ??= this.withWorkspaceLock(() =>
      Promise.all([
        this.eventStreams.publish(),
        this.dispatchWebhookJobs(),
      ]).then(() => undefined),
    ).finally(() => {
      this.realtimeDelivery = undefined;
      this.ctx.waitUntil(
        scheduleWorkspaceAlarm(this.ctx.storage, [
          'file-cleanup',
          'member-cleanup',
          'workspace-settings',
          'record-event',
          'metadata-event',
          'webhook-dispatch',
        ]),
      );
    });
    return this.realtimeDelivery;
  }

  ping(): string {
    return 'pong';
  }

  private async withWorkspaceLock<TData>(operation: () => Promise<TData>) {
    // A rejected blockConcurrencyWhile callback resets the DO before outbox retry state is saved.
    const outcome = await this.ctx.blockConcurrencyWhile(async () => {
      try {
        return { status: 'success' as const, value: await operation() };
      } catch (error) {
        return { status: 'error' as const, error };
      }
    });
    if (outcome.status === 'error') throw outcome.error;
    return outcome.value;
  }

  async alarm() {
    if (this.env.MAINTENANCE_MODE === 'true') {
      await this.ctx.storage.setAlarm(Date.now() + 60_000);
      return;
    }
    this.reportCapacity();
    try {
      this.ctx.storage.transactionSync(() => {
        const catalog = createRecordCatalog(this.getMetadataSnapshot());
        const schema = buildRecordSchema(catalog);
        const permissions = buildPermissionContext(
          new MetadataStore(this.ctx.storage.sql),
          'system',
        );
        for (const permission of permissions.objectRecordsPermissions)
          permission.canDestroyAllRecords = true;
        cleanupTrash({
          sql: this.ctx.storage.sql,
          catalog,
          schema,
          permissions,
          mutation: {
            identity: {
              userId: '',
              userWorkspaceId: '',
              workspaceMemberId: '',
            },
            actor: {
              source: 'SYSTEM',
              name: 'System',
              workspaceMemberId: null,
            },
            affectedRecords: 0,
            changed: false,
          },
        });
      });
      await this.deliverRealtimeEvents();
      expireFileUploads(this.ctx.storage);
      await processOutbox(this.ctx.storage, {
        'member-cleanup': (item) =>
          this.withWorkspaceLock(() =>
            processMemberCleanup(this.env.CORE_DB, item),
          ),
        'workspace-settings': () =>
          this.withWorkspaceLock(() =>
            processWorkspaceSettings(this.ctx.storage.sql, this.env.CORE_DB),
          ),
        'file-cleanup': (item) =>
          this.withWorkspaceLock(() =>
            processFileCleanup(this.ctx.storage, this.env, item),
          ),
      });
    } catch (error) {
      this.ctx.storage.sql.exec(
        'UPDATE "sys_scheduledTask" SET "nextRunAt" = ?, "lastError" = ? WHERE "nextRunAt" <= ?',
        Date.now() + 60_000,
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Scheduled task failed',
        Date.now(),
      );
      throw error;
    } finally {
      await scheduleWorkspaceAlarm(this.ctx.storage, [
        'file-cleanup',
        'member-cleanup',
        'workspace-settings',
        'record-event',
        'metadata-event',
        'webhook-dispatch',
      ]);
    }
  }

  activateWorkspace(input: WorkspaceMemberInput) {
    return activateWorkspaceRecords(this.ctx.storage, input);
  }

  addWorkspaceMember(input: WorkspaceMemberInput) {
    return this.ctx.storage.transactionSync(() =>
      addWorkspaceMember(this.ctx.storage.sql, input, false),
    );
  }

  getWorkspaceAuthData(
    input: Pick<WorkspaceMemberInput, 'workspaceMemberId' | 'userWorkspaceId'>,
    memberships: { workspaceMemberId: string; userWorkspaceId: string }[] = [
      input,
    ],
    defaultRoleId?: string | null,
  ) {
    const store = new MetadataStore(this.ctx.storage.sql);
    const roles = store
      .findMany('roleTarget', { userWorkspaceId: input.userWorkspaceId })
      .map((target) => store.findById('role', target.roleId));
    const member = getWorkspaceMember(this.ctx.storage.sql, input);

    return {
      member: member ? { ...member, roles } : null,
      members: this.getWorkspaceMembers(memberships),
      applications: getWorkspaceApplications(store),
      roles,
      permissions: buildPermissionContext(store, input.userWorkspaceId),
      featureFlags: store.findMany('featureFlag'),
      defaultRole:
        (defaultRoleId ? store.findById('role', defaultRoleId) : undefined) ??
        store.findMany('role', {
          universalIdentifier: standardMetadata.defaultRoleUniversalIdentifier,
        })[0],
    };
  }

  getWorkspaceMembers(
    memberships: { workspaceMemberId: string; userWorkspaceId: string }[],
  ) {
    return memberships
      .map((membership) => getWorkspaceMember(this.ctx.storage.sql, membership))
      .filter((member) => member !== null);
  }

  getMetadataReadModel(userWorkspaceId: string): MetadataReadModel {
    const collectionHashes = this.getCollectionHashes();
    const version = collectionHashes.map(({ hash }) => hash).join(':');
    const store = new MetadataStore(this.ctx.storage.sql);
    if (this.metadataReadTables?.version !== version) {
      this.metadataReadTables = { version, tables: readMetadataTables(store) };
    }

    return {
      tables: this.metadataReadTables.tables,
      collectionHashes,
      permissions: buildPermissionContext(store, userWorkspaceId),
      applications: getWorkspaceApplications(store),
    };
  }

  private async dispatchWebhookJobs() {
    const sql = this.ctx.storage.sql;
    for (const pending of sql
      .exec<{
        id: string;
      }>(
        'SELECT "id" FROM "sys_webhookDelivery" WHERE "status" != \'done\' AND "attempts" < 10 AND "availableAt" <= ? AND "queuedUntil" <= ? AND ("leaseUntil" IS NULL OR "leaseUntil" <= ?) AND "createdAt" > ? LIMIT 100',
        Date.now(),
        Date.now(),
        Date.now(),
        Date.now() - 86_400_000,
      )
      .toArray()) {
      const existing = sql
        .exec(
          'SELECT 1 FROM "sys_outbox" WHERE "kind" = \'webhook-dispatch\' AND "status" != \'done\' AND json_extract("payload", \'$.deliveryId\') = ?',
          pending.id,
        )
        .toArray();
      if (!existing.length)
        enqueueOutbox(sql, 'webhook-dispatch', { deliveryId: pending.id });
    }
    await processOutbox(this.ctx.storage, {
      'webhook-dispatch': async (item) => {
        const { deliveryId } = item.payload as { deliveryId: string };
        await this.env.JOBS.send({
          kind: 'webhook-send',
          durableObjectId: this.ctx.id.toString(),
          deliveryId,
        });
        sql.exec(
          'UPDATE "sys_webhookDelivery" SET "queuedUntil" = ? WHERE "id" = ?',
          Date.now() + 300_000,
          deliveryId,
        );
      },
    });
  }

  prepareWebhookDelivery(id: string) {
    const catalog = createRecordCatalog(this.getMetadataSnapshot());
    const schema = buildRecordSchema(catalog);
    return prepareWebhookDelivery(
      this.ctx.storage,
      id,
      {
        sql: this.ctx.storage.sql,
        catalog,
        schema,
      },
      this.env.APP_SECRET,
    );
  }

  completeWebhookDelivery(id: string, attempt: number, success: boolean) {
    completeWebhookDelivery(this.ctx.storage.sql, id, attempt, success);
    this.ctx.waitUntil(this.deliverRealtimeEvents());
  }

  private recordPrincipal(identity: RecordQueryIdentity) {
    const store = new MetadataStore(this.ctx.storage.sql);
    if (identity.apiKeyId) {
      const key = this.ctx.storage.sql
        .exec<ApiKeyRow>(
          'SELECT * FROM "sys_apiKey" WHERE "id" = ?',
          identity.apiKeyId,
        )
        .toArray()[0];
      if (
        !key ||
        key.revokedAt ||
        key.expiresAt <= new Date().toISOString() ||
        !key.tokenHash ||
        key.tokenHash !== identity.apiKeyTokenHash
      )
        throw apiError('API key is invalid or expired', 'UNAUTHENTICATED');
      const permissions = buildPermissionContext(store, identity.apiKeyId, [
        key.roleId,
      ]);
      if (!permissions.roleIds.length)
        throw apiError('API key role is unavailable', 'FORBIDDEN');
      return {
        permissions,
        actor: {
          source: 'API',
          name: key.name,
          workspaceMemberId: null,
          context: {},
        },
      };
    }
    const member = getWorkspaceMember(this.ctx.storage.sql, identity);
    if (!member || member.userId !== identity.userId)
      throw apiError('Workspace access denied', 'FORBIDDEN');
    const permissions = buildPermissionContext(store, identity.userWorkspaceId);
    if (!permissions.roleIds.length)
      throw apiError('Workspace access denied', 'FORBIDDEN');
    return {
      permissions,
      actor: {
        source: 'MANUAL',
        workspaceMemberId: identity.workspaceMemberId,
        name: `${member.name.firstName} ${member.name.lastName}`.trim(),
        context: {},
      },
    };
  }

  executeIntegrationOperation(
    operation: string,
    inputJson: string,
    identity: RecordQueryIdentity,
  ) {
    try {
      const result = runMetadataOperation(this.ctx.storage, (context) =>
        integrationOperation(
          context,
          identity,
          operation,
          JSON.parse(inputJson) as Record<string, unknown>,
        ),
      );
      if (result.status === 'fail') throw apiError(result.failure.message);
      return JSON.stringify({ value: result.value });
    } catch (error) {
      if (error instanceof GraphQLError)
        return JSON.stringify({ errors: [error] });
      throw error;
    } finally {
      this.ctx.waitUntil(this.deliverRealtimeEvents());
    }
  }

  executeMcpRequest(
    inputJson: string,
    identity: RecordQueryIdentity,
    fileUrl: { workspaceId: string; origin: string },
    metaMode: boolean,
    requestId?: string,
  ) {
    try {
      const { permissions } = this.recordPrincipal(identity);
      const snapshot = this.getMetadataSnapshot();
      if (this.recordModel?.catalog.version !== snapshot.version) {
        const catalog = createRecordCatalog(snapshot);
        const schema = buildRecordSchema(catalog);
        attachRecordResolvers(schema);
        this.recordModel = { catalog, schema };
      }
      return JSON.stringify({
        value: executeMcpRequest(
          JSON.parse(inputJson) as McpRequest,
          { sql: this.ctx.storage.sql, ...this.recordModel, permissions },
          (input) =>
            this.executeRecordQuery(
              { ...input, fileUrl, actorSource: 'AGENT', requestId },
              identity,
            ),
          metaMode,
        ),
      });
    } catch (error) {
      if (error instanceof GraphQLError)
        return JSON.stringify({ errors: [error] });
      throw error;
    }
  }

  executeRestRequest(inputJson: string, identity: RecordQueryIdentity) {
    try {
      const input = JSON.parse(inputJson) as RestRequest;
      const { permissions } = this.recordPrincipal(identity);
      const catalog = createRecordCatalog(this.getMetadataSnapshot());
      const schema = buildRecordSchema(catalog);
      const operation = buildRestOperation(input, catalog, schema, permissions);
      const flattenConnections = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(flattenConnections);
        if (!isPlainObject(value)) return value;
        if (Array.isArray(value.edges))
          return value.edges.map((edge: unknown) =>
            isPlainObject(edge) ? flattenConnections(edge.node) : edge,
          );
        return Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [
            key,
            flattenConnections(entry),
          ]),
        );
      };
      const result = JSON.parse(
        this.executeRecordQuery(
          {
            query: operation.query,
            variables: operation.variables,
            fileUrl: { workspaceId: input.workspaceId, origin: input.origin },
          },
          identity,
        ),
      ) as { data?: Record<string, unknown>; errors?: unknown[] };
      if (result.errors) return JSON.stringify(result);
      if (!operation.connection)
        return JSON.stringify(flattenConnections(result));
      const connection = result.data?.[operation.operation] as {
        edges: { node: unknown }[];
        totalCount: number;
        pageInfo: unknown;
      };
      return JSON.stringify({
        data: {
          [operation.objectNamePlural]: connection.edges.map((edge) =>
            flattenConnections(edge.node),
          ),
        },
        totalCount: connection.totalCount,
        pageInfo: connection.pageInfo,
      });
    } catch (error) {
      if (error instanceof GraphQLError)
        return JSON.stringify({ errors: [error] });
      if (error instanceof SyntaxError)
        return JSON.stringify({ errors: [apiError('Invalid REST query')] });
      throw error;
    }
  }

  executeRecordQuery(input: RecordQueryInput, identity: RecordQueryIdentity) {
    const startedAt = performance.now();
    try {
      return this.ctx.storage.transactionSync(() => {
        const { permissions, actor } = this.recordPrincipal(identity);
        const snapshot = this.getMetadataSnapshot();
        if (this.recordModel?.catalog.version !== snapshot.version) {
          const catalog = createRecordCatalog(snapshot);
          const schema = buildRecordSchema(catalog);
          attachRecordResolvers(schema);
          this.recordModel = { catalog, schema };
        }
        return executeRecordQuery(input, {
          ...this.recordModel,
          sql: this.ctx.storage.sql,
          permissions,
          fileUrl: input.fileUrl
            ? { ...input.fileUrl, secret: this.env.APP_SECRET }
            : undefined,
          mutation: {
            identity,
            actor: { ...actor, source: input.actorSource ?? actor.source },
            affectedRecords: 0,
            changed: false,
          },
        });
      });
    } catch (error) {
      if (error instanceof RecordMutationRollback) return error.response;
      if (error instanceof GraphQLError)
        return JSON.stringify({ errors: [error] });
      logEvent(
        {
          event: 'record_operation_failed',
          requestId: input.requestId,
          workspaceId: input.fileUrl?.workspaceId,
          durableObjectId: this.ctx.id.toString(),
          operation: logOperationName(input.operationName),
          errorCode: 'INTERNAL_SERVER_ERROR',
        },
        'error',
      );
      throw error;
    } finally {
      logEvent({
        event: 'record_operation',
        requestId: input.requestId,
        workspaceId: input.fileUrl?.workspaceId,
        durableObjectId: this.ctx.id.toString(),
        operation: logOperationName(input.operationName),
        durationMs: Math.round(performance.now() - startedAt),
      });
      this.ctx.waitUntil(this.deliverRealtimeEvents());
      this.ctx.waitUntil(
        scheduleWorkspaceAlarm(this.ctx.storage, [
          'file-cleanup',
          'member-cleanup',
          'workspace-settings',
          'record-event',
          'metadata-event',
          'webhook-dispatch',
        ]),
      );
    }
  }

  private reportCapacity() {
    const databaseSize = this.ctx.storage.sql.databaseSize;
    const capacityRatio = databaseSize / 10_000_000_000;
    logEvent(
      {
        event:
          capacityRatio >= 0.9
            ? 'workspace_capacity_alert'
            : 'workspace_capacity',
        durableObjectId: this.ctx.id.toString(),
        databaseSize,
        capacityRatio,
      },
      capacityRatio >= 0.9 ? 'error' : 'info',
    );
  }

  async recoverySnapshot() {
    return {
      bookmark: await this.ctx.storage.getCurrentBookmark(),
      databaseSize: this.ctx.storage.sql.databaseSize,
      marker:
        (await this.ctx.storage.get<string>('recovery-drill-marker')) ?? null,
    };
  }

  async writeRecoveryDrillMarker(marker: string) {
    await this.ctx.storage.put('recovery-drill-marker', marker);
    return this.recoverySnapshot();
  }

  async prepareRecovery(bookmark: string) {
    const undoBookmark =
      await this.ctx.storage.onNextSessionRestoreBookmark(bookmark);
    return { undoBookmark };
  }

  restartForRecovery(): void {
    this.ctx.abort('Operator requested point-in-time recovery');
  }

  async deleteRecoveryDrill() {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  private async flushLifecycleJobs() {
    await processOutbox(this.ctx.storage, {
      'member-cleanup': (item) => processMemberCleanup(this.env.CORE_DB, item),
      'workspace-settings': () =>
        processWorkspaceSettings(this.ctx.storage.sql, this.env.CORE_DB),
    });
    this.ctx.waitUntil(this.deliverRealtimeEvents());
    await scheduleWorkspaceAlarm(this.ctx.storage, [
      'file-cleanup',
      'member-cleanup',
      'workspace-settings',
      'record-event',
      'metadata-event',
      'webhook-dispatch',
    ]);
  }

  async updateWorkspaceSettings(
    workspaceId: string,
    values: Record<string, string | number>,
    identity: RecordQueryIdentity,
  ) {
    try {
      return await this.withWorkspaceLock(async () => {
        const result = runMetadataOperation(this.ctx.storage, (context) =>
          updateWorkspaceSettings(context, workspaceId, values, identity),
        );
        await this.flushLifecycleJobs();
        if (
          result.status === 'success' &&
          this.ctx.storage.sql
            .exec<{
              status: string;
            }>('SELECT "status" FROM "sys_outbox" WHERE "id" = ?', result.value)
            .one().status !== 'done'
        )
          throw apiError(
            'Workspace settings could not be synchronized',
            'INTERNAL_SERVER_ERROR',
          );
        return JSON.stringify({ success: true });
      });
    } catch (error) {
      if (error instanceof GraphQLError)
        return JSON.stringify({
          error: { message: error.message, code: error.extensions.code },
        });
      throw error;
    }
  }

  async removeWorkspaceMember(
    workspaceId: string,
    identity: RecordQueryIdentity,
    target: RecordQueryIdentity,
  ) {
    try {
      return await this.withWorkspaceLock(async () => {
        const membership = await this.env.CORE_DB.prepare(
          'SELECT "id" FROM "userWorkspace" WHERE "id" = ? AND "workspaceId" = ? AND "userId" = ? AND "workspaceMemberId" = ?',
        )
          .bind(
            target.userWorkspaceId,
            workspaceId,
            target.userId,
            target.workspaceMemberId,
          )
          .first();
        if (!membership)
          throw apiError('Workspace member not found', 'NOT_FOUND');
        runMetadataOperation(this.ctx.storage, (context) =>
          removeWorkspaceMember(context, identity, target, workspaceId),
        );
        await this.flushLifecycleJobs();
        const remaining = await this.env.CORE_DB.prepare(
          'SELECT "id" FROM "userWorkspace" WHERE "id" = ?',
        )
          .bind(target.userWorkspaceId)
          .first();
        if (remaining)
          throw apiError(
            'Member removal could not be synchronized',
            'INTERNAL_SERVER_ERROR',
          );
        return JSON.stringify({ success: true });
      });
    } catch (error) {
      if (error instanceof GraphQLError)
        return JSON.stringify({ errors: [error] });
      throw error;
    }
  }

  updateWorkspaceMemberProfile(
    workspaceMemberId: string,
    update: Record<
      string,
      string | number | { firstName: string; lastName: string }
    >,
    identity?: RecordQueryIdentity,
  ) {
    try {
      if (identity) {
        const permissions = metadataWritePermissions(
          {
            sql: this.ctx.storage.sql,
            store: new MetadataStore(this.ctx.storage.sql),
          },
          identity,
        );
        if (
          workspaceMemberId !== identity.workspaceMemberId ||
          (Object.keys(update).some((key) =>
            ['name', 'jobTitle'].includes(key),
          ) &&
            !permissions.permissionFlags.includes('PROFILE_INFORMATION'))
        )
          throw apiError('Permission denied', 'FORBIDDEN');
      }
      const allowedColumns = new Set([
        'name',
        'jobTitle',
        'colorScheme',
        'uiScale',
        'openRecordIn',
        'locale',
        'timeZone',
        'dateFormat',
        'timeFormat',
        'calendarStartDay',
        'numberFormat',
      ]);
      const entries = Object.entries(update);
      if (entries.some(([name]) => !allowedColumns.has(name)))
        throw new Error('Unsupported profile setting');
      if (entries.length === 0) return;

      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(
          `UPDATE "rec_workspaceMember" SET ${entries.map(([name]) => `"${name}" = ?`).join(', ')}, "updatedAt" = ? WHERE "id" = ? AND "deletedAt" IS NULL`,
          ...entries.map(([, value]) =>
            typeof value === 'object' ? JSON.stringify(value) : value,
          ),
          new Date().toISOString(),
          workspaceMemberId,
        );
      });
    } catch (error) {
      if (error instanceof GraphQLError)
        return {
          error: {
            message: error.message,
            code: String(error.extensions.code),
          },
        };
      throw error;
    }
  }

  getCollectionHashes(): MetadataCollectionHash[] {
    return getMetadataCollectionHashes(this.ctx.storage.sql);
  }

  getMetadataSnapshot(): MetadataSnapshot {
    const version = computeMetadataSnapshotVersion(this.getCollectionHashes());

    if (this.metadataSnapshot?.version !== version) {
      this.metadataSnapshot = buildMetadataSnapshot(
        new MetadataStore(this.ctx.storage.sql),
        version,
      );
    }

    return this.metadataSnapshot;
  }

  createObject(input: CreateObjectInput) {
    return runMetadataOperation(this.ctx.storage, (context) =>
      createObject(context, input),
    );
  }

  executeMetadataMutation(
    name: string,
    argumentsJson: string,
    identity: RecordQueryIdentity,
  ) {
    try {
      return JSON.stringify(
        runMetadataOperation(this.ctx.storage, (context) =>
          executeMetadataMutation(
            context,
            name,
            JSON.parse(argumentsJson) as Record<string, unknown>,
            identity,
          ),
        ),
      );
    } catch (error) {
      if (error instanceof GraphQLError)
        return JSON.stringify({ errors: [error] });
      throw error;
    } finally {
      this.ctx.waitUntil(this.deliverRealtimeEvents());
    }
  }

  async executeFileOperation(
    operation: string,
    inputJson: string,
    identity?: RecordQueryIdentity,
  ) {
    try {
      const input = JSON.parse(inputJson) as Record<string, unknown>;
      const onboarding = input.onboarding === true;
      if (onboarding) {
        const workspaceId =
          operation === 'create'
            ? input.workspaceId
            : new WorkspaceFileStore(this.ctx.storage.sql).find(
                String(input.id),
              )?.workspaceId;
        const allowed =
          identity &&
          typeof workspaceId === 'string' &&
          (await this.env.CORE_DB.prepare(
            'SELECT 1 FROM "workspace" AS "workspace" JOIN "userWorkspace" AS "member" ON "member"."workspaceId" = "workspace"."id" WHERE "workspace"."id" = ? AND "workspace"."creatorUserId" = ? AND "workspace"."activationStatus" = \'PENDING_CREATION\' AND "member"."id" = ? AND "member"."userId" = ?',
          )
            .bind(
              workspaceId,
              identity.userId,
              identity.userWorkspaceId,
              identity.userId,
            )
            .first());
        if (!allowed) throw apiError('Permission denied', 'FORBIDDEN');
      }
      const value =
        operation === 'picture'
          ? await this.withWorkspaceLock(() => {
              if (!identity) throw apiError('Permission denied', 'FORBIDDEN');
              return attachWorkspacePicture(
                this.ctx.storage,
                this.env,
                input.id === null ? null : String(input.id),
                String(input.purpose),
                String(input.origin),
                identity,
                onboarding,
                typeof input.workspaceId === 'string'
                  ? input.workspaceId
                  : undefined,
              );
            })
          : this.ctx.storage.transactionSync(() =>
              executeFileOperation(
                this.ctx.storage.sql,
                operation,
                input,
                identity,
                onboarding,
              ),
            );
      return JSON.stringify({ value });
    } catch (error) {
      if (error instanceof GraphQLError) return JSON.stringify({ error });
      throw error;
    } finally {
      this.ctx.waitUntil(this.deliverRealtimeEvents());
      this.ctx.waitUntil(
        scheduleWorkspaceAlarm(this.ctx.storage, [
          'file-cleanup',
          'member-cleanup',
          'workspace-settings',
          'record-event',
          'metadata-event',
          'webhook-dispatch',
        ]),
      );
    }
  }

  async deleteFiles(fileIds: string[]) {
    if (fileIds.length > 100) throw apiError('Invalid file cleanup batch');
    await this.withWorkspaceLock(() =>
      deleteWorkspaceFiles(this.ctx.storage, this.env, fileIds),
    );
  }

  getObjectRecordCounts(identity: RecordQueryIdentity) {
    const context = {
      sql: this.ctx.storage.sql,
      store: new MetadataStore(this.ctx.storage.sql),
    };
    const permissions = metadataWritePermissions(context, identity);
    if (!permissions.permissionFlags.includes('DATA_MODEL'))
      throw apiError('Permission denied', 'FORBIDDEN');
    return context.store
      .findMany('objectMetadata')
      .filter((object) => object.isActive)
      .map((object) => ({
        objectNamePlural: object.namePlural,
        totalCount: context.sql
          .exec<{
            count: number;
          }>(
            `SELECT COUNT(*) AS "count" FROM "rec_${object.nameSingular}" WHERE "deletedAt" IS NULL`,
          )
          .one().count,
      }));
  }

  getNavigationRecordIdentifiers(
    identity: RecordQueryIdentity,
    fileUrl?: { workspaceId: string; origin: string },
  ) {
    const context = {
      sql: this.ctx.storage.sql,
      store: new MetadataStore(this.ctx.storage.sql),
    };
    return navigationRecordIdentifiers(
      context,
      metadataWritePermissions(context, identity),
      fileUrl ? { ...fileUrl, secret: this.env.APP_SECRET } : undefined,
    );
  }

  updateObject(input: { id: string; update: UpdateObjectInput }) {
    return runMetadataOperation(this.ctx.storage, (context) =>
      updateObject(context, input),
    );
  }

  deleteObject(input: { id: string }) {
    return runMetadataOperation(this.ctx.storage, (context) =>
      deleteObject(context, input),
    );
  }

  createField(input: CreateFieldInput) {
    return runMetadataOperation(this.ctx.storage, (context) =>
      createField(context, input),
    );
  }

  updateField(input: { id: string; update: UpdateFieldInput }) {
    return runMetadataOperation(this.ctx.storage, (context) =>
      updateField(context, input),
    );
  }

  deleteField(input: { id: string }) {
    return runMetadataOperation(this.ctx.storage, (context) =>
      deleteField(context, input),
    );
  }

  createIndex(input: CreateIndexInput) {
    return runMetadataOperation(this.ctx.storage, (context) =>
      createIndex(context, input),
    );
  }

  deleteIndex(input: { id: string }) {
    return runMetadataOperation(this.ctx.storage, (context) =>
      deleteIndex(context, input),
    );
  }
}
