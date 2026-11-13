import { expect, it } from 'vitest';
import { FieldMetadataType } from 'twenty-shared/types';

import { type JsonValue } from '@/workspace/metadata/types/json-value.type';
import { type CreateFieldInput } from '@/workspace/metadata/types/field-metadata-inputs.type';

import {
  createProjectObject,
  expectSuccess,
} from '../utils/metadata-test.util';
import {
  createRecordIdentity,
  insertRecord,
  queryRecords,
} from '../utils/record-query-test.util';
import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';

const options = [
  { label: 'First', value: 'Z_FIRST' },
  { label: 'Second', value: 'A_SECOND' },
];
const cases: {
  type: FieldMetadataType;
  values: JsonValue[];
  subField?: string;
  extra?: Partial<CreateFieldInput>;
}[] = [
  { type: FieldMetadataType.TEXT, values: ['a', 'z'] },
  {
    type: FieldMetadataType.UUID,
    values: [
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ],
  },
  { type: FieldMetadataType.NUMBER, values: [2, 10] },
  {
    type: FieldMetadataType.NUMBER,
    values: [2, 10],
    extra: { settings: { dataType: 'INT' } },
  },
  { type: FieldMetadataType.NUMERIC, values: [2.5, 10.5] },
  {
    type: FieldMetadataType.NUMBER,
    values: [2, 10_000_000_000],
    extra: { settings: { dataType: 'BIGINT' } },
  },
  { type: FieldMetadataType.BOOLEAN, values: [false, true] },
  { type: FieldMetadataType.DATE, values: ['2024-01-01', '2025-01-01'] },
  {
    type: FieldMetadataType.DATE_TIME,
    values: ['2024-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'],
  },
  {
    type: FieldMetadataType.SELECT,
    values: ['Z_FIRST', 'A_SECOND'],
    extra: { options },
  },
  {
    type: FieldMetadataType.MULTI_SELECT,
    values: [['Z_FIRST'], ['A_SECOND']],
    extra: { options },
  },
  { type: FieldMetadataType.RATING, values: ['RATING_1', 'RATING_5'] },
  { type: FieldMetadataType.ARRAY, values: [['a'], ['z']] },
  {
    type: FieldMetadataType.RAW_JSON,
    values: [{ value: 'a' }, { value: 'z' }],
  },
  {
    type: FieldMetadataType.FILES,
    values: [[{ label: 'a' }], [{ label: 'z' }]],
  },
  {
    type: FieldMetadataType.CURRENCY,
    subField: 'amountMicros',
    values: [
      { amountMicros: 2, currencyCode: 'USD' },
      { amountMicros: 10, currencyCode: 'USD' },
    ],
  },
  {
    type: FieldMetadataType.FULL_NAME,
    subField: 'firstName',
    values: [{ firstName: 'a' }, { firstName: 'z' }],
  },
  {
    type: FieldMetadataType.EMAILS,
    subField: 'primaryEmail',
    values: [
      { primaryEmail: 'a@example.com' },
      { primaryEmail: 'z@example.com' },
    ],
  },
  {
    type: FieldMetadataType.PHONES,
    subField: 'primaryPhoneNumber',
    values: [{ primaryPhoneNumber: '123' }, { primaryPhoneNumber: '456' }],
  },
  {
    type: FieldMetadataType.LINKS,
    subField: 'primaryLinkUrl',
    values: [{ primaryLinkUrl: 'a.test' }, { primaryLinkUrl: 'z.test' }],
  },
  {
    type: FieldMetadataType.ADDRESS,
    subField: 'addressCity',
    values: [{ addressCity: 'a' }, { addressCity: 'z' }],
  },
  {
    type: FieldMetadataType.RICH_TEXT,
    subField: 'markdown',
    values: [{ markdown: 'a' }, { markdown: 'z' }],
  },
  {
    type: FieldMetadataType.ACTOR,
    subField: 'name',
    values: [
      { name: 'a', source: 'MANUAL' },
      { name: 'z', source: 'MANUAL' },
    ],
  },
];

