export type WorkspaceMigration = {
  // Applied in array order; names must sort in the same order.
  name: string;
  up: (sql: SqlStorage) => void;
};
