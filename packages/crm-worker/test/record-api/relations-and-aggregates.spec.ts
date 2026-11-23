import { expect, it } from 'vitest';
import { FieldMetadataType } from 'crm-shared/types';

import { createRecordCatalog } from '@/workspace/record-api/record-catalog.util';
import {
  attachRecordResolvers,
  executeRecordQuery,
} from '@/workspace/record-api/execute-record-query.util';
import { buildRecordSchema } from '@/workspace/record-api/schema/build-record-schema.util';
import { buildPermissionContext } from '@/workspace/permissions/build-permission-context.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';

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

it('supports nullable pagination arguments and backward pages on nested connections', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const companyId = insertRecord(sql, 'company', { name: 'Company' });
    [1, 2, 3].forEach((position) =>
      insertRecord(sql, 'person', {
        companyId,
        position,
        jobTitle: `Title ${position}`,
      }),
    );
    expect(
      queryRecords(
        instance,
        identity,
        '{ companies(first: null, filter: null) {totalCount edges {node {people(last: 1, orderBy: [{position: AscNullsFirst}]) {totalCount edges {node {jobTitle}} pageInfo {hasPreviousPage}}}}}}',
      ),
    ).toMatchObject({
      companies: {
        totalCount: 1,
        edges: [
          {
            node: {
              people: {
                totalCount: 3,
                edges: [{ node: { jobTitle: 'Title 3' } }],
                pageInfo: { hasPreviousPage: true },
              },
            },
          },
        ],
      },
    });
  }));

it('keeps aliases distinct from physical columns and merges repeated fragment selections', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const companyId = insertRecord(sql, 'company', { name: 'Acme' });
    insertRecord(sql, 'person', {
      name: { firstName: 'Alice', lastName: 'Smith' },
      jobTitle: 'Engineer',
      companyId,
    });
    const query =
      '{people {edges: totalCount rows: edges {node {name: jobTitle label: name {firstName} companyId: company {name}}}} merged: people {...First ...Second}} fragment First on PersonConnection {edges {node {name {firstName}}}} fragment Second on PersonConnection {edges {node {name {lastName} jobTitle}}}';
    expect(queryRecords(instance, identity, query)).toEqual({
      people: {
        edges: 1,
        rows: [
          {
            node: {
              name: 'Engineer',
              label: { firstName: 'Alice' },
              companyId: { name: 'Acme' },
            },
          },
        ],
      },
      merged: {
        edges: [
          {
            node: {
              name: { firstName: 'Alice', lastName: 'Smith' },
              jobTitle: 'Engineer',
            },
          },
        ],
      },
    });
  }));

it('batches to-many and to-one relations with independent per-parent pages and counts', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const companyIds = Array.from({ length: 20 }, (_, index) =>
      insertRecord(sql, 'company', { name: `Company ${index}` }),
    );
    companyIds.forEach((companyId) =>
      [1, 2, 3].forEach((position) =>
        insertRecord(sql, 'person', {
          name: { firstName: `Person ${position}` },
          companyId,
          position,
        }),
      ),
    );
    const catalog = createRecordCatalog(instance.getMetadataSnapshot());
    const schema = buildRecordSchema(catalog);
    attachRecordResolvers(schema);
    const statements: string[] = [];
    const tracked = new Proxy(sql, {
      get(target, name) {
        return name === 'exec'
          ? (statement: string, ...bindings: SqlStorageValue[]) => {
              statements.push(statement);
              return target.exec(statement, ...bindings);
            }
          : Reflect.get(target, name);
      },
    });
    const result = JSON.parse(
      executeRecordQuery(
        {
          query:
            '{ companies { edges { node { name first: people(first: 1, orderBy: [{position: AscNullsFirst}]) { totalCount edges { node { name {firstName} company {name} } } pageInfo {hasNextPage} } } } } }',
        },
        {
          catalog,
          schema,
          sql: tracked,
          permissions: buildPermissionContext(
            new MetadataStore(sql),
            identity.userWorkspaceId,
          ),
        },
      ),
    );
    expect(result.errors).toBeUndefined();
    expect(result.data.companies.edges).toHaveLength(20);
    for (const { node } of result.data.companies.edges) {
      expect(node.first).toMatchObject({
        totalCount: 3,
        pageInfo: { hasNextPage: true },
      });
      expect(node.first.edges).toHaveLength(1);
      expect(node.first.edges[0].node).toMatchObject({
        name: { firstName: 'Person 1' },
        company: { name: node.name },
      });
    }
    expect(
      statements.some((statement) =>
        statement.includes('ROW_NUMBER() OVER (PARTITION BY'),
      ),
    ).toBe(true);
    expect(statements.length).toBe(5);
  }));

