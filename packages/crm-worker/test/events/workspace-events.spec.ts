import { expect, it, vi } from 'vitest';

import { enqueueOutbox } from '@/workspace/events/enqueue-outbox.util';
import { processOutbox } from '@/workspace/events/process-outbox.util';
import { getMetadataCollectionHashes } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import {
  createRecordIdentity,
  queryRecords,
  insertRecord,
} from '../utils/record-query-test.util';

it('delivers each completed outbox item once across repeated alarm work', async () =>
  runInNewWorkspace(async ({ storage }) => {
    const calls = vi.fn(async () => {});
    const now = Date.now();
    enqueueOutbox(storage.sql, 'test', { value: 1 }, 'once');
    await processOutbox(storage, { test: calls }, now + 1000);
    await processOutbox(storage, { test: calls }, now + 2000);
    expect(calls).toHaveBeenCalledTimes(1);
    expect(
      storage.sql
        .exec<{ status: string }>(
          'SELECT "status" FROM "sys_outbox" WHERE "id" = ?',
          'once',
        )
        .one().status,
    ).toBe('done');
  }));

it('cleans navigation links atomically with record deletion and refreshes collection hashes', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const company = queryRecords<{ createCompany: { id: string } }>(
      instance,
      identity,
      'mutation {createCompany(data: {name: "Favorite"}) {id}}',
    ).createCompany;
    const store = new MetadataStore(sql);
    const template = store.findMany('navigationMenuItem')[0];
    const navigationId = crypto.randomUUID();
    store.insert('navigationMenuItem', {
      ...template,
      id: navigationId,
      universalIdentifier: crypto.randomUUID(),
      type: 'RECORD',
      targetRecordId: company.id,
      userWorkspaceId: identity.userWorkspaceId,
    });
    const hash = () =>
      getMetadataCollectionHashes(sql).find(
        (collection) => collection.collectionName === 'navigationMenuItem',
      )!.hash;
    const before = hash();
    const failed = JSON.parse(
      instance.executeRecordQuery(
        {
          query:
            'mutation($id: UUID!) {deleteCompany(id: $id) {id} createPerson(data: {emails: {primaryEmail: "invalid"}}) {id}}',
          variables: { id: company.id },
        },
        identity,
      ),
    );
    expect(failed.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    expect(store.findById('navigationMenuItem', navigationId)).toBeDefined();
    expect(hash()).toBe(before);
    queryRecords(
      instance,
      identity,
      'mutation($id: UUID!) {deleteCompany(id: $id) {id}}',
      { id: company.id },
    );
    expect(store.findById('navigationMenuItem', navigationId)).toBeUndefined();
    expect(hash()).not.toBe(before);
  }));

it('retries after backoff with the same idempotency key, recovers leases and preserves future consumers', async () =>
  runInNewWorkspace(async ({ storage }) => {
    storage.sql.exec('CREATE TABLE "sys_testEffect" ("id" TEXT PRIMARY KEY)');
    enqueueOutbox(storage.sql, 'test', {}, 'retry');
    enqueueOutbox(
      storage.sql,
      'file-cleanup',
      { fileIds: ['future'] },
      'future',
    );
    const now = Date.now() + 1000;
    let attempts = 0;
    const deliver = async ({ id }: { id: string }) => {
      storage.sql.exec(
        'INSERT INTO "sys_testEffect" ("id") VALUES (?) ON CONFLICT ("id") DO NOTHING',
        id,
      );
      if (++attempts === 1)
        throw new Error('Delivery interrupted after the effect');
    };
    await processOutbox(storage, { test: deliver }, now);
    await processOutbox(storage, { test: deliver }, now + 1000);
    expect(attempts).toBe(1);
    await processOutbox(storage, { test: deliver }, now + 3000);
    await processOutbox(storage, { test: deliver }, now + 4000);
    expect(attempts).toBe(2);
    expect(
      storage.sql.exec('SELECT "id" FROM "sys_testEffect"').toArray(),
    ).toHaveLength(1);
    expect(
      storage.sql
        .exec<{ status: string }>(
          'SELECT "status" FROM "sys_outbox" WHERE "id" = ?',
          'future',
        )
        .one().status,
    ).toBe('pending');
    enqueueOutbox(storage.sql, 'test', {}, 'lease');
    storage.sql.exec(
      'UPDATE "sys_outbox" SET "status" = \'processing\', "leaseUntil" = ? WHERE "id" = ?',
      now - 1000,
      'lease',
    );
    await processOutbox(storage, { test: deliver }, now + 5000);
    expect(
      storage.sql
        .exec<{ status: string }>(
          'SELECT "status" FROM "sys_outbox" WHERE "id" = ?',
          'lease',
        )
        .one().status,
    ).toBe('done');
  }));

