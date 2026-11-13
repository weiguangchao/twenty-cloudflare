import { expect, it } from 'vitest';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import {
  createRecordIdentity,
  queryRecords,
  insertRecord,
} from '../utils/record-query-test.util';

it('creates, updates, deletes, restores and destroys records with authenticated actors and events', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const created = queryRecords<{
      createPerson: {
        id: string;
        position: number;
        name: { firstName: string };
        createdBy: { workspaceMemberId: string; name: string };
      };
    }>(
      instance,
      identity,
      'mutation {createPerson(data: {name: {firstName: "Ada", lastName: "Lovelace"}, emails: {primaryEmail: "ADA@EXAMPLE.COM"}, position: "last"}) {id position name {firstName} createdBy {workspaceMemberId name}}}',
    ).createPerson;
    expect(created.createdBy).toEqual({
      workspaceMemberId: identity.workspaceMemberId,
      name: 'Query Tester',
    });
    queryRecords(
      instance,
      identity,
      'mutation($id: UUID!) {updatePerson(id: $id, data: {name: {firstName: "Augusta"}}) {name {firstName lastName} emails {primaryEmail}}}',
      { id: created.id },
    );
    const row = sql
      .exec<{ name: string; emails: string }>(
        'SELECT "name", "emails" FROM "rec_person" WHERE "id" = ?',
        created.id,
      )
      .one();
    expect(JSON.parse(row.name)).toMatchObject({
      firstName: 'Augusta',
      lastName: 'Lovelace',
    });
    expect(JSON.parse(row.emails).primaryEmail).toBe('ada@example.com');
    for (const operation of ['delete', 'restore', 'destroy'])
      queryRecords(
        instance,
        identity,
        `mutation($id: UUID!) {${operation}Person(id: $id) {id}}`,
        { id: created.id },
      );
    expect(
      sql
        .exec('SELECT "id" FROM "rec_person" WHERE "id" = ?', created.id)
        .toArray(),
    ).toEqual([]);
    const events = sql
      .exec<{ payload: string }>(
        'SELECT "payload" FROM "sys_outbox" WHERE "kind" = ?',
        'record-event',
      )
      .toArray()
      .map((row) => JSON.parse(row.payload));
    expect(
      events
        .filter((entry) => entry.event.recordId === created.id)
        .map((entry) => entry.name),
    ).toEqual([
      'person.created',
      'person.updated',
      'person.deleted',
      'person.restored',
      'person.destroyed',
    ]);
    expect(events[1].event).toMatchObject({
      recordId: created.id,
      userId: identity.userId,
      workspaceMemberId: identity.workspaceMemberId,
      properties: {
        diff: {
          name: {
            before: { firstName: 'Ada' },
            after: { firstName: 'Augusta' },
          },
        },
      },
    });
  }));

it('rolls back the full request after partial batches, nested creates and response errors', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const data = Array.from({ length: 30 }, (_, index) => ({
      name: { firstName: `Person ${index}` },
      emails: {
        primaryEmail:
          index === 29 ? 'person0@test.example' : `person${index}@test.example`,
      },
    }));
    const result = JSON.parse(
      instance.executeRecordQuery(
        {
          query:
            'mutation($data: [PersonCreateInput!]!) {createPeople(data: $data) {id}}',
          variables: { data },
        },
        identity,
      ),
    );
    expect(result.errors[0].extensions.code).toBe('CONFLICT');
    expect(sql.exec('SELECT "id" FROM "rec_person"').toArray()).toEqual([]);
    expect(sql.exec('SELECT "id" FROM "sys_outbox"').toArray()).toEqual([]);
    const request = JSON.parse(
      instance.executeRecordQuery(
        {
          query:
            'mutation {a: createCompany(data: {name: "No residue"}) {id} b: createPerson(data: {emails: {primaryEmail: "bad"}, company: {create: {name: "Nested"}}}) {id}}',
        },
        identity,
      ),
    );
    expect(request.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    expect(sql.exec('SELECT "id" FROM "rec_company"').toArray()).toEqual([]);
    expect(
      sql.exec('SELECT "id" FROM "rec_timelineActivity"').toArray(),
    ).toEqual([]);
  }));

