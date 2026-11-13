import { isPlainObject } from 'twenty-shared/utils';

import { WorkspaceFileStore } from '@/files/workspace-file-store';
import { type WorkspaceFile } from '@/files/types/workspace-file.type';
import { enqueueOutbox } from '@/workspace/events/enqueue-outbox.util';
import { type OutboxItem } from '@/workspace/events/process-outbox.util';

export const expireFileUploads = (
  storage: DurableObjectStorage,
  now = Date.now(),
) => {
  storage.transactionSync(() => {
    const task = storage.sql
      .exec<{ nextRunAt: number }>(
        'SELECT "nextRunAt" FROM "sys_scheduledTask" WHERE "name" = ?',
        'file-cleanup',
      )
      .one();
    if (task.nextRunAt > now) return;
    const rows = storage.sql
      .exec<{ id: string }>(
        'SELECT "id" FROM "meta_file" WHERE "expiresAt" <= ? AND ("leaseUntil" IS NULL OR "leaseUntil" <= ?) ORDER BY "expiresAt" LIMIT 100',
        now,
        now,
      )
      .toArray();
    if (rows.length) {
      storage.sql.exec(
        'UPDATE "meta_file" SET "status" = CASE WHEN "status" = \'UPLOADED\' THEN "status" ELSE \'DELETING\' END, "expiresAt" = ? WHERE "id" IN (SELECT value FROM json_each(?))',
        now + 86_400_000,
        JSON.stringify(rows.map((file) => file.id)),
      );
      enqueueOutbox(storage.sql, 'file-cleanup', {
        fileIds: rows.map((file) => file.id),
      });
    }
    storage.sql.exec(
      'UPDATE "sys_scheduledTask" SET "nextRunAt" = ?, "lastError" = NULL WHERE "name" = ?',
      now + (rows.length === 100 ? 1000 : 3_600_000),
      'file-cleanup',
    );
  });
};

export const deleteWorkspaceFiles = async (
  storage: DurableObjectStorage,
  env: Env,
  fileIds: string[],
) => {
  const store = new WorkspaceFileStore(storage.sql);
  const deletable: WorkspaceFile[] = [];
  for (const id of new Set(fileIds)) {
    const file = store.find(id);
    if (!file || store.isReferenced(file)) continue;
    if (file.folder === 'core-picture') {
      const logo = await env.CORE_DB.prepare(
        'SELECT "logo" FROM "workspace" WHERE "id" = ?',
      )
        .bind(file.workspaceId)
        .first<string>('logo');
      if (logo?.includes(`/file/core-picture/${id}`)) continue;
    }
    if (file.leaseUntil && file.leaseUntil > Date.now())
      throw new Error('File is being transferred');
    storage.sql.exec(
      'UPDATE "meta_file" SET "status" = \'DELETING\', "expiresAt" = ? WHERE "id" = ?',
      Date.now() + 3_600_000,
      id,
    );
    deletable.push(file);
  }
  if (!deletable.length) return;
  await env.FILES.delete(deletable.map((file) => file.storageKey));
  storage.sql.exec(
    'DELETE FROM "meta_file" WHERE "status" = \'DELETING\' AND "id" IN (SELECT value FROM json_each(?))',
    JSON.stringify(deletable.map((file) => file.id)),
  );
};

export const processFileCleanup = async (
  storage: DurableObjectStorage,
  env: Env,
  item: OutboxItem,
) => {
  if (
    !isPlainObject(item.payload) ||
    !Array.isArray(item.payload.fileIds) ||
    item.payload.fileIds.some((id) => typeof id !== 'string')
  )
    throw new Error('Invalid file cleanup job');
  const fileIds = item.payload.fileIds as string[];
  if (fileIds.length <= 20) return deleteWorkspaceFiles(storage, env, fileIds);
  const store = new WorkspaceFileStore(storage.sql);
  for (let offset = 0; offset < fileIds.length; offset += 100) {
    const ids = fileIds.slice(offset, offset + 100);
    const workspaceId = ids
      .map((id) => store.find(id)?.workspaceId)
      .find((id) => id !== undefined);
    if (workspaceId)
      await env.JOBS.send({ kind: 'file-delete', workspaceId, fileIds: ids });
  }
};
