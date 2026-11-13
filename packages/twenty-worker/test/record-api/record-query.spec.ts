import { describe, expect, it } from 'vitest';
import { FieldMetadataType } from 'twenty-shared/types';

import {
  createRecordIdentity,
  insertRecord,
  queryRecords,
} from '../utils/record-query-test.util';
import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import {
  createProjectObject,
  expectSuccess,
} from '../utils/metadata-test.util';

type Connection = {
  totalCount: number;
  edges: {
    cursor: string;
    node: { id: string; name: string; jobTitle?: string };
  }[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
};
const COMPANY_QUERY = `query($filter: CompanyFilterInput, $first: Int, $last: Int, $offset: Int, $after: String, $before: String, $orderBy: [CompanyOrderByInput]) { companies(filter: $filter, first: $first, last: $last, offset: $offset, after: $after, before: $before, orderBy: $orderBy) { totalCount edges { cursor node { id name } } pageInfo { hasNextPage hasPreviousPage startCursor endCursor } } }`;

describe('record filters', () => {
  it('preserves SQL wildcard escaping and literal startsWith/endsWith characters', async () =>
    runInNewWorkspace(({ storage: { sql } }, instance) => {
      const identity = createRecordIdentity(instance);
      insertRecord(sql, 'company', { name: 'a%b_c' });
      insertRecord(sql, 'company', { name: 'abbbc' });
      for (const filter of [
        { name: { like: 'a\\%b\\_c' } },
        { name: { startsWith: 'a%' } },
        { name: { endsWith: '_c' } },
      ])
        expect(
          queryRecords<{ companies: Connection }>(
            instance,
            identity,
            COMPANY_QUERY,
            { filter },
          ).companies.totalCount,
        ).toBe(1);
    }));
  const cases: {
    name: string;
    filter: Record<string, unknown>;
    names: string[];
  }[] = [
    { name: 'eq', filter: { name: { eq: 'Alpha' } }, names: ['Alpha'] },
    {
      name: 'search',
      filter: { searchVector: { search: 'ALPHA' } },
      names: ['Alpha'],
    },
    {
      name: 'neq',
      filter: { name: { neq: 'Alpha' } },
      names: ['Beta', 'gamma'],
    },
    { name: 'gt', filter: { position: { gt: 1 } }, names: ['gamma'] },
    { name: 'gte', filter: { position: { gte: 1 } }, names: ['Beta', 'gamma'] },
    { name: 'lt', filter: { position: { lt: 1 } }, names: ['Alpha'] },
    { name: 'lte', filter: { position: { lte: 1 } }, names: ['Alpha', 'Beta'] },
    {
      name: 'in',
      filter: { name: { in: ['Alpha', 'gamma'] } },
      names: ['Alpha', 'gamma'],
    },
    {
      name: 'startsWith',
      filter: { name: { startsWith: 'Al' } },
      names: ['Alpha'],
    },
    {
      name: 'endsWith',
      filter: { name: { endsWith: 'ma' } },
      names: ['gamma'],
    },
    {
      name: 'like',
      filter: { name: { like: '%a%' } },
      names: ['Alpha', 'Beta', 'gamma'],
    },
    { name: 'ilike', filter: { name: { ilike: '%ALPHA%' } }, names: ['Alpha'] },
    {
      name: 'wildcards',
      filter: { name: { like: 'A_p%a' } },
      names: ['Alpha'],
    },
    {
      name: 'null',
      filter: { address: { addressCity: { is: 'NULL' } } },
      names: ['Alpha', 'Beta', 'gamma'],
    },
    {
      name: 'not null',
      filter: { name: { is: 'NOT_NULL' } },
      names: ['Alpha', 'Beta', 'gamma'],
    },
    {
      name: 'and/or/not',
      filter: {
        and: [
          { or: [{ name: { eq: 'Alpha' } }, { name: { eq: 'Beta' } }] },
          { not: { position: { eq: 1 } } },
        ],
      },
      names: ['Alpha'],
    },
    {
      name: 'implicit AND',
      filter: { name: { ilike: '%a%' }, position: { gte: 1 } },
      names: ['Beta', 'gamma'],
    },
    { name: 'empty OR', filter: { or: [] }, names: [] },
    {
      name: 'column comparison',
      filter: { position: { lteField: 'position' } },
      names: ['Alpha', 'Beta', 'gamma'],
    },
  ];
  for (const item of cases)
    it(item.name, async () =>
      runInNewWorkspace(({ storage: { sql } }, instance) => {
        const identity = createRecordIdentity(instance);
        ['Alpha', 'Beta', 'gamma'].forEach((name, position) =>
          insertRecord(sql, 'company', { name, position }),
        );
        const data = queryRecords<{ companies: Connection }>(
          instance,
          identity,
          COMPANY_QUERY,
          { filter: item.filter, orderBy: [{ position: 'AscNullsFirst' }] },
        );
        expect(data.companies.edges.map((edge) => edge.node.name)).toEqual(
          item.names,
        );
        expect(data.companies.totalCount).toBe(item.names.length);
      }),
    );

  it('handles a 5000-id IN list and rejects unsupported regex and parameter overflow', async () =>
    runInNewWorkspace(({ storage: { sql } }, instance) => {
      const identity = createRecordIdentity(instance);
      const id = insertRecord(sql, 'company', { name: 'Found' });
      const ids = Array.from({ length: 5000 }, () => crypto.randomUUID());
      ids[2345] = id;
      expect(
        queryRecords<{ companies: Connection }>(
          instance,
          identity,
          COMPANY_QUERY,
          { filter: { id: { in: ids } } },
        ).companies.totalCount,
      ).toBe(1);
      for (const filter of [
        { name: { regex: '.*' } },
        { name: { iregex: '.*' } },
        { or: Array.from({ length: 101 }, () => ({ name: { eq: 'No' } })) },
      ]) {
        const result = JSON.parse(
          instance.executeRecordQuery(
            { query: COMPANY_QUERY, variables: { filter } },
            identity,
          ),
        );
        expect(result.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      }
    }));

  it('uses instr for patterns longer than SQLite LIKE permits and binds hostile input', async () =>
    runInNewWorkspace(({ storage: { sql } }, instance) => {
      const identity = createRecordIdentity(instance);
      const name = `prefix${'a'.repeat(80)}suffix`;
      insertRecord(sql, 'company', { name });
      for (const pattern of [
        `%${'a'.repeat(70)}%`,
        `pre%${'a'.repeat(70)}%fix`,
      ])
        expect(
          queryRecords<{ companies: Connection }>(
            instance,
            identity,
            COMPANY_QUERY,
            { filter: { name: { like: pattern } } },
          ).companies.totalCount,
        ).toBe(1);
      expect(
        queryRecords<{ companies: Connection }>(
          instance,
          identity,
          COMPANY_QUERY,
          { filter: { name: { eq: "' OR 1=1 --" } } },
        ).companies.totalCount,
      ).toBe(0);
    }));

  it('applies deletedAt through logical operators without widening from a relation', async () =>
    runInNewWorkspace(({ storage: { sql } }, instance) => {
      const identity = createRecordIdentity(instance);
      insertRecord(sql, 'company', { name: 'Live' });
      insertRecord(sql, 'company', {
        name: 'Deleted',
        deletedAt: new Date().toISOString(),
      });
      expect(
        queryRecords<{ companies: Connection }>(
          instance,
          identity,
          COMPANY_QUERY,
        ).companies.totalCount,
      ).toBe(1);
      expect(
        queryRecords<{ companies: Connection }>(
          instance,
          identity,
          COMPANY_QUERY,
          {
            filter: {
              or: [
                { deletedAt: { is: 'NULL' } },
                { deletedAt: { is: 'NOT_NULL' } },
              ],
            },
          },
        ).companies.totalCount,
      ).toBe(2);
      expect(
        queryRecords<{ companies: Connection }>(
          instance,
          identity,
          COMPANY_QUERY,
          { filter: { accountOwner: { deletedAt: { is: 'NOT_NULL' } } } },
        ).companies.totalCount,
      ).toBe(0);
    }));
});

describe('record pagination', () => {
  for (const direction of [
    'AscNullsFirst',
    'AscNullsLast',
    'DescNullsFirst',
    'DescNullsLast',
  ])
    it(`pages forward/backward through ties and nulls with ${direction}`, async () =>
      runInNewWorkspace(({ storage: { sql } }, instance) => {
        const identity = createRecordIdentity(instance);
        for (const name of [null, '', 'Same', 'Same', 'Zed', null])
          insertRecord(sql, 'company', { name });
        const orderBy = [{ name: direction }];
        const all = queryRecords<{ companies: Connection }>(
          instance,
          identity,
          COMPANY_QUERY,
          { orderBy },
        ).companies;
        const ids: string[] = [];
        let after: string | undefined;
        for (let index = 0; index < 3; index++) {
          const page = queryRecords<{ companies: Connection }>(
            instance,
            identity,
            COMPANY_QUERY,
            { first: 2, after, orderBy },
          ).companies;
          ids.push(...page.edges.map((edge) => edge.node.id));
          expect(page.totalCount).toBe(6);
          after = page.pageInfo.endCursor ?? undefined;
        }
        expect(ids).toEqual(all.edges.map((edge) => edge.node.id));
        const backwards: string[] = [];
        let before: string | undefined;
        for (let index = 0; index < 3; index++) {
          const page = queryRecords<{ companies: Connection }>(
            instance,
            identity,
            COMPANY_QUERY,
            { last: 2, before, orderBy },
          ).companies;
          backwards.unshift(...page.edges.map((edge) => edge.node.id));
          before = page.pageInfo.startCursor ?? undefined;
        }
        expect(backwards).toEqual(ids);
        const offset = queryRecords<{ companies: Connection }>(
          instance,
          identity,
          COMPANY_QUERY,
          { first: 2, offset: 2, orderBy },
        ).companies;
        expect(offset.edges.map((edge) => edge.node.id)).toEqual(
          ids.slice(2, 4),
        );
        expect(offset.pageInfo).toMatchObject({
          hasNextPage: true,
          hasPreviousPage: true,
        });
      }));

  it('returns a zero-sized page and rejects invalid cursor or pagination combinations', async () =>
    runInNewWorkspace(({ storage: { sql } }, instance) => {
      const identity = createRecordIdentity(instance);
      insertRecord(sql, 'company', { name: 'One' });
      expect(
        queryRecords<{ companies: Connection }>(
          instance,
          identity,
          COMPANY_QUERY,
          { first: 0 },
        ).companies,
      ).toMatchObject({ totalCount: 1, edges: [] });
      for (const variables of [
        { first: -1 },
        { first: 201 },
        { first: 1, last: 1 },
        { after: 'broken' },
        { offset: -1 },
      ])
        expect(
          JSON.parse(
            instance.executeRecordQuery(
              { query: COMPANY_QUERY, variables },
              identity,
            ),
          ).errors[0].extensions.code,
        ).toBe('BAD_USER_INPUT');
    }));
});

it('rebuilds the schema after custom fields, renames and removals', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const project = createProjectObject(instance);
    const [field] = expectSuccess(
      instance.createField({
        objectMetadataId: project.id,
        name: 'code',
        label: 'Code',
        type: FieldMetadataType.TEXT,
      }),
    );
    insertRecord(sql, 'project', { name: 'Project', code: 'CRM-5' });
    expect(
      queryRecords<{ projects: { edges: { node: { code: string } }[] } }>(
        instance,
        identity,
        '{ projects { edges { node { code } } } }',
      ).projects.edges[0].node.code,
    ).toBe('CRM-5');
    expectSuccess(
      instance.updateField({ id: field.id, update: { name: 'newCode' } }),
    );
    queryRecords(
      instance,
      identity,
      '{ projects { edges { node { newCode } } } }',
    );
    expect(
      JSON.parse(
        instance.executeRecordQuery(
          { query: '{ projects { edges { node { code } } } }' },
          identity,
        ),
      ).errors[0].extensions.code,
    ).toBe('BAD_USER_INPUT');
  }));
