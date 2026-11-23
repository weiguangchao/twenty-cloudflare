import { capitalize } from 'crm-shared/utils';

import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type RecordObject } from '@/workspace/record-api/types/record-query.type';

export type RecordAggregation = {
  operation: string;
  type: string;
  field?: FieldMetadataRow;
  subField?: string;
};

export const recordAggregations = (object: RecordObject) => {
  const aggregations = new Map<string, RecordAggregation>([
    ['totalCount', { operation: 'totalCount', type: 'Int' }],
  ]);
  for (const field of object.fields) {
    if (field.type === 'RELATION' || field.type === 'MORPH_RELATION') continue;
    const suffix = capitalize(field.name);
    for (const operation of [
      'countUniqueValues',
      'countEmpty',
      'countNotEmpty',
      'percentageEmpty',
      'percentageNotEmpty',
    ])
      aggregations.set(`${operation}${suffix}`, {
        operation,
        type: operation.startsWith('percentage') ? 'Float' : 'Int',
        field,
      });
    const date = field.type === 'DATE' || field.type === 'DATE_TIME';
    const numeric = ['NUMBER', 'NUMERIC', 'RATING', 'CURRENCY'].includes(
      field.type,
    );
    const operations = date
      ? ['min', 'max']
      : numeric
        ? field.type === 'RATING'
          ? ['min', 'max', 'avg']
          : ['min', 'max', 'avg', 'sum']
        : field.type === 'BOOLEAN'
          ? ['countTrue', 'countFalse']
          : [];
    for (const operation of operations)
      aggregations.set(
        `${operation}${suffix}${field.type === 'CURRENCY' ? 'AmountMicros' : ''}`,
        {
          operation,
          type: date
            ? 'DateTime'
            : operation.startsWith('count')
              ? 'Int'
              : 'Float',
          field,
          ...(field.type === 'CURRENCY' ? { subField: 'amountMicros' } : {}),
        },
      );
  }
  return aggregations;
};
