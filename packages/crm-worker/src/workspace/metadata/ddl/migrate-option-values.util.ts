import { FieldMetadataType } from 'crm-shared/types';

import { type FieldMetadataOption } from '@/workspace/metadata/types/field-metadata-row.type';
import { computeRecordTableName } from '@/workspace/metadata/utils/compute-record-table-name.util';

export type OptionValueChanges = {
  renamedValues: Map<string, string>;
  removedValues: string[];
};

// Options are matched by id: same id with a new value is a rename, a missing
// id is a removal.
export const computeOptionValueChanges = (
  previousOptions: FieldMetadataOption[],
  nextOptions: FieldMetadataOption[],
): OptionValueChanges => {
  const nextOptionById = new Map(
    nextOptions.map((option) => [option.id, option]),
  );
  const nextValues = new Set(nextOptions.map((option) => option.value));
  const renamedValues = new Map<string, string>();
  const removedValues: string[] = [];

  for (const previousOption of previousOptions) {
    const nextOption = nextOptionById.get(previousOption.id);

    if (nextOption === undefined) {
      if (!nextValues.has(previousOption.value)) {
        removedValues.push(previousOption.value);
      }
    } else if (nextOption.value !== previousOption.value) {
      renamedValues.set(previousOption.value, nextOption.value);
    }
  }

  return { renamedValues, removedValues };
};

const replaceInSelect = (
  sql: SqlStorage,
  table: string,
  column: string,
  from: string,
  to: string | null,
) => {
  sql.exec(
    `UPDATE "${table}" SET "${column}" = ? WHERE "${column}" = ?`,
    to,
    from,
  );
};

const replaceInMultiSelect = (
  sql: SqlStorage,
  table: string,
  column: string,
  from: string,
  to: string | null,
) => {
  const nextArray =
    to === null
      ? `(SELECT json_group_array("value") FROM json_each("${table}"."${column}") WHERE "value" <> ?)`
      : `(SELECT json_group_array(CASE WHEN "value" = ? THEN ? ELSE "value" END) FROM json_each("${table}"."${column}"))`;

  sql.exec(
    `UPDATE "${table}" SET "${column}" = ${nextArray} WHERE EXISTS (SELECT 1 FROM json_each("${table}"."${column}") WHERE "value" = ?)`,
    ...(to === null ? [from] : [from, to]),
    from,
  );
};

export const migrateOptionValues = (
  sql: SqlStorage,
  {
    objectNameSingular,
    columnName,
    fieldType,
    changes,
  }: {
    objectNameSingular: string;
    columnName: string;
    fieldType: FieldMetadataType;
    changes: OptionValueChanges;
  },
) => {
  const table = computeRecordTableName(objectNameSingular);
  const replace =
    fieldType === FieldMetadataType.MULTI_SELECT
      ? replaceInMultiSelect
      : replaceInSelect;

  for (const removedValue of changes.removedValues) {
    replace(sql, table, columnName, removedValue, null);
  }

  // Two passes so swapped values do not overwrite each other.
  const temporaryValues = new Map<string, string>();

  for (const previousValue of changes.renamedValues.keys()) {
    const temporaryValue = `__renaming_${crypto.randomUUID()}`;

    temporaryValues.set(previousValue, temporaryValue);
    replace(sql, table, columnName, previousValue, temporaryValue);
  }
  for (const [previousValue, nextValue] of changes.renamedValues) {
    replace(
      sql,
      table,
      columnName,
      temporaryValues.get(previousValue) as string,
      nextValue,
    );
  }
};
