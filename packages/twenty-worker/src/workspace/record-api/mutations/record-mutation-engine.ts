import { isPlainObject, isValidUuid } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import { recordChangeEffects } from '@/workspace/events/record-change-effects.util';
import { type RecordChangeAction } from '@/workspace/events/types/record-change-event.type';
import { normalizeRecordField } from '@/workspace/record-api/mutations/normalize-record-field.util';
import { recordDefaultValue } from '@/workspace/record-api/mutations/record-default-value.util';
import {
  MAX_RECORD_ROW_BYTES,
  MUTATION_MAXIMUM_AFFECTED_RECORDS,
} from '@/workspace/record-api/mutations/record-mutation.constants';
import { uniqueRecordKeys } from '@/workspace/record-api/mutations/record-unique-keys.util';
import { RecordQueryEngine } from '@/workspace/record-api/record-query-engine';
import {
  recordField,
  relationTarget,
} from '@/workspace/record-api/record-catalog.util';
import { compileRecordFilter } from '@/workspace/record-api/sql/compile-record-filter.util';
import {
  quoteIdentifier,
  recordTable,
} from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordData,
  type RecordObject,
  type RecordQueryContext,
  type RecordSelection,
} from '@/workspace/record-api/types/record-query.type';

const storedValue = (value: unknown): SqlStorageValue =>
  value === null || value === undefined
    ? null
    : typeof value === 'boolean'
      ? Number(value)
      : typeof value === 'object'
        ? JSON.stringify(value)
        : (value as SqlStorageValue);

export class RecordMutationEngine {
  readonly reader: RecordQueryEngine;
  constructor(readonly context: RecordQueryContext) {
    this.reader = new RecordQueryEngine(context);
  }

  permission(
    object: RecordObject,
    action: 'create' | 'update' | 'delete' | 'destroy',
    input?: RecordData,
  ) {
    const permission = this.context.permissions.objectRecordsPermissions.find(
      (item) => item.objectMetadataId === object.id,
    );
    const allowed =
      permission &&
      {
        create: permission.canCreateAllRecords,
        update: permission.canUpdateAllRecords,
        delete: permission.canSoftDeleteAllRecords,
        destroy: permission.canDestroyAllRecords,
      }[action];
    if (
      !this.context.mutation ||
      !allowed ||
      object.nameSingular === 'timelineActivity' ||
      object.nameSingular === 'workspaceMember'
    )
      throw apiError('Permission denied', 'FORBIDDEN', 'PERMISSION_DENIED');
    for (const name of Object.keys(input ?? {})) {
      const field = recordField(object, name);
      if (['createdBy', 'updatedBy'].includes(name)) continue;
      if (
        permission.uneditableFields.includes(field.id) &&
        !(
          action === 'create' && ['id', 'createdAt', 'updatedAt'].includes(name)
        )
      )
        throw apiError(
          'Field cannot be edited',
          'FORBIDDEN',
          'PERMISSION_DENIED',
        );
      if (action === 'update' && ['id', 'createdAt'].includes(name))
        throw apiError('System field cannot be edited', 'BAD_USER_INPUT');
    }
  }

  count(amount = 1) {
    this.context.mutation!.affectedRecords += amount;
    if (
      this.context.mutation!.affectedRecords > MUTATION_MAXIMUM_AFFECTED_RECORDS
    )
      throw apiError(
        `A mutation may affect at most ${MUTATION_MAXIMUM_AFFECTED_RECORDS} records`,
      );
  }

  fetch(object: RecordObject, id: string, includeDeleted = false): RecordData {
    const rows = this.reader.execute(
      `SELECT * FROM ${recordTable(object)} AS "record" WHERE "id" = ?${includeDeleted ? '' : ' AND "deletedAt" IS NULL'}`,
      [id],
    );
    if (!rows.length) throw apiError('Record not found', 'NOT_FOUND');
    return this.reader.hydrate(object, rows, new Map())[0];
  }

  project(
    object: RecordObject,
    rows: RecordData[],
    selection: RecordSelection,
  ) {
    return this.reader.hydrate(
      object,
      rows.map((row) => ({ ...row })),
      selection,
    );
  }

