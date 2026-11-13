import {
  QUERY_MAX_RECORDS,
  QUERY_MAX_RECORDS_FROM_RELATION,
} from 'twenty-shared/constants';
import { isPlainObject } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import {
  COMPOSITE_GRAPHQL_TYPES,
  recordField,
  relationTarget,
} from '@/workspace/record-api/record-catalog.util';
import { recordAggregations } from '@/workspace/record-api/schema/record-aggregations.util';
import { setRecordFieldValue } from '@/workspace/record-api/record-field-values.util';
import { mergeRecordSelections } from '@/workspace/record-api/parse-record-selection.util';
import { RECORD_COMPOSITE_NULL_EQUIVALENTS } from '@/workspace/record-api/record-null-equivalents.constant';
import { compileRecordFilter } from '@/workspace/record-api/sql/compile-record-filter.util';
import {
  compileRecordOrder,
  cursorCondition,
  encodeRecordCursor,
  orderSql,
} from '@/workspace/record-api/sql/compile-record-order.util';
import { recordAggregateExpression } from '@/workspace/record-api/sql/record-aggregate-expression.util';
import {
  assertReadable,
  executeRecordSql,
  quoteIdentifier,
  recordTable,
} from '@/workspace/record-api/sql/record-sql.util';
import {
  type OrderLeaf,
  type QueryArguments,
  type RecordData,
  type RecordObject,
  type RecordQueryContext,
  type RecordSelection,
} from '@/workspace/record-api/types/record-query.type';

export type ConnectionScope = {
  expression: string;
  values: string[];
  from?: string;
};

export class RecordQueryEngine {
  constructor(readonly context: RecordQueryContext) {}

  execute(statement: string, bindings: SqlStorageValue[] = []) {
    return executeRecordSql(this.context.sql, statement, bindings);
  }

  projection(
    object: RecordObject,
    selection: RecordSelection,
    order: OrderLeaf[] = [],
  ) {
    const columns = new Set(['id']);
    for (const { name } of selection.values()) {
      if (name === '__typename') continue;
      const field = recordField(object, name);
      assertReadable(this.context, object, field);
      const column = computeFieldColumn(field);
      if (column) columns.add(column.columnName);
    }
    return [...columns]
      .map((column) => `"record".${quoteIdentifier(column)}`)
      .concat(
        order.map(
          (leaf, index) => `${leaf.cursorExpression} AS "__cursor_${index}"`,
        ),
      )
      .join(', ');
  }

