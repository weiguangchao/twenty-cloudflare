import { isPlainObject } from 'crm-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { type RecordQueryEngine } from '@/workspace/record-api/record-query-engine';
import { setRecordFieldValue } from '@/workspace/record-api/record-field-values.util';
import { recordAggregations } from '@/workspace/record-api/schema/record-aggregations.util';
import { compileRecordFilter } from '@/workspace/record-api/sql/compile-record-filter.util';
import { compileRecordOrder } from '@/workspace/record-api/sql/compile-record-order.util';
import { groupByDimensions } from '@/workspace/record-api/sql/group-by-dimensions.util';
import { recordAggregateExpression } from '@/workspace/record-api/sql/record-aggregate-expression.util';
import { recordTable } from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordData,
  type RecordObject,
  type RecordSelection,
} from '@/workspace/record-api/types/record-query.type';

export const groupRecords = (
  engine: RecordQueryEngine,
  object: RecordObject,
  arguments_: Record<string, unknown>,
  selection: RecordSelection,
) => {
  const { dimensions, from } = groupByDimensions(
    engine.context,
    object,
    arguments_.groupBy,
  );
  const filter = compileRecordFilter(engine.context, object, arguments_.filter);
  const keyExpression = `json_array(${dimensions.map((dimension) => dimension.expression).join(', ')})`;
  const aggregates = recordAggregations(object);
  const order: string[] = [];
  const groupOrders: RecordData[] = [];
  const normalizeOrder = (input: RecordData): RecordData =>
    Object.fromEntries(
      Object.entries(input).map(([name, value]) => [
        name,
        isPlainObject(value)
          ? 'orderBy' in value
            ? value.orderBy
            : normalizeOrder(value)
          : value,
      ]),
    );
  for (const item of (arguments_.orderBy as RecordData[] | undefined) ?? []) {
    if (isPlainObject(item.aggregate)) {
      for (const [name, direction] of Object.entries(item.aggregate)) {
        const aggregation = aggregates.get(name);
        if (
          !aggregation ||
          typeof direction !== 'string' ||
          ![
            'AscNullsFirst',
            'AscNullsLast',
            'DescNullsFirst',
            'DescNullsLast',
          ].includes(direction)
        )
          throw apiError('Invalid group aggregate ordering');
        order.push(
          `${recordAggregateExpression(engine.context, object, aggregation)} ${direction.startsWith('Asc') ? 'ASC' : 'DESC'} NULLS ${direction.endsWith('First') ? 'FIRST' : 'LAST'}`,
        );
      }
    } else groupOrders.push(normalizeOrder(item));
  }
  for (const leaf of compileRecordOrder(engine.context, object, groupOrders)) {
    const dimension = dimensions.find(
      (item) => item.path.join('.') === leaf.path.join('.'),
    );
    if (dimension)
      order.push(
        `${dimension.orderExpression} ${leaf.direction} NULLS ${leaf.nulls}`,
      );
    else if (leaf.path[0] !== 'id')
      throw apiError('Order groups by a grouped field or an aggregate');
  }
  const rows = engine.execute(
    `SELECT ${keyExpression} AS "__key" FROM ${recordTable(object)} AS "record"${from} WHERE ${filter.expression} GROUP BY ${dimensions.map((dimension) => dimension.expression).join(', ')} ORDER BY ${order.concat(dimensions.map((dimension) => dimension.orderExpression)).join(', ')}`,
    filter.bindings,
  );
  const connections = engine.connections(
    object,
    {
      filter: arguments_.filter as RecordData | undefined,
      first: (arguments_.limit as number | undefined) ?? 60,
      offset: (arguments_.offsetForRecords as number | undefined) ?? 0,
      orderBy: arguments_.orderByForRecords as RecordData[] | undefined,
    },
    selection,
    {
      expression: keyExpression,
      values: rows.map((row) => String(row.__key)),
      from,
    },
  );
  return rows.map((row) => {
    const connection = connections.get(String(row.__key))!;
    connection.groupByDimensionValues = (
      JSON.parse(String(row.__key)) as unknown[]
    ).map((value, index) =>
      dimensions[index].isBoolean && value !== null ? Boolean(value) : value,
    );
    for (const [key, field] of selection)
      if (field.name === 'groupByDimensionValues')
        setRecordFieldValue(connection, key, connection.groupByDimensionValues);
    return connection;
  });
};