it('supports nested create/connect/disconnect and upsert by unique composite keys', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const first = queryRecords<{
      createPerson: { id: string; company: { id: string } };
    }>(
      instance,
      identity,
      'mutation {createPerson(data: {name: {firstName: "First"}, emails: {primaryEmail: "same@example.com"}, company: {create: {name: "Acme", domainName: {primaryLinkUrl: "acme.test"}}}}) {id company {id}}}',
    ).createPerson;
    const next = queryRecords<{
      createPerson: { id: string; jobTitle: string };
    }>(
      instance,
      identity,
      'mutation {createPerson(upsert: true, data: {emails: {primaryEmail: "same@example.com"}, jobTitle: "Engineer"}) {id jobTitle}}',
    ).createPerson;
    expect(next).toEqual({ id: first.id, jobTitle: 'Engineer' });
    queryRecords(
      instance,
      identity,
      'mutation($id: UUID!) {updatePerson(id: $id, data: {company: {disconnect: true}}) {companyId}}',
      { id: first.id },
    );
    const connected = queryRecords<{ updatePerson: { companyId: string } }>(
      instance,
      identity,
      'mutation($id: UUID!) {updatePerson(id: $id, data: {company: {connect: {where: {domainName: {primaryLinkUrl: "acme.test"}}}}}) {companyId}}',
      { id: first.id },
    );
    expect(connected.updatePerson.companyId).toBe(first.company.id);
    expect(sql.exec('SELECT "id" FROM "rec_person"').toArray()).toHaveLength(1);
  }));

it('limits batch size, validates values and preserves data on failure', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    for (const input of [
      { emails: { primaryEmail: 'bad' } },
      {
        phones: {
          primaryPhoneNumber: 'letters',
          primaryPhoneCountryCode: 'US',
        },
      },
      { name: { firstName: 'a'.repeat(2_000_001) } },
    ]) {
      const result = JSON.parse(
        instance.executeRecordQuery(
          {
            query:
              'mutation($data: PersonCreateInput!) {createPerson(data: $data) {id}}',
            variables: { data: input },
          },
          identity,
        ),
      );
      expect(result.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    }
    const tooMany = JSON.parse(
      instance.executeRecordQuery(
        {
          query:
            'mutation($data: [PersonCreateInput!]!) {createPeople(data: $data) {id}}',
          variables: { data: Array.from({ length: 201 }, () => ({})) },
        },
        identity,
      ),
    );
    expect(tooMany.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    expect(sql.exec('SELECT "id" FROM "rec_person"').toArray()).toHaveLength(0);
  }));

it('merges records, preserves priority values, unifies email lists and rewires relations', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const first = insertRecord(sql, 'person', {
      name: { firstName: 'First' },
      emails: { primaryEmail: 'first@test.example' },
      jobTitle: null,
    });
    const second = insertRecord(sql, 'person', {
      name: { firstName: 'Second' },
      emails: { primaryEmail: 'second@test.example' },
      jobTitle: 'Engineer',
    });
    const opportunity = insertRecord(sql, 'opportunity', {
      name: 'Deal',
      stage: 'NEW',
      pointOfContactId: second,
    });
    const query =
      'mutation($ids: [UUID!]!, $dryRun: Boolean) {mergePeople(ids: $ids, conflictPriorityIndex: 0, dryRun: $dryRun) {id name {firstName} emails {primaryEmail additionalEmails} jobTitle}}';
    const dry = queryRecords<{ mergePeople: { id: string; jobTitle: string } }>(
      instance,
      identity,
      query,
      { ids: [first, second], dryRun: true },
    );
    expect(dry.mergePeople).toMatchObject({ id: first, jobTitle: 'Engineer' });
    expect(sql.exec('SELECT "id" FROM "sys_outbox"').toArray()).toHaveLength(0);
    const merged = queryRecords(instance, identity, query, {
      ids: [first, second],
    });
    expect(merged).toMatchObject({
      mergePeople: {
        id: first,
        name: { firstName: 'First' },
        emails: {
          primaryEmail: 'first@test.example',
          additionalEmails: ['second@test.example'],
        },
        jobTitle: 'Engineer',
      },
    });
    expect(
      sql
        .exec<{ pointOfContactId: string }>(
          'SELECT "pointOfContactId" FROM "rec_opportunity" WHERE "id" = ?',
          opportunity,
        )
        .one().pointOfContactId,
    ).toBe(first);
    expect(
      sql
        .exec<{ deletedAt: string }>(
          'SELECT "deletedAt" FROM "rec_person" WHERE "id" = ?',
          second,
        )
        .one().deletedAt,
    ).toBeTruthy();
  }));
