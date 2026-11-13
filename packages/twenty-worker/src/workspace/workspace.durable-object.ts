import { DurableObject } from 'cloudflare:workers';

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

// One instance per workspace, addressed with WORKSPACE.idFromName(workspaceId).
export class WorkspaceDurableObject extends DurableObject<Env> {
  private metadataSnapshot: MetadataSnapshot | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    void ctx.blockConcurrencyWhile(async () => {
      runWorkspaceMigrations(ctx.storage, WORKSPACE_MIGRATIONS);
    });
  }

  ping(): string {
    return 'pong';
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