for (const item of cases)
  it(`orders ${item.type}${item.extra?.settings?.dataType ?? ''} with all four null directions and continues by cursor`, async () =>
    runInNewWorkspace(({ storage: { sql } }, instance) => {
      const identity = createRecordIdentity(instance);
      const project = createProjectObject(instance);
      expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          name: 'sample',
          label: 'Sample',
          type: item.type,
          ...item.extra,
        }),
      );
      insertRecord(sql, 'project', { name: 'low', sample: item.values[0] });
      insertRecord(sql, 'project', { name: 'high', sample: item.values[1] });
      insertRecord(sql, 'project', { name: 'missing', sample: null });
      const query = `query($orderBy: [ProjectOrderByInput], $after: String, $first: Int) { projects(orderBy: $orderBy, after: $after, first: $first) { edges { node { name } cursor } } }`;
      type Data = {
        projects: { edges: { node: { name: string }; cursor: string }[] };
      };
      for (const direction of [
        'AscNullsFirst',
        'AscNullsLast',
        'DescNullsFirst',
        'DescNullsLast',
      ]) {
        const orderBy = [
          {
            sample: item.subField ? { [item.subField]: direction } : direction,
          },
        ];
        const sorted = direction.startsWith('Asc')
          ? ['low', 'high']
          : ['high', 'low'];
        if (direction.endsWith('First')) sorted.unshift('missing');
        else sorted.push('missing');
        const result = queryRecords<Data>(instance, identity, query, {
          orderBy,
        });
        expect(result.projects.edges.map((edge) => edge.node.name)).toEqual(
          sorted,
        );
        const next = queryRecords<Data>(instance, identity, query, {
          orderBy,
          after: result.projects.edges[0].cursor,
          first: 2,
        });
        expect(next.projects.edges.map((edge) => edge.node.name)).toEqual(
          sorted.slice(1),
        );
      }
    }));

it('filters arrays, enum membership, null-equivalent values and composite children', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const project = createProjectObject(instance);
    for (const input of [
      {
        name: 'tags',
        label: 'Tags',
        type: FieldMetadataType.MULTI_SELECT,
        options,
      },
      { name: 'aliases', label: 'Aliases', type: FieldMetadataType.ARRAY },
      { name: 'cost', label: 'Cost', type: FieldMetadataType.CURRENCY },
    ])
      expectSuccess(
        instance.createField({ objectMetadataId: project.id, ...input }),
      );
    insertRecord(sql, 'project', {
      name: 'Match',
      tags: ['Z_FIRST'],
      aliases: ['Alpha', 'Beta'],
      cost: { amountMicros: 500, currencyCode: 'USD' },
    });
    insertRecord(sql, 'project', { name: '', tags: [], aliases: [] });
    insertRecord(sql, 'project', { name: null, tags: null, aliases: null });
    const query =
      'query($filter: ProjectFilterInput) { projects(filter: $filter) { totalCount } }';
    for (const [filter, totalCount] of [
      [{ tags: { containsAny: ['Z_FIRST'] } }, 1],
      [{ tags: { in: ['A_SECOND'] } }, 0],
      [{ tags: { isEmptyArray: true } }, 2],
      [{ tags: { isEmptyArray: false } }, 1],
      [{ aliases: { containsIlike: '%ALP%' } }, 1],
      [{ aliases: { is: 'NULL' } }, 2],
      [{ name: { eq: '' } }, 2],
      [{ name: { is: 'NULL' } }, 2],
      [{ cost: { amountMicros: { gte: 500 } } }, 1],
    ] as [Record<string, unknown>, number][])
      expect(
        queryRecords<{ projects: { totalCount: number } }>(
          instance,
          identity,
          query,
          { filter },
        ).projects.totalCount,
      ).toBe(totalCount);
  }));
