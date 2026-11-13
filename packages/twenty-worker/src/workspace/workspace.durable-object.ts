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
  private metadataSnapshot: MetadataSnapshot | undefined;
  private recordModel:
    | { catalog: RecordCatalog; schema: ReturnType<typeof buildRecordSchema> }
    | undefined;
  private metadataReadTables:
    | { version: string; tables: MetadataReadTables }
    | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    void ctx.blockConcurrencyWhile(async () => {
      await initializeRecordIndexTypes();
      runWorkspaceMigrations(ctx.storage, WORKSPACE_MIGRATIONS);
      await scheduleWorkspaceAlarm(ctx.storage, ['file-cleanup']);
    });
  }

  ping(): string {
    return 'pong';
  }

  private async withFileLock<TData>(operation: () => Promise<TData>) {
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
      expireFileUploads(this.ctx.storage);
      await processOutbox(this.ctx.storage, {
        'file-cleanup': (item) =>
          this.withFileLock(() =>
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
      await scheduleWorkspaceAlarm(this.ctx.storage, ['file-cleanup']);
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

  executeRecordQuery(input: RecordQueryInput, identity: RecordQueryIdentity) {
    try {
      return this.ctx.storage.transactionSync(() => {
        const member = getWorkspaceMember(this.ctx.storage.sql, identity);
        if (!member || member.userId !== identity.userId)
          throw apiError('Workspace access denied', 'FORBIDDEN');
        const permissions = buildPermissionContext(
          new MetadataStore(this.ctx.storage.sql),
          identity.userWorkspaceId,
        );
        if (!permissions.roleIds.length)
          throw apiError('Workspace access denied', 'FORBIDDEN');
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
            actor: {
              source: 'MANUAL',
              workspaceMemberId: identity.workspaceMemberId,
              name: `${member.name.firstName} ${member.name.lastName}`.trim(),
              context: {},
            },
            affectedRecords: 0,
            changed: false,
          },
        });
      });
    } catch (error) {
      if (error instanceof RecordMutationRollback) return error.response;
      if (error instanceof GraphQLError)
        return JSON.stringify({ errors: [error] });
      throw error;
    } finally {
      this.ctx.waitUntil(
        scheduleWorkspaceAlarm(this.ctx.storage, ['file-cleanup']),
      );
    }
  }

  updateWorkspaceMemberProfile(
    workspaceMemberId: string,
    update: Record<
      string,
      string | number | { firstName: string; lastName: string }
    >,
  ) {
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
          ? await this.withFileLock(() => {
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
      this.ctx.waitUntil(
        scheduleWorkspaceAlarm(this.ctx.storage, ['file-cleanup']),
      );
    }
  }

  async deleteFiles(fileIds: string[]) {
    if (fileIds.length > 100) throw apiError('Invalid file cleanup batch');
    await this.withFileLock(() =>
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
          .exec<{ count: number }>(
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
