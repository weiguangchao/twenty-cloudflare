import { MUTATION_MAX_MERGE_RECORDS } from 'crm-shared/constants';
import { isPlainObject } from 'crm-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import { type RecordMutationEngine } from '@/workspace/record-api/mutations/record-mutation-engine';
import { uniqueRecordKeys } from '@/workspace/record-api/mutations/record-unique-keys.util';
import {
  quoteIdentifier,
  recordTable,
} from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordData,
  type RecordObject,
} from '@/workspace/record-api/types/record-query.type';

const hasMergeValue = (value: unknown): boolean =>
  value === null || value === undefined
    ? false
    : typeof value === 'string'
      ? value.trim().length > 0
      : Array.isArray(value)
        ? value.length > 0
        : isPlainObject(value)
          ? Object.values(value).some(hasMergeValue)
          : true;
const uniqueItems = (
  items: unknown[],
  key: (item: unknown) => unknown = JSON.stringify,
) => [...new Map(items.map((item) => [key(item), item])).values()];

const mergeValues = (type: string, values: unknown[]) => {
  if (['ARRAY', 'MULTI_SELECT'].includes(type))
    return uniqueItems(
      values.flatMap((value) => (Array.isArray(value) ? value : [])),
    );
  if (['EMAILS', 'LINKS', 'PHONES'].includes(type)) {
    const primaryKey =
      type === 'EMAILS'
        ? 'primaryEmail'
        : type === 'LINKS'
          ? 'primaryLinkUrl'
          : 'primaryPhoneNumber';
    const additionalKey =
      type === 'EMAILS'
        ? 'additionalEmails'
        : type === 'LINKS'
          ? 'secondaryLinks'
          : 'additionalPhones';
    const rows = values.filter(isPlainObject);
    const primary =
      rows.find((row) => hasMergeValue(row[primaryKey])) ?? rows[0];
    const items = rows
      .flatMap((row) => [
        hasMergeValue(row[primaryKey])
          ? type === 'EMAILS'
            ? row.primaryEmail
            : type === 'LINKS'
              ? { url: row.primaryLinkUrl, label: row.primaryLinkLabel }
              : {
                  number: row.primaryPhoneNumber,
                  countryCode: row.primaryPhoneCountryCode,
                  callingCode: row.primaryPhoneCallingCode,
                }
          : undefined,
        ...(Array.isArray(row[additionalKey]) ? row[additionalKey] : []),
      ])
      .filter((item) => item !== undefined);
    const itemKey = (item: unknown) =>
      isPlainObject(item) ? item[type === 'LINKS' ? 'url' : 'number'] : item;
    return {
      ...primary,
      [additionalKey]: uniqueItems(items, itemKey).filter(
        (item) => itemKey(item) !== primary?.[primaryKey],
      ),
    };
  }
  return values[0];
};

export const mergeRecords = (
  engine: RecordMutationEngine,
  object: RecordObject,
  arguments_: RecordData,
) => {
  const ids = arguments_.ids;
  const priority = arguments_.conflictPriorityIndex;
  if (
    !Array.isArray(ids) ||
    ids.length < 2 ||
    ids.length > MUTATION_MAX_MERGE_RECORDS ||
    new Set(ids).size !== ids.length ||
    !Number.isInteger(priority) ||
    Number(priority) < 0 ||
    Number(priority) >= ids.length ||
    object.isSystem
  )
    throw apiError('Invalid merge input');
  engine.permission(object, 'update');
  engine.permission(object, 'delete');
  const rows = ids.map((id) => engine.fetch(object, String(id)));
  const winner = rows[Number(priority)];
  const ordered = [winner, ...rows.filter((row) => row.id !== winner.id)];
  const input: RecordData = {};
  for (const field of object.fields) {
    if (field.isSystem || field.type === 'TS_VECTOR') continue;
    const column = computeFieldColumn(field);
    if (!column) continue;
    const permission = engine.context.permissions.objectRecordsPermissions.find(
      (item) => item.objectMetadataId === object.id,
    )!;
    if (
      permission.unreadableFields.includes(field.id) ||
      permission.uneditableFields.includes(field.id)
    )
      throw apiError('Cannot merge restricted fields', 'FORBIDDEN');
    const values = ordered
      .map((row) => row[column.columnName])
      .filter(hasMergeValue);
    if (values.length)
      input[column.columnName] = mergeValues(field.type, values);
  }
  if (arguments_.dryRun === true) return { ...winner, ...input };
  const losers = rows.filter((row) => row.id !== winner.id);
  engine.context.mutation!.changed = true;
  for (const source of engine.context.catalog.objects)
    for (const field of source.fields.filter(
      (field) =>
        field.relationTargetObjectMetadataId === object.id &&
        field.settings?.relationType === 'MANY_TO_ONE',
    )) {
      const column = computeFieldColumn(field)!.columnName;
      const related = engine.reader.execute(
        `SELECT "id" FROM ${recordTable(source)} WHERE ${quoteIdentifier(column)} IN (SELECT value FROM json_each(?))`,
        [JSON.stringify(losers.map((row) => row.id))],
      );
      for (const row of related) {
        if (source.nameSingular === 'timelineActivity')
          engine.reader.execute(
            `UPDATE ${recordTable(source)} SET ${quoteIdentifier(column)} = ? WHERE "id" = ?`,
            [String(winner.id), String(row.id)],
          );
        else {
          try {
            engine.updateOne(source, String(row.id), { [column]: winner.id });
          } catch (error) {
            if (
              ['noteTarget', 'taskTarget'].includes(source.nameSingular) &&
              error instanceof Error &&
              /UNIQUE constraint/i.test(error.message)
            )
              engine.lifecycle(source, String(row.id), 'delete');
            else throw error;
          }
        }
      }
    }
  for (const loser of losers) {
    const uniqueIndexes = object.indexes.filter((index) => index.isUnique);
    for (const key of uniqueRecordKeys(object).flatMap((keys, index) =>
      uniqueIndexes[index].indexWhereClause === null ? keys : [],
    )) {
      const value = (record: RecordData) => {
        const parent = record[key.column];
        return key.subField && isPlainObject(parent)
          ? parent[key.subField]
          : parent;
      };
      if (
        key.column !== 'id' &&
        hasMergeValue(value(input)) &&
        value(input) !== value(winner) &&
        value(input) === value(loser)
      )
        engine.reader.execute(
          `UPDATE ${recordTable(object)} SET ${quoteIdentifier(key.column)} = NULL WHERE "id" = ?`,
          [String(loser.id)],
        );
    }
    engine.lifecycle(object, String(loser.id), 'delete');
  }
  return engine.updateOne(object, String(winner.id), input);
};