  hydrate(
    object: RecordObject,
    rows: RecordData[],
    selection: RecordSelection,
    depth = 0,
  ): RecordData[] {
    if (depth > 12) throw apiError('Relation selection is too deep');
    for (const row of rows) {
      for (const field of object.fields) {
        const value = row[field.name];
        if (
          typeof value === 'string' &&
          (COMPOSITE_GRAPHQL_TYPES[field.type] ||
            ['ARRAY', 'MULTI_SELECT', 'FILES', 'RAW_JSON'].includes(field.type))
        )
          row[field.name] = JSON.parse(value);
        const decoded = row[field.name];
        if (isPlainObject(decoded))
          for (const [name, defaultValue] of Object.entries(
            RECORD_COMPOSITE_NULL_EQUIVALENTS[field.type] ?? {},
          ))
            decoded[name] ??= defaultValue;
        if (value === null && field.type === 'TEXT') row[field.name] = '';
        if (value === null && ['ARRAY', 'MULTI_SELECT'].includes(field.type))
          row[field.name] = [];
        if (field.type === 'BOOLEAN' && value !== null && value !== undefined)
          row[field.name] = Boolean(value);
      }
    }
    for (const [
      key,
      { name, arguments: arguments_, selection: nested },
    ] of selection) {
      const field = recordField(object, name);
      assertReadable(this.context, object, field);
      if (!field.relationTargetObjectMetadataId) continue;
      const target = relationTarget(this.context.catalog, field);
      assertReadable(this.context, target);
      if (
        field.settings?.relationType === 'MANY_TO_ONE' &&
        name === field.name
      ) {
        const column = computeFieldColumn(field)!.columnName;
        const ids = [
          ...new Set(
            rows.flatMap((row) =>
              typeof row[column] === 'string' ? [row[column] as string] : [],
            ),
          ),
        ];
        const related = ids.length
          ? this.execute(
              `SELECT ${this.projection(target, nested)} FROM ${recordTable(target)} AS "record" WHERE "id" IN (SELECT value FROM json_each(?)) AND "deletedAt" IS NULL`,
              [JSON.stringify(ids)],
            )
          : [];
        const byId = new Map(
          this.hydrate(target, related, nested, depth + 1).map((row) => [
            row.id,
            row,
          ]),
        );
        rows.forEach((row) => {
          setRecordFieldValue(row, key, byId.get(row[column]) ?? null);
        });
      } else if (field.settings?.relationType === 'ONE_TO_MANY') {
        const reverse = this.context.catalog.fieldsById.get(
          field.relationTargetFieldMetadataId ?? '',
        );
        if (!reverse) throw apiError('Missing reverse relation');
        const column = computeFieldColumn(reverse)?.columnName;
        if (!column) throw apiError('Missing reverse join column');
        const connections = rows.length
          ? this.connections(
              target,
              arguments_.first == null && arguments_.last == null
                ? { ...arguments_, first: QUERY_MAX_RECORDS_FROM_RELATION }
                : arguments_,
              nested,
              {
                expression: `"record".${quoteIdentifier(column)}`,
                values: rows.map((row) => String(row.id)),
              },
              depth + 1,
            )
          : new Map();
        rows.forEach((row) => {
          setRecordFieldValue(row, key, connections.get(String(row.id)));
        });
      }
    }
    return rows;
  }

