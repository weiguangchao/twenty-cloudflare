import { expect } from 'vitest';

import { type JsonValue } from '@/workspace/metadata/types/json-value.type';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';

export const createRecordIdentity = (instance: WorkspaceDurableObject) => {
  const identity: RecordQueryIdentity = {
    userId: crypto.randomUUID(),
    userWorkspaceId: crypto.randomUUID(),
    workspaceMemberId: crypto.randomUUID(),
  };
  instance.addWorkspaceMember({
    ...identity,
    email: `${identity.userId}@example.com`,
    firstName: 'Query',
    lastName: 'Tester',
    locale: 'en',
  });
  return identity;
};

export const insertRecord = (
  sql: SqlStorage,
  objectName: string,
  values: Record<string, JsonValue>,
) => {
  const now = new Date().toISOString();
  const actor = { source: 'MANUAL', name: 'Tester', workspaceMemberId: null };
  const record = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
    updatedBy: actor,
    position: 0,
    ...values,
  };
  sql.exec(
    `INSERT INTO "rec_${objectName}" (${Object.keys(record)
      .map((name) => `"${name}"`)
      .join(', ')}) VALUES (${Object.keys(record)
      .map(() => '?')
      .join(', ')})`,
    ...Object.values(record).map((value) =>
      value !== null && typeof value === 'object'
        ? JSON.stringify(value)
        : typeof value === 'boolean'
          ? Number(value)
          : value,
    ),
  );
  return record.id;
};

export const queryRecords = <TData = Record<string, unknown>>(
  instance: WorkspaceDurableObject,
  identity: RecordQueryIdentity,
  query: string,
  variables?: Record<string, unknown>,
) => {
  const result = JSON.parse(
    instance.executeRecordQuery({ query, variables }, identity),
  ) as {
    data: TData;
    errors?: { message: string; extensions: { code: string } }[];
  };
  expect(result.errors).toBeUndefined();
  return result.data;
};
