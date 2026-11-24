import { expect, it } from 'vitest';
import { FieldMetadataType } from 'crm-shared/types';

import {
  createSearchIndexes,
  suspendSearchIndexes,
} from '@/workspace/search/synchronize-search-indexes.util';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import {
  createRecordIdentity,
  insertRecord,
  queryRecords,
} from '../utils/record-query-test.util';
import {
  createProjectObject,
  expectFailure,
  expectSuccess,
  tableExists,
} from '../utils/metadata-test.util';

it('rebuilds existing rows after search field inclusion, rename, activation and removal', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const object = createProjectObject(instance);
    const [field] = expectSuccess(
      instance.createField({
        objectMetadataId: object.id,
        name: 'referenceCode',
        label: 'Reference code',
        type: FieldMetadataType.TEXT,
      }),
    );
    const id = insertRecord(sql, 'project', {
      name: 'Existing',
      referenceCode: 'Hiddenneedle',
    });
    const count = (term: string) =>
      queryRecords<{ projects: { totalCount: number } }>(
        instance,
        identity,
        'query($term: String!) {projects(filter: {searchVector: {search: $term}}) {totalCount}}',
        { term },
      ).projects.totalCount;
    expect(count('Hiddenneedle')).toBe(0);
    expectSuccess(
      instance.updateField({ id: field.id, update: { isSearchable: true } }),
    );
    expect(count('Hiddenneedle')).toBe(1);
    expectSuccess(
      instance.updateField({
        id: field.id,
        update: { name: 'renamedReference' },
      }),
    );
    expect(count('Hiddenneedle')).toBe(1);
    sql.exec(
      'UPDATE "rec_project" SET "renamedReference" = ? WHERE "id" = ?',
      'Newneedle',
      id,
    );
    expect(count('Hiddenneedle')).toBe(0);
    expect(count('Newneedle')).toBe(1);
    expectSuccess(
      instance.updateField({ id: field.id, update: { isActive: false } }),
    );
    expect(count('Newneedle')).toBe(0);
    expectSuccess(
      instance.updateField({ id: field.id, update: { isActive: true } }),
    );
    expect(count('Newneedle')).toBe(1);
    expectSuccess(
      instance.updateField({ id: field.id, update: { isSearchable: false } }),
    );
    expect(count('Newneedle')).toBe(0);
    expectSuccess(
      instance.updateField({ id: field.id, update: { isSearchable: true } }),
    );
    expectSuccess(instance.deleteField({ id: field.id }));
    expect(count('Newneedle')).toBe(0);
  }));

it('rebuilds object names, follows labels and visibility, and removes indexes on object deletion', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const object = createProjectObject(instance);
    const [field] = expectSuccess(
      instance.createField({
        objectMetadataId: object.id,
        name: 'displayTitle',
        label: 'Display title',
        type: FieldMetadataType.TEXT,
        isSearchable: true,
      }),
    );
    const id = insertRecord(sql, 'project', {
      name: 'Uniqueproject',
      displayTitle: 'Newlabel',
    });
    expectSuccess(
      instance.updateObject({
        id: object.id,
        update: { labelIdentifierFieldMetadataId: field.id },
      }),
    );
    const search = (included?: string[]) =>
      queryRecords<{
        search: {
          edges: {
            node: {
              recordId: string;
              label: string;
              objectNameSingular: string;
            };
          }[];
        };
      }>(
        instance,
        identity,
        'query($included: [String!]) {search(searchInput: "Uniqueproject", limit: 10, includedObjectNameSingulars: $included) {edges {node {recordId label objectNameSingular}}}}',
        { included },
      ).search.edges;
    expect(search()[0].node).toEqual({
      recordId: id,
      label: 'Newlabel',
      objectNameSingular: 'project',
    });
    expectSuccess(
      instance.updateObject({
        id: object.id,
        update: {
          nameSingular: 'initiative',
          namePlural: 'initiatives',
          labelSingular: 'Initiative',
          labelPlural: 'Initiatives',
        },
      }),
    );
    expect(tableExists(sql, 'fts_project')).toBe(false);
    expect(search()[0].node.objectNameSingular).toBe('initiative');
    expectSuccess(
      instance.updateObject({ id: object.id, update: { isSearchable: false } }),
    );
    expect(search()).toEqual([]);
    expect(search(['initiative'])).toHaveLength(1);
    expectSuccess(
      instance.updateObject({ id: object.id, update: { isActive: false } }),
    );
    expect(search(['initiative'])).toEqual([]);
    expectSuccess(
      instance.updateObject({ id: object.id, update: { isActive: true } }),
    );
    expect(search(['initiative'])).toHaveLength(1);
    expectSuccess(instance.deleteObject({ id: object.id }));
    expect(tableExists(sql, 'fts_initiative')).toBe(false);
    expect(
      sql
        .exec(
          'SELECT "name" FROM sqlite_master WHERE "type" = \'trigger\' AND "tbl_name" = ?',
          'rec_initiative',
        )
        .toArray(),
    ).toEqual([]);
  }));

it('restores index triggers when metadata validation or DDL fails', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const object = createProjectObject(instance);
    const [field] = expectSuccess(
      instance.createField({
        objectMetadataId: object.id,
        name: 'searchCode',
        label: 'Search code',
        type: FieldMetadataType.TEXT,
        isSearchable: true,
      }),
    );
    const id = insertRecord(sql, 'project', {
      name: 'First',
      searchCode: 'Duplicate',
    });
    insertRecord(sql, 'project', { name: 'Second', searchCode: 'Duplicate' });
    expectFailure(
      instance.updateField({ id: field.id, update: { name: 'id' } }),
    );
    expectFailure(
      instance.updateField({ id: field.id, update: { isUnique: true } }),
    );
    sql.exec(
      'UPDATE "rec_project" SET "searchCode" = ? WHERE "id" = ?',
      'Stillindexed',
      id,
    );
    expect(
      queryRecords(
        instance,
        identity,
        '{projects(filter: {searchVector: {search: "Stillindexed"}}) {totalCount}}',
      ),
    ).toEqual({ projects: { totalCount: 1 } });
  }));

it('backfills preexisting live records when installing the search migration', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    suspendSearchIndexes(sql);
    const id = insertRecord(sql, 'company', { name: 'Preexisting' });
    insertRecord(sql, 'company', {
      name: 'Preexisting trash',
      deletedAt: new Date().toISOString(),
    });
    sql.exec('DROP TABLE "sys_searchIndex"');
    createSearchIndexes(sql);
    expect(
      queryRecords(
        instance,
        identity,
        '{search(searchInput: "Preexisting", limit: 10) {edges {node {recordId}}}}',
      ),
    ).toEqual({ search: { edges: [{ node: { recordId: id } }] } });
  }));

it('keeps workspace member profile writes searchable and indexes separated between workspaces', async () => {
  const personId = crypto.randomUUID();
  for (const name of ['Firstworkspace', 'Secondworkspace'])
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const identity = createRecordIdentity(instance);
      insertRecord(sql, 'person', { id: personId, name: { firstName: name } });
      instance.updateWorkspaceMemberProfile(identity.workspaceMemberId, {
        name: { firstName: `${name}member`, lastName: '' },
      });
      expect(
        queryRecords<{ search: { edges: unknown[] } }>(
          instance,
          identity,
          '{search(searchInput: "Firstworkspace", limit: 10) {edges {node {recordId}}}}',
        ).search.edges,
      ).toHaveLength(name === 'Firstworkspace' ? 2 : 0);
    });
});