it('purges expired trash, keeps recent records and is safe on a repeated alarm', async () =>
  runInNewWorkspace(async ({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const expired = insertRecord(sql, 'company', {
      name: 'Expired',
      deletedAt: '2020-01-01T00:00:00.000Z',
    });
    const recent = insertRecord(sql, 'company', {
      name: 'Recent',
      deletedAt: new Date().toISOString(),
    });
    const person = insertRecord(sql, 'person', {
      name: { firstName: 'Related' },
      companyId: expired,
    });
    sql.exec(
      'UPDATE "sys_scheduledTask" SET "nextRunAt" = ?',
      Date.now() - 1000,
    );
    await instance.alarm();
    expect(
      sql
        .exec('SELECT "id" FROM "rec_company" WHERE "id" = ?', expired)
        .toArray(),
    ).toHaveLength(0);
    expect(
      sql
        .exec('SELECT "id" FROM "rec_company" WHERE "id" = ?', recent)
        .toArray(),
    ).toHaveLength(1);
    expect(
      queryRecords(
        instance,
        identity,
        'query($id: UUID!) {person(filter: {id: {eq: $id}}) {companyId}}',
        { id: person },
      ),
    ).toEqual({ person: { companyId: null } });
    const count = sql
      .exec<{ count: number }>('SELECT COUNT(*) AS "count" FROM "sys_outbox"')
      .one().count;
    await instance.alarm();
    expect(
      sql
        .exec<{ count: number }>('SELECT COUNT(*) AS "count" FROM "sys_outbox"')
        .one().count,
    ).toBe(count);
  }));

it('writes record and linked note/task timelines in the same transaction', async () =>
  runInNewWorkspace(({ storage: { sql } }, instance) => {
    const identity = createRecordIdentity(instance);
    const company = queryRecords<{ createCompany: { id: string } }>(
      instance,
      identity,
      'mutation {createCompany(data: {name: "Customer"}) {id}}',
    ).createCompany;
    for (const kind of ['Note', 'Task']) {
      const created = queryRecords<Record<string, { id: string }>>(
        instance,
        identity,
        `mutation {create${kind}(data: {title: "Related ${kind}"}) {id}}`,
      )[`create${kind}`];
      queryRecords(
        instance,
        identity,
        `mutation($id: ID!, $companyId: ID!) {create${kind}Targets(data: [{${kind.toLowerCase()}Id: $id, targetCompanyId: $companyId}]) {id}}`,
        { id: created.id, companyId: company.id },
      );
      queryRecords(
        instance,
        identity,
        `mutation($id: UUID!) {update${kind}(id: $id, data: {title: "Changed"}) {id}}`,
        { id: created.id },
      );
    }
    const names = sql
      .exec<{ name: string }>(
        'SELECT "timelineActivityTypeSnapshot" ->> \'$.name\' AS "name" FROM "rec_timelineActivity" WHERE "targetCompanyId" = ?',
        company.id,
      )
      .toArray()
      .map((row) => row.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'recordCreated',
        'noteLinked',
        'noteUpdated',
        'taskLinked',
        'taskUpdated',
      ]),
    );
  }));