  prepare(
    object: RecordObject,
    input: unknown,
    before?: RecordData,
    depth = 0,
  ): RecordData {
    if (!isPlainObject(input) || depth > 8)
      throw apiError('Invalid record input');
    this.permission(object, before ? 'update' : 'create', input);
    const result: RecordData = before
      ? { ...before }
      : Object.fromEntries(
          object.fields.flatMap((field) => {
            const column = computeFieldColumn(field);
            return column
              ? [[column.columnName, recordDefaultValue(field.defaultValue)]]
              : [];
          }),
        );
    for (const [name, value] of Object.entries(input)) {
      if (['createdBy', 'updatedBy', 'searchVector'].includes(name)) continue;
      const field = recordField(object, name);
      const column = computeFieldColumn(field);
      if (!column) throw apiError('Cannot write a virtual field');
      if (column.references) {
        const target = relationTarget(this.context.catalog, field);
        let id: unknown = value;
        if (name === field.name) {
          if (!isPlainObject(value) || Object.keys(value).length !== 1)
            throw apiError('Specify exactly one relation operation');
          if ('disconnect' in value) {
            if (value.disconnect !== true)
              throw apiError('Invalid disconnect operation');
            id = null;
          } else if ('create' in value)
            id = this.createMany(target, [value.create], false, depth + 1)[0]
              .id;
          else if (
            isPlainObject(value.connect) &&
            isPlainObject(value.connect.where) &&
            Object.keys(value.connect.where).length
          ) {
            const where = value.connect.where;
            const filter = Object.fromEntries(
              Object.entries(where).map(([key, item]) => [
                key,
                isPlainObject(item)
                  ? Object.fromEntries(
                      Object.entries(item).map(([subField, nested]) => [
                        subField,
                        { eq: nested },
                      ]),
                    )
                  : { eq: item },
              ]),
            );
            const compiled = compileRecordFilter(this.context, target, filter);
            const matches = this.reader.execute(
              `SELECT "id" FROM ${recordTable(target)} AS "record" WHERE ${compiled.expression} LIMIT 2`,
              compiled.bindings,
            );
            if (matches.length !== 1)
              throw apiError(
                'Related record not found or not unique',
                'NOT_FOUND',
              );
            id = matches[0].id;
          } else throw apiError('Invalid relation operation');
          if (column.columnName in input)
            throw apiError('Conflicting relation inputs');
        }
        if (id !== null && (typeof id !== 'string' || !isValidUuid(id)))
          throw apiError('Invalid relation ID');
        if (typeof id === 'string') this.fetch(target, id);
        if (id === null && !field.isNullable)
          throw apiError('Relation is required');
        result[column.columnName] = id;
      } else
        result[column.columnName] = normalizeRecordField(
          this.context,
          field,
          value,
          before?.[name],
        );
    }
    const now = new Date().toISOString();
    if (!before) {
      result.id =
        typeof input.id === 'string'
          ? input.id.toLowerCase()
          : crypto.randomUUID();
      result.createdAt = input.createdAt ?? now;
      result.createdBy = this.context.mutation!.actor;
    }
    result.updatedAt = now;
    result.updatedBy = this.context.mutation!.actor;
    if (typeof result.id !== 'string' || !isValidUuid(result.id))
      throw apiError('Invalid record ID');
    for (const field of object.fields) {
      const column = computeFieldColumn(field);
      if (
        column &&
        !field.isNullable &&
        (result[column.columnName] === null ||
          result[column.columnName] === undefined)
      )
        throw apiError(`Field ${field.name} is required`);
    }
    for (const morphId of new Set(
      object.fields.flatMap((field) => (field.morphId ? [field.morphId] : [])),
    ))
      if (
        object.fields.filter(
          (field) =>
            field.morphId === morphId &&
            result[computeFieldColumn(field)?.columnName ?? ''] != null,
        ).length > 1
      )
        throw apiError('A morph relation may have only one target');
    if (
      new TextEncoder().encode(JSON.stringify(result)).length >
      MAX_RECORD_ROW_BYTES
    )
      throw apiError('Record is too large');
    return result;
  }

