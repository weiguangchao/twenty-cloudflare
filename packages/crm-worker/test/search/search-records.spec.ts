import { expect, it } from 'vitest';
import { FieldMetadataType } from 'crm-shared/types';

import {
  attachRecordResolvers,
  executeRecordQuery,
} from '@/workspace/record-api/execute-record-query.util';
import { createRecordCatalog } from '@/workspace/record-api/record-catalog.util';
import { buildRecordSchema } from '@/workspace/record-api/schema/build-record-schema.util';
import { buildPermissionContext } from '@/workspace/permissions/build-permission-context.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import {
  createRecordIdentity,
  insertRecord,
  queryRecords,
} from '../utils/record-query-test.util';
import {
  createProjectObject,
  expectSuccess,
} from '../utils/metadata-test.util';

const SEARCH_QUERY = `query Search($searchInput: String!, $limit: Int!, $after: String, $includedObjectNameSingulars: [String!], $excludedObjectNameSingulars: [String!], $filter: ObjectRecordFilterInput) {
  search(searchInput: $searchInput, limit: $limit, after: $after, includedObjectNameSingulars: $includedObjectNameSingulars, excludedObjectNameSingulars: $excludedObjectNameSingulars, filter: $filter) {
    edges {node {recordId objectNameSingular objectLabelSingular label imageUrl tsRank tsRankCD __typename} cursor __typename}
    pageInfo {hasNextPage endCursor __typename} __typename
  }
}`;
type SearchConnection = {
  edges: {
    node: {
      recordId: string;
      objectNameSingular: string;
      label: string;
      tsRank: number;
      tsRankCD: number;
    };
    cursor: string;
  }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

it('searches case-insensitive substrings, email fragments, Chinese, accents and literal FTS punctuation', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const id = insertRecord(sql, 'person', {
      name: { firstName: 'École', lastName: '王小明' },
      emails: {
        primaryEmail: 'brian@airbnb.example',
        additionalEmails: ['other@crm.example'],
      },
      jobTitle: 'Research "team" *(Alpha)',
    });
    for (const term of [
      'éCOL',
      'ecole',
      'brian',
      'airbnb',
      'other@crm',
      '王小明',
      '王小',
      '王',
      '"team"',
      '*(Alpha)',
      '"',
      '*',
      '(',
    ]) {
      const result = queryRecords<{ search: SearchConnection }>(
        instance,
        identity,
        SEARCH_QUERY,
        {
          searchInput: term,
          limit: 10,
          includedObjectNameSingulars: ['person'],
        },
      ).search;
      expect(
        result.edges.map((edge) => edge.node.recordId),
        term,
      ).toEqual([id]);
      expect(result.edges[0].node.label).toBe('École 王小明');
      expect(Number.isFinite(result.edges[0].node.tsRank)).toBe(true);
    }
    const list = queryRecords(
      instance,
      identity,
      'query {people(filter: {searchVector: {search: "王小 airbnb"}}) {totalCount edges {node {id}}}}',
    );
    expect(list).toMatchObject({
      people: { totalCount: 1, edges: [{ node: { id } }] },
    });
    expect(
      queryRecords(
        instance,
        identity,
        '{people(filter: {searchVector: {search: "firstName"}}) {totalCount}}',
      ),
    ).toEqual({ people: { totalCount: 0 } });
  }));

