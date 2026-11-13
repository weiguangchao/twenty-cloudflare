import { expect, it } from 'vitest';
import { FieldMetadataType } from 'twenty-shared/types';

import { RecordMutationRollback } from '@/workspace/record-api/mutations/record-mutation-rollback.exception';
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
  queryRecords,
} from '../utils/record-query-test.util';
import {
  createProjectObject,
  expectSuccess,
} from '../utils/metadata-test.util';

it(
  'imports 1000 people in client-sized batches without exceeding SQLite bind limits',
  async () =>
    runInNewWorkspace(({ storage: { sql } }, instance) => {
      const identity = createRecordIdentity(instance);
      const query =
        'mutation($data: [PersonCreateInput!]!) {createPeople(data: $data) {id}}';
      for (let offset = 0; offset < 1000; offset += 200) {
        const data = Array.from({ length: 200 }, (_, index) => ({
          name: { firstName: `CSV ${offset + index}` },
          emails: { primaryEmail: `import-${offset + index}@example.com` },
        }));
        expect(
          queryRecords<{ createPeople: unknown[] }>(instance, identity, query, {
            data,
          }).createPeople,
        ).toHaveLength(200);
      }
      expect(queryRecords(instance, identity, '{people {totalCount}}')).toEqual(
        { people: { totalCount: 1000 } },
      );
      const denied = JSON.parse(
        instance.executeRecordQuery(
          {
            query:
              'mutation {updatePeople(filter: {}, data: {jobTitle: "Too many"}) {id}}',
          },
          identity,
        ),
      );
      expect(denied.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      expect(
        sql
          .exec(
            'SELECT "id" FROM "rec_person" WHERE "jobTitle" = ?',
            'Too many',
          )
          .toArray(),
      ).toHaveLength(0);
    }),
  20_000,
);

it('checks field permissions before a write and rolls back failed return projections', async () =>
  runInNewWorkspace(({ storage }, instance) => {
    const identity = createRecordIdentity(instance);
    const catalog = createRecordCatalog(instance.getMetadataSnapshot());
    const schema = buildRecordSchema(catalog);
    attachRecordResolvers(schema);
    const permissions = buildPermissionContext(
      new MetadataStore(storage.sql),
      identity.userWorkspaceId,
    );
    const company = catalog.objects.find(
      (object) => object.nameSingular === 'company',
    )!;
    const permission = permissions.objectRecordsPermissions.find(
      (permission) => permission.objectMetadataId === company.id,
    )!;
    const context = {
      sql: storage.sql,
      catalog,
      schema,
      permissions,
      mutation: {
        identity,
        actor: {
          source: 'MANUAL',
          name: 'Tester',
          workspaceMemberId: identity.workspaceMemberId,
        },
        affectedRecords: 0,
        changed: false,
      },
    };
    permission.uneditableFields.push(company.fieldsByName.get('name')!.id);
    expect(
      JSON.parse(
        executeRecordQuery(
          { query: 'mutation {createCompany(data: {name: "Forbidden"}) {id}}' },
          context,
        ),
      ).errors[0].extensions.code,
    ).toBe('FORBIDDEN');
    permission.uneditableFields = [];
    permission.canReadAllRecords = false;
    expect(() =>
      storage.transactionSync(() =>
        executeRecordQuery(
          {
            query:
              'mutation {createCompany(data: {name: "Must roll back"}) {id}}',
          },
          context,
        ),
      ),
    ).toThrow(RecordMutationRollback);
    expect(
      storage.sql.exec('SELECT "id" FROM "rec_company"').toArray(),
    ).toHaveLength(0);
    expect(
      storage.sql.exec('SELECT "id" FROM "sys_outbox"').toArray(),
    ).toHaveLength(0);
  }));

it('enforces required fields and allows partial upsert without creating orphan relations', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const project = createProjectObject(instance);
    expectSuccess(
      instance.createField({
        objectMetadataId: project.id,
        name: 'requiredCode',
        label: 'Required code',
        type: FieldMetadataType.TEXT,
        isNullable: false,
      }),
    );
    const bad = JSON.parse(
      instance.executeRecordQuery(
        { query: 'mutation {createProject(data: {name: "Invalid"}) {id}}' },
        identity,
      ),
    );
    expect(bad.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    const created = queryRecords<{ createProject: { id: string } }>(
      instance,
      identity,
      'mutation {createProject(data: {name: "Valid", requiredCode: "A"}) {id}}',
    ).createProject;
    queryRecords(
      instance,
      identity,
      'mutation($id: ID!) {createProject(upsert: true, data: {id: $id, name: "Changed"}) {id requiredCode}}',
      { id: created.id },
    );
    const person = queryRecords<{ createPerson: { id: string } }>(
      instance,
      identity,
      'mutation {createPerson(data: {emails: {primaryEmail: "same@test.example"}}) {id}}',
    ).createPerson;
    queryRecords(
      instance,
      identity,
      'mutation {createPerson(upsert: true, data: {emails: {primaryEmail: "same@test.example"}, company: {create: {name: "Only one nested company"}}}) {id companyId}}',
    );
    expect(sql.exec('SELECT "id" FROM "rec_company"').toArray()).toHaveLength(
      1,
    );
    queryRecords(
      instance,
      identity,
      'mutation($id: UUID!) {deletePerson(id: $id) {id}}',
      { id: person.id },
    );
    queryRecords(
      instance,
      identity,
      'mutation {createPerson(upsert: true, data: {emails: {primaryEmail: "same@test.example"}, jobTitle: "Updated in trash"}) {id deletedAt}}',
    );
    expect(sql.exec('SELECT "id" FROM "rec_person"').toArray()).toHaveLength(1);
  }));

