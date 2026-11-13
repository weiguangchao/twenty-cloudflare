import { RecordMutationEngine } from '@/workspace/record-api/mutations/record-mutation-engine';
import { recordTable } from '@/workspace/record-api/sql/record-sql.util';
import { type RecordQueryContext } from '@/workspace/record-api/types/record-query.type';

export const cleanupTrash = (context: RecordQueryContext, now = Date.now()) => {
  const task = context.sql
    .exec<{ nextRunAt: number; payload: string }>(
      'SELECT "nextRunAt", "payload" FROM "sys_scheduledTask" WHERE "name" = ?',
      'trash-cleanup',
    )
    .toArray()[0];
  if (!task || task.nextRunAt > now) return 0;
  const { trashRetentionDays } = JSON.parse(task.payload) as {
    trashRetentionDays: number;
  };
  const cutoff = new Date(now - trashRetentionDays * 86_400_000).toISOString();
  const engine = new RecordMutationEngine(context);
  let total = 0;
  let remaining = false;
  for (const object of context.catalog.objects.filter(
    (object) =>
      !['workspaceMember', 'timelineActivity'].includes(object.nameSingular),
  )) {
    const ids = engine.reader.execute(
      `SELECT "id" FROM ${recordTable(object)} WHERE "deletedAt" < ? ORDER BY "deletedAt" LIMIT ?`,
      [cutoff, 100 - total],
    );
    for (const row of ids) {
      engine.lifecycle(object, String(row.id), 'destroy');
      total++;
    }
    if (total === 100) {
      remaining = true;
      break;
    }
  }
  context.sql.exec(
    'UPDATE "sys_scheduledTask" SET "nextRunAt" = ?, "lastError" = NULL WHERE "name" = ?',
    now + (remaining ? 1000 : 86_400_000),
    'trash-cleanup',
  );
  return total;
};
