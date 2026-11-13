export type OutboxItem = {
  id: string;
  kind: string;
  payload: unknown;
  attempts: number;
};
export type OutboxHandlers = Record<
  string,
  (item: OutboxItem) => Promise<void>
>;

// Consumers use item.id as their idempotency key: a crash can precede the completion write.
export const processOutbox = async (
  storage: DurableObjectStorage,
  handlers: OutboxHandlers,
  now = Date.now(),
) => {
  if (!Object.keys(handlers).length) return;
  const due = storage.sql
    .exec<{ id: string }>(
      'SELECT "id" FROM "sys_outbox" WHERE "kind" IN (SELECT value FROM json_each(?)) AND (("status" = \'pending\' AND "availableAt" <= ?) OR ("status" = \'processing\' AND "leaseUntil" <= ?)) ORDER BY "availableAt", rowid LIMIT 20',
      JSON.stringify(Object.keys(handlers)),
      now,
      now,
    )
    .toArray();
  for (const { id } of due) {
    const claimed = storage.transactionSync(
      () =>
        storage.sql
          .exec<{
            id: string;
            kind: string;
            payload: string;
            attempts: number;
          }>(
            'UPDATE "sys_outbox" SET "status" = \'processing\', "leaseUntil" = ?, "attempts" = "attempts" + 1 WHERE "id" = ? AND (("status" = \'pending\' AND "availableAt" <= ?) OR ("status" = \'processing\' AND "leaseUntil" <= ?)) RETURNING "id", "kind", "payload", "attempts"',
            now + 300_000,
            id,
            now,
            now,
          )
          .toArray()[0],
    );
    if (!claimed) continue;
    try {
      await handlers[claimed.kind]({
        ...claimed,
        payload: JSON.parse(claimed.payload) as unknown,
      });
      storage.sql.exec(
        'UPDATE "sys_outbox" SET "status" = \'done\', "completedAt" = ?, "leaseUntil" = NULL, "lastError" = NULL WHERE "id" = ? AND "status" = \'processing\' AND "attempts" = ?',
        Date.now(),
        id,
        claimed.attempts,
      );
    } catch (error) {
      const delay = Math.min(
        3_600_000,
        1000 * 2 ** Math.min(claimed.attempts, 12),
      );
      storage.sql.exec(
        'UPDATE "sys_outbox" SET "status" = \'pending\', "availableAt" = ?, "leaseUntil" = NULL, "lastError" = ? WHERE "id" = ? AND "attempts" = ?',
        now + delay,
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Outbox delivery failed',
        id,
        claimed.attempts,
      );
    }
  }
};

export const scheduleWorkspaceAlarm = async (
  storage: DurableObjectStorage,
  supportedKinds: string[] = [],
) => {
  const task = storage.sql
    .exec<{ next: number | null }>(
      'SELECT MIN("nextRunAt") AS "next" FROM "sys_scheduledTask"',
    )
    .one().next;
  const job = supportedKinds.length
    ? storage.sql
        .exec<{ next: number | null }>(
          'SELECT MIN(CASE WHEN "status" = \'processing\' THEN "leaseUntil" ELSE "availableAt" END) AS "next" FROM "sys_outbox" WHERE "status" != \'done\' AND "kind" IN (SELECT value FROM json_each(?))',
          JSON.stringify(supportedKinds),
        )
        .one().next
    : null;
  const next = [task, job].filter((value): value is number => value !== null);
  if (next.length)
    await storage.setAlarm(Math.max(Date.now() + 1000, Math.min(...next)));
};
