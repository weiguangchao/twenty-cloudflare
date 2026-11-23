export const initializeEventStreams = (sql: SqlStorage) => {
  sql.exec(
    'CREATE TABLE "sys_eventStream" ("id" TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL, "userWorkspaceId" TEXT NOT NULL)',
  );
  sql.exec(
    'CREATE TABLE "sys_eventStreamQuery" ("eventStreamId" TEXT NOT NULL REFERENCES "sys_eventStream"("id") ON DELETE CASCADE, "queryId" TEXT NOT NULL, "signature" TEXT NOT NULL, PRIMARY KEY ("eventStreamId", "queryId"))',
  );
};
