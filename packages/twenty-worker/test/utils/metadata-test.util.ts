import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import {
  type MetadataOperationFailure,
  type MetadataOperationResult,
} from '@/workspace/metadata/types/metadata-operation-result.type';
import { type ObjectMetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';

import { selectRows } from './select-rows.util';

export const expectSuccess = <TValue>(
  result: MetadataOperationResult<TValue>,
): TValue => {
  if (result.status === 'fail') {
    throw new Error(
      `Expected success, got failure: ${JSON.stringify(result.failure)}`,
    );
  }

  return result.value;
};

export const expectFailure = <TValue>(
  result: MetadataOperationResult<TValue>,
): MetadataOperationFailure => {
  if (result.status === 'success') {
    throw new Error('Expected a validation failure, got success');
  }

  return result.failure;
};

export const failureCodes = (failure: MetadataOperationFailure) =>
  Object.values(failure.errors).flatMap((failures) =>
    (failures ?? []).flatMap((entry) =>
      entry.errors.map((error) => error.code),
    ),
  );

export const recordTableColumns = (
  sql: SqlStorage,
  objectNameSingular: string,
) =>
  Object.fromEntries(
    selectRows(
      sql,
      'SELECT "name", "type" FROM pragma_table_info(?)',
      `rec_${objectNameSingular}`,
    ).map((row) => [row.name, row.type]),
  );

export const recordTableForeignKeys = (
  sql: SqlStorage,
  objectNameSingular: string,
) =>
  Object.fromEntries(
    selectRows(
      sql,
      'SELECT "from", "table", "on_delete" FROM pragma_foreign_key_list(?)',
      `rec_${objectNameSingular}`,
    ).map((row) => [row.from, { table: row.table, onDelete: row.on_delete }]),
  );

export const tableExists = (sql: SqlStorage, tableName: string) =>
  selectRows(
    sql,
    `SELECT 1 FROM sqlite_master WHERE "type" = 'table' AND "name" = ?`,
    tableName,
  ).length === 1;

export const findObjectByName = (sql: SqlStorage, nameSingular: string) =>
  new MetadataStore(sql).findMany('objectMetadata', { nameSingular })[0] as
    | ObjectMetadataRow
    | undefined;

export const findFieldByName = (
  sql: SqlStorage,
  objectNameSingular: string,
  name: string,
) => {
  const object = findObjectByName(sql, objectNameSingular);

  return (
    object === undefined
      ? undefined
      : new MetadataStore(sql).findMany('fieldMetadata', {
          objectMetadataId: object.id,
          name,
        })[0]
  ) as FieldMetadataRow | undefined;
};

export const createProjectObject = (instance: WorkspaceDurableObject) =>
  expectSuccess(
    instance.createObject({
      nameSingular: 'project',
      namePlural: 'projects',
      labelSingular: 'Project',
      labelPlural: 'Projects',
      icon: 'IconListNumbers',
      isLabelSyncedWithName: true,
    }),
  );
