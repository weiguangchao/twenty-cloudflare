import { expect, it } from 'vitest';
import { FieldMetadataType } from 'twenty-shared/types';

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

const dateCases: [string, string][] = [
  ['DAY', '2025-05-14'],
  ['WEEK', '2025-05-12'],
  ['MONTH', '2025-05-01'],
  ['QUARTER', '2025-04-01'],
  ['YEAR', '2025-01-01'],
  ['DAY_OF_THE_WEEK', 'Wednesday'],
  ['MONTH_OF_THE_YEAR', 'May'],
  ['QUARTER_OF_THE_YEAR', 'Q2'],
  ['NONE', '2025-05-14T12:30:00.000Z'],
];
for (const [granularity, dimension] of dateCases)
  it(`groups dates by ${granularity}`, async () =>
    runInNewWorkspace(({ storage: { sql } }, instance) => {
      const identity = createRecordIdentity(instance);
      insertRecord(sql, 'company', {
        name: 'Grouped',
        createdAt: '2025-05-14T12:30:00.000Z',
      });
      const result = queryRecords<{
        companiesGroupBy: {
          groupByDimensionValues: unknown[];
          totalCount: number;
        }[];
      }>(
        instance,
        identity,
        'query($groupBy: [CompanyGroupByInput!]!) { companiesGroupBy(groupBy: $groupBy) {groupByDimensionValues totalCount} }',
        { groupBy: [{ createdAt: { granularity, timeZone: 'UTC' } }] },
      );
      expect(result.companiesGroupBy).toEqual([
        { groupByDimensionValues: [dimension], totalCount: 1 },
      ]);
    }));

it('uses record-date timezone offsets across summer, winter and DST transition boundaries', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    for (const createdAt of [
      '2025-01-15T07:30:00.000Z',
      '2025-07-15T07:30:00.000Z',
      '2025-03-09T09:30:00.000Z',
      '2025-03-09T10:30:00.000Z',
    ])
      insertRecord(sql, 'company', { name: createdAt, createdAt });
    const data = queryRecords<{
      companiesGroupBy: {
        groupByDimensionValues: string[];
        totalCount: number;
      }[];
    }>(
      instance,
      identity,
      '{companiesGroupBy(groupBy: [{createdAt: {granularity: DAY, timeZone: "America/Los_Angeles"}}]) {groupByDimensionValues totalCount}}',
    );
    expect(data.companiesGroupBy).toEqual([
      { groupByDimensionValues: ['2025-01-14'], totalCount: 1 },
      { groupByDimensionValues: ['2025-03-09'], totalCount: 2 },
      { groupByDimensionValues: ['2025-07-15'], totalCount: 1 },
    ]);
    expect(
      JSON.parse(
        instance.executeRecordQuery(
          {
            query:
              '{companiesGroupBy(groupBy: [{createdAt: {granularity: DAY, timeZone: "invalid-zone"}}]) {totalCount}}',
          },
          identity,
        ),
      ).errors[0].extensions.code,
    ).toBe('BAD_USER_INPUT');
  }));

it('groups array members, multiple dimensions and related fields', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const project = createProjectObject(instance);
    expectSuccess(
      instance.createField({
        objectMetadataId: project.id,
        name: 'tags',
        label: 'Tags',
        type: FieldMetadataType.ARRAY,
      }),
    );
    insertRecord(sql, 'project', { name: 'First', tags: ['a', 'b'] });
    insertRecord(sql, 'project', { name: 'Second', tags: ['b'] });
    insertRecord(sql, 'project', { name: 'Empty', tags: [] });
    expect(
      queryRecords(
        instance,
        identity,
        '{projectsGroupBy(groupBy: [{tags: true}]) {groupByDimensionValues totalCount}}',
      ),
    ).toEqual({
      projectsGroupBy: [
        { groupByDimensionValues: [null], totalCount: 1 },
        { groupByDimensionValues: ['a'], totalCount: 1 },
        { groupByDimensionValues: ['b'], totalCount: 2 },
      ],
    });
    const companyId = insertRecord(sql, 'company', { name: 'Company' });
    insertRecord(sql, 'person', {
      companyId,
      name: { firstName: 'Alice' },
      jobTitle: 'Engineer',
    });
    expect(
      queryRecords(
        instance,
        identity,
        '{peopleGroupBy(groupBy: [{company: {name: true}}, {jobTitle: true}]) {groupByDimensionValues totalCount}}',
      ),
    ).toEqual({
      peopleGroupBy: [
        { groupByDimensionValues: ['Company', 'Engineer'], totalCount: 1 },
      ],
    });
  }));

it('isolates workspace schemas, records and permission state', async () => {
  const source = await runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const id = insertRecord(sql, 'company', {
      name: 'Private to first workspace',
    });
    return { identity, id };
  });
  await runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    expect(
      queryRecords(instance, identity, '{companies {totalCount}}'),
    ).toEqual({ companies: { totalCount: 0 } });
    expect(
      JSON.parse(
        instance.executeRecordQuery(
          { query: '{companies {totalCount}}' },
          source.identity,
        ),
      ).errors[0].extensions.code,
    ).toBe('FORBIDDEN');
    expect(
      JSON.parse(
        instance.executeRecordQuery(
          {
            query: 'query($id: UUID!) {company(filter: {id: {eq: $id}}) {id}}',
            variables: { id: source.id },
          },
          identity,
        ),
      ).errors[0].extensions.code,
    ).toBe('NOT_FOUND');
    sql.exec(
      'DELETE FROM "meta_roleTarget" WHERE "userWorkspaceId" = ?',
      identity.userWorkspaceId,
    );
    expect(
      JSON.parse(
        instance.executeRecordQuery(
          { query: '{companies {totalCount}}' },
          identity,
        ),
      ).errors[0].extensions.code,
    ).toBe('FORBIDDEN');
  });
});