  positions(object: RecordObject, inputs: RecordData[]): RecordData[] {
    const bounds = this.reader.execute(
      `SELECT MIN("position") AS "minimum", MAX("position") AS "maximum" FROM ${recordTable(object)}`,
    )[0];
    const numeric = inputs.flatMap((input) =>
      typeof input.position === 'number' ? [input.position] : [],
    );
    let minimum = Math.min(Number(bounds.minimum ?? 1), ...numeric),
      maximum = Math.max(Number(bounds.maximum ?? 1), ...numeric);
    return inputs.map((input) => ({
      ...input,
      position:
        typeof input.position === 'number'
          ? input.position
          : input.position === 'last'
            ? ++maximum
            : --minimum,
    }));
  }

  createMany(
    object: RecordObject,
    inputs: unknown[],
    upsert = false,
    depth = 0,
  ): RecordData[] {
    this.permission(object, 'create');
    if (
      inputs.length > MUTATION_MAXIMUM_AFFECTED_RECORDS ||
      inputs.some((input) => !isPlainObject(input))
    )
      throw apiError('Invalid batch size or record');
    const positioned = this.positions(object, inputs as RecordData[]);
    if (upsert)
      return positioned.map((record, index) => {
        const ids = new Set<string>();
        if (typeof record.id === 'string')
          for (const match of this.reader.execute(
            `SELECT "id" FROM ${recordTable(object)} WHERE "id" = ?`,
            [record.id.toLowerCase()],
          ))
            ids.add(String(match.id));
        for (const [keyIndex, keys] of uniqueRecordKeys(object).entries()) {
          const index = object.indexes.filter((index) => index.isUnique)[
            keyIndex
          ];
          const expressions: string[] = [],
            bindings: SqlStorageValue[] = [];
          for (const key of keys) {
            const raw = record[key.column];
            if (raw === undefined) {
              expressions.length = 0;
              break;
            }
            const parent = key.field.relationTargetObjectMetadataId
              ? raw
              : normalizeRecordField(this.context, key.field, raw);
            const value =
              key.subField && isPlainObject(parent)
                ? parent[key.subField]
                : parent;
            if (value === null || value === undefined || value === '') {
              expressions.length = 0;
              break;
            }
            expressions.push(
              `${quoteIdentifier(key.column)}${key.subField ? ` ->> '$.${key.subField}'` : ''} = ?`,
            );
            bindings.push(storedValue(value));
          }
          if (expressions.length)
            for (const match of this.reader.execute(
              `SELECT "id" FROM ${recordTable(object)} WHERE ${index.indexWhereClause ? `(${index.indexWhereClause}) AND ` : ''}${expressions.join(' AND ')}`,
              bindings,
            ))
              ids.add(String(match.id));
        }
        if (ids.size > 1)
          throw apiError('Unique keys refer to different records', 'CONFLICT');
        if (ids.size === 1)
          return this.updateOne(
            object,
            [...ids][0],
            Object.fromEntries(
              Object.entries(inputs[index] as RecordData).filter(
                ([name]) =>
                  !['id', 'createdAt', 'createdBy', 'updatedAt'].includes(name),
              ),
            ),
            true,
          );
        const prepared = this.prepare(object, record, undefined, depth);
        this.insertRows(object, [prepared]);
        return prepared;
      });
    const prepared = positioned.map((input) =>
      this.prepare(object, input, undefined, depth),
    );
    this.insertRows(object, prepared);
    return prepared;
  }

  insertRows(object: RecordObject, records: RecordData[]) {
    if (!records.length) return;
    this.count(records.length);
    this.context.mutation!.changed = true;
    const columns = Object.keys(records[0]);
    const size = Math.floor(100 / columns.length);
    if (size < 1) throw apiError('Too many record columns');
    for (let offset = 0; offset < records.length; offset += size) {
      const batch = records.slice(offset, offset + size);
      this.reader.execute(
        `INSERT INTO ${recordTable(object)} (${columns.map(quoteIdentifier).join(', ')}) VALUES ${batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ')}`,
        batch.flatMap((record) =>
          columns.map((column) => storedValue(record[column])),
        ),
      );
    }
    for (const record of records)
      recordChangeEffects(this.context, object, 'created', undefined, record);
  }