it('indexes phone variants, secondary links, addresses and rich text without JSON keys', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    insertRecord(sql, 'person', {
      name: { firstName: 'Phone' },
      phones: {
        primaryPhoneNumber: '2025550123',
        primaryPhoneCallingCode: '1',
        additionalPhones: [{ number: '7700900123', callingCode: '44' }],
      },
    });
    for (const term of ['12025550123', '02025550123', '447700900123'])
      expect(
        queryRecords<{ search: SearchConnection }>(
          instance,
          identity,
          SEARCH_QUERY,
          { searchInput: term, limit: 10 },
        ).search.edges,
      ).toHaveLength(1);
    const object = createProjectObject(instance);
    for (const [name, type] of [
      ['resourceLinks', FieldMetadataType.LINKS],
      ['officeAddress', FieldMetadataType.ADDRESS],
      ['descriptionBody', FieldMetadataType.RICH_TEXT],
    ] as const)
      expectSuccess(
        instance.createField({
          objectMetadataId: object.id,
          name,
          label: name,
          type,
          isSearchable: true,
        }),
      );
    const id = insertRecord(sql, 'project', {
      name: 'Project',
      resourceLinks: {
        secondaryLinks: [
          { url: 'https://secondary.example/path', label: 'Special partner' },
        ],
      },
      officeAddress: { addressCity: '上海市', addressStreet1: '银城路' },
      descriptionBody: {
        markdown: 'Kickoff discussion',
        tiptap: '{"type":"doc"}',
      },
    });
    for (const term of [
      'secondary.example',
      'Special partner',
      '上海',
      '银城路',
      'Kickoff',
    ])
      expect(
        queryRecords<{ search: SearchConnection }>(
          instance,
          identity,
          SEARCH_QUERY,
          { searchInput: term, limit: 10 },
        ).search.edges.map((edge) => edge.node.recordId),
      ).toEqual([id]);
    expect(
      queryRecords<{ search: SearchConnection }>(
        instance,
        identity,
        SEARCH_QUERY,
        { searchInput: 'tiptap', limit: 10 },
      ).search.edges,
    ).toEqual([]);
  }));

it('updates indexes immediately for writes, deletion, restoration, merge and transaction rollback', async () =>
  runInNewWorkspace((_, instance) => {
    const identity = createRecordIdentity(instance);
    const created = queryRecords<{ createPerson: { id: string } }>(
      instance,
      identity,
      'mutation {createPerson(data: {name: {firstName: "Original"}}) {id}}',
    ).createPerson;
    const search = (term: string) =>
      queryRecords<{ search: SearchConnection }>(
        instance,
        identity,
        SEARCH_QUERY,
        { searchInput: term, limit: 10 },
      ).search.edges.map((edge) => edge.node.recordId);
    expect(search('Original')).toEqual([created.id]);
    queryRecords(
      instance,
      identity,
      'mutation($id: UUID!) {updatePerson(id: $id, data: {name: {firstName: "Changed"}}) {id}}',
      { id: created.id },
    );
    expect(search('Original')).toEqual([]);
    expect(search('Changed')).toEqual([created.id]);
    const failed = JSON.parse(
      instance.executeRecordQuery(
        {
          query:
            'mutation($id: UUID!) {updatePerson(id: $id, data: {name: {firstName: "Rollback"}}) {id} createPerson(data: {emails: {primaryEmail: "bad"}}) {id}}',
          variables: { id: created.id },
        },
        identity,
      ),
    );
    expect(failed.errors).toHaveLength(1);
    expect(search('Rollback')).toEqual([]);
    expect(search('Changed')).toEqual([created.id]);
    for (const action of ['delete', 'restore', 'destroy']) {
      queryRecords(
        instance,
        identity,
        `mutation($id: UUID!) {${action}Person(id: $id) {id}}`,
        { id: created.id },
      );
      expect(search('Changed')).toEqual(
        action === 'restore' ? [created.id] : [],
      );
    }
    const people = queryRecords<{ createPeople: { id: string }[] }>(
      instance,
      identity,
      'mutation {createPeople(data: [{name: {firstName: "Winner"}}, {name: {firstName: "Loser"}, emails: {primaryEmail: "merged@example.com"}}]) {id}}',
    ).createPeople;
    queryRecords(
      instance,
      identity,
      'mutation($ids: [UUID!]!) {mergePeople(ids: $ids, conflictPriorityIndex: 0) {id}}',
      { ids: people.map((person) => person.id) },
    );
    expect(search('merged@example')).toEqual([people[0].id]);
    expect(search('Loser')).toEqual([]);
  }));

