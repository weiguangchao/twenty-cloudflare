export const selectRows = (
  sql: SqlStorage,
  query: string,
  ...bindings: unknown[]
): Record<string, SqlStorageValue>[] => sql.exec(query, ...bindings).toArray();