it('applies CASCADE and SET NULL and queues removed file references', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const company = queryRecords<{ createCompany: { id: string } }>(
      instance,
      identity,
      'mutation {createCompany(data: {name: "Deleted"}) {id}}',
    ).createCompany;
    const person = queryRecords<{ createPerson: { id: string } }>(
      instance,
      identity,
      'mutation($companyId: ID!) {createPerson(data: {companyId: $companyId}) {id}}',
      { companyId: company.id },
    ).createPerson;
    const fileId = crypto.randomUUID();
    queryRecords(
      instance,
      identity,
      'mutation($companyId: ID!, $fileId: UUID!) {createAttachment(data: {targetCompanyId: $companyId, name: "Test.txt", file: [{fileId: $fileId, label: "Test.txt"}]}) {id}}',
      { companyId: company.id, fileId },
    );
    queryRecords(
      instance,
      identity,
      'mutation($id: UUID!) {destroyCompany(id: $id) {id}}',
      { id: company.id },
    );
    expect(
      sql.exec('SELECT "id" FROM "rec_attachment"').toArray(),
    ).toHaveLength(0);
    expect(
      queryRecords(
        instance,
        identity,
        'query($id: UUID!) {person(filter: {id: {eq: $id}}) {companyId}}',
        { id: person.id },
      ),
    ).toEqual({ person: { companyId: null } });
    expect(
      sql
        .exec<{ payload: string }>(
          'SELECT "payload" FROM "sys_outbox" WHERE "kind" = ?',
          'file-cleanup',
        )
        .toArray()
        .map((row) => JSON.parse(row.payload)),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ fileIds: [fileId] })]),
    );
  }));

it('merges duplicate junctions without violating their unique indexes', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const records = queryRecords<{ createPeople: { id: string }[] }>(
      instance,
      identity,
      'mutation {createPeople(data: [{name: {firstName: "First"}}, {name: {firstName: "Second"}}]) {id}}',
    ).createPeople;
    const note = queryRecords<{ createNote: { id: string } }>(
      instance,
      identity,
      'mutation {createNote(data: {title: "Shared note"}) {id}}',
    ).createNote;
    queryRecords(
      instance,
      identity,
      'mutation($data: [NoteTargetCreateInput!]!) {createNoteTargets(data: $data) {id}}',
      {
        data: records.map((record) => ({
          noteId: note.id,
          targetPersonId: record.id,
        })),
      },
    );
    queryRecords(
      instance,
      identity,
      'mutation($ids: [UUID!]!) {mergePeople(ids: $ids, conflictPriorityIndex: 0) {id}}',
      { ids: records.map((record) => record.id) },
    );
    expect(
      sql
        .exec('SELECT "id" FROM "rec_noteTarget" WHERE "deletedAt" IS NULL')
        .toArray(),
    ).toHaveLength(1);
  }));

it('transfers a unique primary email when the priority record has only additional emails', async () =>
  runInNewWorkspace((_, instance) => {
    const identity = createRecordIdentity(instance);
    const records = queryRecords<{ createPeople: { id: string }[] }>(
      instance,
      identity,
      'mutation {createPeople(data: [{emails: {additionalEmails: ["secondary@example.com"]}}, {emails: {primaryEmail: "primary@example.com"}}]) {id}}',
    ).createPeople;
    const merged = queryRecords<{
      mergePeople: {
        emails: { primaryEmail: string; additionalEmails: string[] };
      };
    }>(
      instance,
      identity,
      'mutation($ids: [UUID!]!) {mergePeople(ids: $ids, conflictPriorityIndex: 0) {emails {primaryEmail additionalEmails}}}',
      { ids: records.map((record) => record.id) },
    ).mergePeople;
    expect(merged.emails).toEqual({
      primaryEmail: 'primary@example.com',
      additionalEmails: ['secondary@example.com'],
    });
  }));