it('paginates across objects and rank ties without duplicates and honors filters and inclusion', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const expected = [
      ...Array.from({ length: 4 }, () =>
        insertRecord(sql, 'person', { name: { firstName: 'Equal' } }),
      ),
      ...Array.from({ length: 3 }, () =>
        insertRecord(sql, 'company', { name: 'Equal' }),
      ),
    ];
    for (const term of ['', 'Equal']) {
      const ids: string[] = [];
      let after: string | null = null;
      for (let page = 0; page < 5; page++) {
        const result: SearchConnection = queryRecords<{
          search: SearchConnection;
        }>(instance, identity, SEARCH_QUERY, {
          searchInput: term,
          limit: 2,
          after,
          includedObjectNameSingulars: ['person', 'company'],
        }).search;
        ids.push(...result.edges.map((edge) => edge.node.recordId));
        after = result.pageInfo.endCursor;
        if (!result.pageInfo.hasNextPage) break;
      }
      expect(ids).toHaveLength(7);
      expect(new Set(ids)).toEqual(new Set(expected));
    }
    const filtered = queryRecords<{ search: SearchConnection }>(
      instance,
      identity,
      SEARCH_QUERY,
      {
        searchInput: 'Equal',
        limit: 10,
        includedObjectNameSingulars: ['person', 'company'],
        excludedObjectNameSingulars: ['company'],
        filter: { not: { id: { in: [expected[0]] } } },
      },
    ).search;
    expect(filtered.edges).toHaveLength(3);
    expect(
      filtered.edges.every((edge) => edge.node.objectNameSingular === 'person'),
    ).toBe(true);
  }));

it('returns partial word matches while ranking matches of all terms first', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const both = insertRecord(sql, 'company', { name: 'Alpha Beta' });
    const one = insertRecord(sql, 'company', { name: 'Alpha only' });
    const result = queryRecords<{ search: SearchConnection }>(
      instance,
      identity,
      SEARCH_QUERY,
      { searchInput: 'Alpha Beta', limit: 10 },
    ).search;
    expect(result.edges.map((edge) => edge.node.recordId)).toEqual([both, one]);
    expect(result.edges[0].node.tsRankCD).toBeGreaterThan(0);
    expect(result.edges[1].node.tsRankCD).toBe(0);
    expect(
      queryRecords(
        instance,
        identity,
        '{companies(filter: {searchVector: {search: "Alpha Beta"}}) {totalCount}}',
      ),
    ).toEqual({ companies: { totalCount: 1 } });
  }));

it('excludes unreadable fields from matches and unreadable labels and objects from results', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    insertRecord(sql, 'person', {
      name: { firstName: 'Visible' },
      emails: { primaryEmail: 'secret@example.com' },
    });
    const catalog = createRecordCatalog(instance.getMetadataSnapshot());
    const schema = buildRecordSchema(catalog);
    attachRecordResolvers(schema);
    const permissions = buildPermissionContext(
      new MetadataStore(sql),
      identity.userWorkspaceId,
    );
    const object = catalog.objects.find(
      (object) => object.nameSingular === 'person',
    )!;
    const permission = permissions.objectRecordsPermissions.find(
      (permission) => permission.objectMetadataId === object.id,
    )!;
    permission.unreadableFields.push(object.fieldsByName.get('emails')!.id);
    const search = (term: string) =>
      JSON.parse(
        executeRecordQuery(
          { query: SEARCH_QUERY, variables: { searchInput: term, limit: 10 } },
          { sql, catalog, schema, permissions },
        ),
      ).data.search.edges;
    expect(search('secret')).toEqual([]);
    expect(search('Visible')).toHaveLength(1);
    expect(
      JSON.parse(
        executeRecordQuery(
          {
            query:
              '{people(filter: {searchVector: {search: "secret"}}) {totalCount}}',
          },
          { sql, catalog, schema, permissions },
        ),
      ).data.people.totalCount,
    ).toBe(0);
    permission.unreadableFields.push(object.fieldsByName.get('name')!.id);
    expect(search('Visible')).toEqual([]);
    permission.unreadableFields = [];
    permission.canReadAllRecords = false;
    expect(search('Visible')).toEqual([]);
  }));

it('rejects malformed cursors, excessive limits and invalid search input', async () =>
  runInNewWorkspace((_, instance) => {
    const identity = createRecordIdentity(instance);
    for (const variables of [
      { limit: 0 },
      { limit: 101 },
      { after: 'bad' },
      { after: Buffer.from('{}').toString('base64url') },
      { searchInput: '\0' },
      { searchInput: 'x'.repeat(2049) },
    ]) {
      const result = JSON.parse(
        instance.executeRecordQuery(
          {
            query: SEARCH_QUERY,
            variables: { searchInput: '', limit: 10, ...variables },
          },
          identity,
        ),
      );
      expect(result.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    }
  }));
