import { DurableObject } from 'cloudflare:workers';
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

// One instance per workspace, addressed with WORKSPACE.idFromName(workspaceId).
export class WorkspaceDurableObject extends DurableObject<Env> {
  private metadataSnapshot: MetadataSnapshot | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    void ctx.blockConcurrencyWhile(async () => {
      await initializeRecordIndexTypes();
      runWorkspaceMigrations(ctx.storage, WORKSPACE_MIGRATIONS);
    });
  }

  ping(): string {
    return 'pong';
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
  ) {
    const store = new MetadataStore(this.ctx.storage.sql);
    const roles = store
      .findMany('roleTarget', { userWorkspaceId: input.userWorkspaceId })
      .map((target) => store.findById('role', target.roleId));
    const member = getWorkspaceMember(this.ctx.storage.sql, input);

    return {
      member: member ? { ...member, roles } : null,
      roles,
      featureFlags: store.findMany('featureFlag'),
      defaultRole: store.findMany('role', {
        universalIdentifier: standardMetadata.defaultRoleUniversalIdentifier,
      })[0],
    };
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