it('supports relation filters, relation sorting, aliases, fragments and directives', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const alpha = insertRecord(sql, 'company', { name: 'Alpha' });
    const beta = insertRecord(sql, 'company', { name: 'Beta' });
    insertRecord(sql, 'person', {
      companyId: beta,
      name: { firstName: 'Second' },
    });
    insertRecord(sql, 'person', {
      companyId: alpha,
      name: { firstName: 'First' },
    });
    const query = `query($include: Boolean!) { people(orderBy: [{company: {name: AscNullsFirst}}]) { edges { node { ...PersonFields company @include(if: $include) { name } } } } selected: people(filter: {company: {name: {eq: "Alpha"}}}) {totalCount} } fragment PersonFields on Person {name { firstName }}`;
    type Data = {
      people: {
        edges: {
          node: { name: { firstName: string }; company?: { name: string } };
        }[];
      };
      selected: { totalCount: number };
    };
    const result = queryRecords<Data>(instance, identity, query, {
      include: true,
    });
    expect(result.people.edges.map((edge) => edge.node.name.firstName)).toEqual(
      ['First', 'Second'],
    );
    expect(result.selected.totalCount).toBe(1);
    expect(
      queryRecords<Data>(instance, identity, query, { include: false }).people
        .edges[0].node.company,
    ).toBeUndefined();
  }));

it('reads morph targets and removes deleted related records from expansion', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const companyId = insertRecord(sql, 'company', { name: 'Target' });
    const noteId = insertRecord(sql, 'note', { title: 'Note' });
    insertRecord(sql, 'noteTarget', { noteId, targetCompanyId: companyId });
    const query =
      '{ companies { edges { node { noteTargets {totalCount edges {node {note {title} targetCompany {name}}}} } } } }';
    const result = queryRecords<{
      companies: { edges: { node: { noteTargets: { totalCount: number } } }[] };
    }>(instance, identity, query);
    expect(result.companies.edges[0].node.noteTargets.totalCount).toBe(1);
    sql.exec(
      'UPDATE "rec_note" SET "deletedAt" = ? WHERE "id" = ?',
      new Date().toISOString(),
      noteId,
    );
    const next = queryRecords<{
      companies: {
        edges: {
          node: { noteTargets: { edges: { node: { note: unknown } }[] } };
        }[];
      };
    }>(instance, identity, query);
    expect(
      next.companies.edges[0].node.noteTargets.edges[0].node.note,
    ).toBeNull();
  }));

it('computes connection aggregates over the full filtered set rather than the page', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const project = createProjectObject(instance);
    for (const field of [
      { name: 'score', label: 'Score', type: FieldMetadataType.NUMBER },
      { name: 'cost', label: 'Cost', type: FieldMetadataType.CURRENCY },
      { name: 'active', label: 'Active', type: FieldMetadataType.BOOLEAN },
      { name: 'priority', label: 'Priority', type: FieldMetadataType.RATING },
    ])
      expectSuccess(
        instance.createField({ objectMetadataId: project.id, ...field }),
      );
    insertRecord(sql, 'project', {
      name: 'Same',
      score: 10,
      cost: { amountMicros: 100, currencyCode: 'USD' },
      active: true,
      priority: 'RATING_1',
    });
    insertRecord(sql, 'project', {
      name: 'Same',
      score: 30,
      cost: { amountMicros: 300, currencyCode: 'USD' },
      active: false,
      priority: 'RATING_5',
    });
    insertRecord(sql, 'project', { name: '', score: null, active: null });
    const data = queryRecords<{ projects: Record<string, unknown> }>(
      instance,
      identity,
      '{ projects(first: 1) {totalCount countUniqueValuesName countEmptyName countNotEmptyName percentageEmptyName percentageNotEmptyName sumScore avgScore minScore maxScore sumCostAmountMicros avgPriority countTrueActive countFalseActive edges {node {id}}} }',
    ).projects;
    expect(data).toMatchObject({
      totalCount: 3,
      countUniqueValuesName: 1,
      countEmptyName: 1,
      countNotEmptyName: 2,
      sumScore: 40,
      avgScore: 20,
      minScore: 10,
      maxScore: 30,
      sumCostAmountMicros: 400,
      avgPriority: 3,
      countTrueActive: 1,
      countFalseActive: 1,
    });
    expect(data.percentageEmptyName).toBeCloseTo(1 / 3);
    expect(data.percentageNotEmptyName).toBeCloseTo(2 / 3);
    expect(
      queryRecords(
        instance,
        identity,
        '{ projects(filter: {name: {eq: "Missing"}}) {totalCount countEmptyName sumScore} }',
      ),
    ).toEqual({
      projects: { totalCount: 0, countEmptyName: null, sumScore: null },
    });
  }));