  updateOne(
    object: RecordObject,
    id: string,
    input: unknown,
    includeDeleted = false,
  ): RecordData {
    const before = this.fetch(object, id, includeDeleted);
    const after = this.prepare(object, input, before);
    if (
      isPlainObject(input) &&
      'position' in input &&
      typeof after.position !== 'number'
    )
      after.position = this.positions(object, [input])[0].position;
    this.writeUpdate(object, before, after, 'updated');
    return after;
  }

  writeUpdate(
    object: RecordObject,
    before: RecordData,
    after: RecordData,
    action: RecordChangeAction,
  ) {
    this.count();
    this.context.mutation!.changed = true;
    const changes = Object.keys(after).filter(
      (name) =>
        name !== 'id' &&
        JSON.stringify(before[name]) !== JSON.stringify(after[name]),
    );
    if (changes.length)
      this.reader.execute(
        `UPDATE ${recordTable(object)} SET ${changes.map((name) => `${quoteIdentifier(name)} = ?`).join(', ')} WHERE "id" = ?`,
        [...changes.map((name) => storedValue(after[name])), String(before.id)],
      );
    recordChangeEffects(this.context, object, action, before, after);
  }

  matchingIds(object: RecordObject, filter: unknown, withDeleted = false) {
    if (!isPlainObject(filter)) throw apiError('A filter is required');
    const effective = withDeleted
      ? {
          and: [
            filter,
            {
              or: [
                { deletedAt: { is: 'NULL' } },
                { deletedAt: { is: 'NOT_NULL' } },
              ],
            },
          ],
        }
      : filter;
    const compiled = compileRecordFilter(this.context, object, effective);
    const rows = this.reader.execute(
      `SELECT "id" FROM ${recordTable(object)} AS "record" WHERE ${compiled.expression} LIMIT ?`,
      [...compiled.bindings, MUTATION_MAXIMUM_AFFECTED_RECORDS + 1],
    );
    if (rows.length > MUTATION_MAXIMUM_AFFECTED_RECORDS)
      throw apiError('Too many affected records');
    return rows.map((row) => String(row.id));
  }

  lifecycle(
    object: RecordObject,
    id: string,
    action: 'delete' | 'destroy' | 'restore',
  ): RecordData {
    this.permission(object, action === 'restore' ? 'update' : action);
    const before = this.fetch(object, id, action !== 'delete');
    if (action === 'destroy') {
      this.count();
      this.context.mutation!.changed = true;
      this.destroyRelated(object, before);
      this.reader.execute(`DELETE FROM ${recordTable(object)} WHERE "id" = ?`, [
        id,
      ]);
      recordChangeEffects(this.context, object, 'destroyed', before, undefined);
      return before;
    }
    const after = {
      ...before,
      deletedAt: action === 'delete' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
      updatedBy: this.context.mutation!.actor,
    };
    this.writeUpdate(
      object,
      before,
      after,
      action === 'delete' ? 'deleted' : 'restored',
    );
    return after;
  }

  destroyRelated(
    object: RecordObject,
    record: RecordData,
    visited = new Set<string>(),
  ) {
    const key = `${object.id}:${record.id}`;
    if (visited.has(key)) return;
    visited.add(key);
    for (const source of this.context.catalog.objects)
      for (const field of source.fields.filter(
        (field) =>
          field.relationTargetObjectMetadataId === object.id &&
          field.settings?.relationType === 'MANY_TO_ONE',
      )) {
        const column = computeFieldColumn(field)!.columnName;
        const rows = this.reader.hydrate(
          source,
          this.reader.execute(
            `SELECT * FROM ${recordTable(source)} WHERE ${quoteIdentifier(column)} = ?`,
            [String(record.id)],
          ),
          new Map(),
        );
        for (const row of rows) {
          if (field.settings?.onDelete === 'CASCADE') {
            this.destroyRelated(source, row, visited);
            recordChangeEffects(
              this.context,
              source,
              'destroyed',
              row,
              undefined,
            );
          } else if (
            field.settings?.onDelete === 'SET_NULL' ||
            !field.settings?.onDelete
          )
            recordChangeEffects(this.context, source, 'updated', row, {
              ...row,
              [column]: null,
            });
        }
      }
  }
}
