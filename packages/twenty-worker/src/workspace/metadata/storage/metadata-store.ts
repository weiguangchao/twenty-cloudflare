import { METADATA_TABLE_DEFINITIONS } from '@/workspace/metadata/constants/metadata-table-definitions.constant';
import {
  type MetadataEntityName,
  type MetadataRow,
} from '@/workspace/metadata/types/metadata-row.type';
import { type MetadataColumnDefinition } from '@/workspace/metadata/types/metadata-table-definition.type';
import { computeMetadataTableName } from '@/workspace/metadata/utils/compute-metadata-table-name.util';

type StoredRow = Record<string, SqlStorageValue>;

const COLUMNS_BY_ENTITY_NAME = new Map<
  string,
  readonly MetadataColumnDefinition[]
>(
  METADATA_TABLE_DEFINITIONS.map((definition) => [
    definition.entityName,
    definition.columns,
  ]),
);

// Entities whose rows SQLite deletes or rewrites through ON DELETE when a row
// of the key entity is deleted, transitively.
const CASCADE_TARGETS_BY_ENTITY_NAME = (() => {
  const directDependents = new Map<string, Set<string>>();

  for (const definition of METADATA_TABLE_DEFINITIONS) {
    for (const column of definition.columns as readonly MetadataColumnDefinition[]) {
      if (column.references === undefined) continue;
      const dependents =
        directDependents.get(column.references.entityName) ?? new Set();

      dependents.add(definition.entityName);
      directDependents.set(column.references.entityName, dependents);
    }
  }

  const transitiveDependents = new Map<string, Set<string>>();

  for (const entityName of directDependents.keys()) {
    const reached = new Set<string>();
    const pending = [entityName];

    while (pending.length > 0) {
      const current = pending.pop() as string;

      for (const dependent of directDependents.get(current) ?? []) {
        if (!reached.has(dependent)) {
          reached.add(dependent);
          pending.push(dependent);
        }
      }
    }
    transitiveDependents.set(entityName, reached);
  }

  return transitiveDependents;
})();

const columnsOf = (entityName: MetadataEntityName) => {
  const columns = COLUMNS_BY_ENTITY_NAME.get(entityName);

  if (columns === undefined) {
    throw new Error(`Unknown metadata entity ${entityName}`);
  }

  return columns;
};

const serializeValue = (
  column: MetadataColumnDefinition,
  value: unknown,
): SqlStorageValue => {
  if (value === null || value === undefined) return null;

  switch (column.kind) {
    case 'boolean':
      return value ? 1 : 0;
    case 'json':
      return JSON.stringify(value);
    case 'integer':
    case 'real':
      return Number(value);
    case 'text':
      return String(value);
  }
};

const deserializeValue = (
  column: MetadataColumnDefinition,
  value: SqlStorageValue | undefined,
): unknown => {
  if (value === null || value === undefined) return null;

  switch (column.kind) {
    case 'boolean':
      return value === 1;
    case 'json':
      return JSON.parse(value as string);
    default:
      return value;
  }
};

// Reads and writes meta_ rows. Every write records the entities it touched,
// including ones changed by foreign key cascades, so collection hashes can
// be bumped once the surrounding operation commits.
export class MetadataStore {
  readonly touchedEntityNames = new Set<string>();

  constructor(private readonly sql: SqlStorage) {}

  insert<TEntityName extends MetadataEntityName>(
    entityName: TEntityName,
    row: MetadataRow<TEntityName>,
  ): void {
    const columns = columnsOf(entityName);
    const record = row as Record<string, unknown>;

    this.sql.exec(
      `INSERT INTO "${computeMetadataTableName(entityName)}" (${columns
        .map((column) => `"${column.name}"`)
        .join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      ...columns.map((column) => serializeValue(column, record[column.name])),
    );
    this.touchedEntityNames.add(entityName);
  }

  update<TEntityName extends MetadataEntityName>(
    entityName: TEntityName,
    id: string,
    patch: Partial<MetadataRow<TEntityName>>,
  ): void {
    const record = patch as Record<string, unknown>;
    const columns = columnsOf(entityName).filter(
      (column) => column.name !== 'id' && column.name in record,
    );

    if (columns.length === 0) return;

    this.sql.exec(
      `UPDATE "${computeMetadataTableName(entityName)}" SET ${columns
        .map((column) => `"${column.name}" = ?`)
        .join(', ')} WHERE "id" = ?`,
      ...columns.map((column) => serializeValue(column, record[column.name])),
      id,
    );
    this.touchedEntityNames.add(entityName);
  }

  delete(entityName: MetadataEntityName, ids: string[]): void {
    if (ids.length === 0) return;

    this.sql.exec(
      `DELETE FROM "${computeMetadataTableName(entityName)}" WHERE "id" IN (SELECT "value" FROM json_each(?))`,
      JSON.stringify(ids),
    );
    this.touchedEntityNames.add(entityName);
    for (const dependent of CASCADE_TARGETS_BY_ENTITY_NAME.get(entityName) ??
      []) {
      this.touchedEntityNames.add(dependent);
    }
  }

  findById<TEntityName extends MetadataEntityName>(
    entityName: TEntityName,
    id: string,
  ): MetadataRow<TEntityName> | undefined {
    return this.findMany(entityName, { id } as Partial<
      MetadataRow<TEntityName>
    >)[0];
  }

  findMany<TEntityName extends MetadataEntityName>(
    entityName: TEntityName,
    where: Partial<MetadataRow<TEntityName>> = {},
  ): MetadataRow<TEntityName>[] {
    const columns = columnsOf(entityName);
    const conditions = Object.entries(where as Record<string, unknown>).map(
      ([name, value]) => {
        const column = columns.find((candidate) => candidate.name === name);

        if (column === undefined) {
          throw new Error(`Unknown column ${entityName}.${name}`);
        }

        return { column, value };
      },
    );
    const whereClause =
      conditions.length === 0
        ? ''
        : ` WHERE ${conditions
            .map(({ column, value }) =>
              value === null
                ? `"${column.name}" IS NULL`
                : `"${column.name}" = ?`,
            )
            .join(' AND ')}`;
    const bindings = conditions
      .filter(({ value }) => value !== null)
      .map(({ column, value }) => serializeValue(column, value));

    return this.sql
      .exec<StoredRow>(
        `SELECT * FROM "${computeMetadataTableName(entityName)}"${whereClause}`,
        ...bindings,
      )
      .toArray()
      .map(
        (storedRow) =>
          Object.fromEntries(
            columns.map((column) => [
              column.name,
              deserializeValue(column, storedRow[column.name]),
            ]),
          ) as MetadataRow<TEntityName>,
      );
  }
}