it('groups kanban records with aggregates, per-group limits, offsets and nested relations', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    for (const [stage, amounts] of [
      ['NEW', [10, 20, 30]],
      ['CUSTOMER', [40, 50]],
    ] as [string, number[]][])
      amounts.forEach((amount, position) =>
        insertRecord(sql, 'opportunity', {
          name: `${stage}${position}`,
          stage,
          position,
          amount: { amountMicros: amount, currencyCode: 'USD' },
        }),
      );
    const result = queryRecords<{
      opportunitiesGroupBy: {
        groupByDimensionValues: string[];
        totalCount: number;
        sumAmountAmountMicros: number;
        edges: { node: { name: string } }[];
        pageInfo: { hasNextPage: boolean };
      }[];
    }>(
      instance,
      identity,
      '{ opportunitiesGroupBy(groupBy: [{stage: true}], orderBy: [{aggregate: {sumAmountAmountMicros: DescNullsLast}}], orderByForRecords: [{position: AscNullsFirst}], limit: 1, offsetForRecords: 1) { groupByDimensionValues totalCount sumAmountAmountMicros edges {node {name}} pageInfo {hasNextPage} } }',
    );
    expect(result.opportunitiesGroupBy).toMatchObject([
      {
        groupByDimensionValues: ['CUSTOMER'],
        totalCount: 2,
        sumAmountAmountMicros: 90,
        edges: [{ node: { name: 'CUSTOMER1' } }],
        pageInfo: { hasNextPage: false },
      },
      {
        groupByDimensionValues: ['NEW'],
        totalCount: 3,
        sumAmountAmountMicros: 60,
        edges: [{ node: { name: 'NEW1' } }],
        pageInfo: { hasNextPage: true },
      },
    ]);
  }));

it('finds duplicates for existing ids and new inputs using metadata criteria', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const first = insertRecord(sql, 'company', { name: 'Duplicate' });
    const second = insertRecord(sql, 'company', { name: 'Duplicate' });
    const query =
      'query($ids: [UUID], $data: [CompanyCreateInput]) { companyDuplicates(ids: $ids, data: $data) {totalCount edges {node {id}}} }';
    expect(
      queryRecords(instance, identity, query, { ids: [first] }),
    ).toMatchObject({
      companyDuplicates: [{ totalCount: 1, edges: [{ node: { id: second } }] }],
    });
    expect(
      queryRecords(instance, identity, query, {
        data: [{ name: 'Duplicate' }, { name: 'ab' }, {}],
      }),
    ).toMatchObject({
      companyDuplicates: [
        { totalCount: 2 },
        { totalCount: 0 },
        { totalCount: 0 },
      ],
    });
  }));

it('enforces object and field read permissions on projection, filters, orders and aggregates', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    insertRecord(sql, 'company', { name: 'Private' });
    const catalog = createRecordCatalog(instance.getMetadataSnapshot());
    const schema = buildRecordSchema(catalog);
    attachRecordResolvers(schema);
    const permissions = buildPermissionContext(
      new MetadataStore(sql),
      identity.userWorkspaceId,
    );
    const company = catalog.objects.find(
      (object) => object.nameSingular === 'company',
    )!;
    const companyPermission = permissions.objectRecordsPermissions.find(
      (item) => item.objectMetadataId === company.id,
    )!;
    companyPermission.unreadableFields.push(
      company.fieldsByName.get('name')!.id,
    );
    for (const query of [
      '{companies {edges {node {name}}}}',
      '{companies(filter: {name: {eq: "Private"}}) {totalCount}}',
      '{companies(orderBy: [{name: AscNullsFirst}]) {totalCount}}',
      '{companies {countUniqueValuesName}}',
    ]) {
      const result = JSON.parse(
        executeRecordQuery({ query }, { catalog, schema, sql, permissions }),
      );
      expect(result.errors[0].extensions).toMatchObject({
        code: 'FORBIDDEN',
        subCode: 'PERMISSION_DENIED',
      });
    }
    companyPermission.canReadAllRecords = false;
    expect(
      JSON.parse(
        executeRecordQuery(
          { query: '{companies {totalCount}}' },
          { catalog, schema, sql, permissions },
        ),
      ).errors[0].extensions.code,
    ).toBe('FORBIDDEN');
  }));
