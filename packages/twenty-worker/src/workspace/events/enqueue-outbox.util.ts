export const enqueueOutbox = (
  sql: SqlStorage,
  kind: string,
  payload: unknown,
  id: string = crypto.randomUUID(),
) => {
  sql.exec(
    'INSERT INTO "sys_outbox" ("id", "kind", "payload", "availableAt") VALUES (?, ?, ?, ?) ON CONFLICT ("id") DO NOTHING',
    id,
    kind,
    JSON.stringify(payload),
    Date.now(),
  );
  return id;
};