  connections(
    object: RecordObject,
    arguments_: QueryArguments,
    selection: RecordSelection,
    scope?: ConnectionScope,
    depth = 0,
  ): Map<string, RecordData> {
    assertReadable(this.context, object);
    const first = arguments_.first ?? undefined,
      last = arguments_.last ?? undefined;
    if (
      (first !== undefined && last !== undefined) ||
      (arguments_.before && arguments_.after)
    )
      throw apiError('Incompatible pagination arguments');
    const limit = first ?? last ?? QUERY_MAX_RECORDS;
    const offset = arguments_.offset ?? 0;
    if (
      !Number.isInteger(limit) ||
      limit < 0 ||
      limit > QUERY_MAX_RECORDS ||
      !Number.isInteger(offset) ||
      offset < 0
    )
      throw apiError('Invalid pagination size');
    const order = compileRecordOrder(this.context, object, arguments_.orderBy);
    const filter = compileRecordFilter(this.context, object, arguments_.filter);
    if (scope) {
      filter.expression += ` AND ${scope.expression} IN (SELECT value FROM json_each(?))`;
      filter.bindings.push(JSON.stringify(scope.values));
    }
    const from = `${recordTable(object)} AS "record"${scope?.from ?? ''}`;
    const aggregates = recordAggregations(object);
    const requestedAggregates = new Map(
      [...selection].filter(([, field]) => aggregates.has(field.name)),
    );
    const aggregateSelect = [...requestedAggregates].map(
      ([, field], index) =>
        `${recordAggregateExpression(this.context, object, aggregates.get(field.name)!)} AS "__aggregate_${index}"`,
    );
    if (!aggregateSelect.length)
      aggregateSelect.push('COUNT(*) AS "__totalCount"');
    const grouped = scope ? `, ${scope.expression} AS "__parent"` : '';
    const summary = this.execute(
      `SELECT ${aggregateSelect.join(', ')}${grouped} FROM ${from} WHERE ${filter.expression}${scope ? ` GROUP BY ${scope.expression}` : ''}`,
      filter.bindings,
    );
    const summaryById = new Map(
      summary.map((row) => [scope ? String(row.__parent) : '', row]),
    );
    const needsRecords = [...selection.values()].some(
      ({ name }) => name === 'edges' || name === 'pageInfo',
    );
    let rows: RecordData[] = [];
    let nodeSelection: RecordSelection = new Map();
    for (const field of selection.values())
      if (field.name === 'edges')
        for (const child of field.selection.values())
          if (child.name === 'node')
            nodeSelection = mergeRecordSelections(
              nodeSelection,
              child.selection,
            );
    if (needsRecords) {
      const bindings = [...filter.bindings];
      let where = filter.expression;
      const cursor = arguments_.after ?? arguments_.before;
      if (cursor)
        where += ` AND ${cursorCondition(order, cursor, Boolean(arguments_.before), bindings)}`;
      const projection = this.projection(object, nodeSelection, order);
      if (scope) {
        bindings.push(offset, offset + limit + 1);
        rows = this.execute(
          `WITH scanned AS (SELECT ${projection}${grouped}, ROW_NUMBER() OVER (PARTITION BY ${scope.expression} ORDER BY ${orderSql(order, last !== undefined)}) AS "__rank" FROM ${from} WHERE ${where}) SELECT * FROM scanned WHERE "__rank" > ? AND "__rank" <= ? ORDER BY "__parent", "__rank"`,
          bindings,
        );
      } else {
        bindings.push(limit + 1, offset);
        rows = this.execute(
          `SELECT ${projection} FROM ${from} WHERE ${where} ORDER BY ${orderSql(order, last !== undefined)} LIMIT ? OFFSET ?`,
          bindings,
        );
      }
    }
    const rowsById = new Map<string, RecordData[]>();
    for (const row of rows) {
      const id = scope ? String(row.__parent) : '';
      const group = rowsById.get(id) ?? [];
      group.push(row);
      rowsById.set(id, group);
    }
    const selected = new Map<string, { rows: RecordData[]; more: boolean }>();
    for (const id of scope?.values ?? ['']) {
      const fetched = rowsById.get(id) ?? [];
      const page = fetched.slice(0, limit);
      if (last !== undefined) page.reverse();
      selected.set(id, { rows: page, more: fetched.length > limit });
    }
    this.hydrate(
      object,
      [...selected.values()].flatMap((page) => page.rows),
      nodeSelection,
      depth,
    );
    return new Map(
      [...selected].map(([id, page]) => {
        const edges = page.rows.map((node) => ({
          node,
          cursor: encodeRecordCursor(node, order),
        }));
        const emptyAggregates = Object.fromEntries(
          [...requestedAggregates].map(([key, field]) => [
            key,
            field.name === 'totalCount' ? 0 : null,
          ]),
        );
        const result: RecordData = {
          ...emptyAggregates,
          edges,
          pageInfo: {
            hasNextPage:
              last !== undefined ? Boolean(arguments_.before) : page.more,
            hasPreviousPage:
              last !== undefined
                ? page.more
                : Boolean(arguments_.after) || offset > 0,
            startCursor: edges[0]?.cursor ?? null,
            endCursor: edges.at(-1)?.cursor ?? null,
          },
        };
        let aggregateIndex = 0;
        for (const [key, field] of requestedAggregates) {
          setRecordFieldValue(
            result,
            key,
            summaryById.get(id)?.[`__aggregate_${aggregateIndex++}`] ??
              (field.name === 'totalCount' ? 0 : null),
          );
        }
        return [id, result];
      }),
    );
  }

  findOne(
    object: RecordObject,
    arguments_: QueryArguments,
    selection: RecordSelection,
  ) {
    if (!arguments_.filter || !Object.keys(arguments_.filter).length)
      throw apiError('Missing filter argument');
    const filter = compileRecordFilter(this.context, object, arguments_.filter);
    const rows = this.execute(
      `SELECT ${this.projection(object, selection)} FROM ${recordTable(object)} AS "record" WHERE ${filter.expression} LIMIT 1`,
      filter.bindings,
    );
    if (!rows.length) throw apiError('Record not found', 'NOT_FOUND');
    return this.hydrate(object, rows, selection)[0];
  }
}
