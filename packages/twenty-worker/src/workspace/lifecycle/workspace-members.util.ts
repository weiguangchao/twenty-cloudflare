import { isPlainObject } from 'twenty-shared/utils';

import { type WorkspaceMemberInput } from '@/workspace/lifecycle/types/workspace-member-input.type';
import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import { bumpMetadataCollectionHashes } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { type JsonValue } from '@/workspace/metadata/types/json-value.type';
import demoData from '@/workspace/seed/demo-data.json';
import standardMetadata from '@/workspace/seed/standard-metadata.json';

const defaultValue = (value: JsonValue): JsonValue => {
  if (typeof value === 'string') {
    if (value === 'now') return new Date().toISOString();
    if (value === 'uuid') return crypto.randomUUID();
    if (value.startsWith("'") && value.endsWith("'"))
      return value.slice(1, -1).replaceAll("''", "'");
  }
  if (Array.isArray(value)) return value.map(defaultValue);
  if (isPlainObject(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        defaultValue(entry as JsonValue),
      ]),
    );
  return value;
};

const insertSeedRecord = (
  sql: SqlStorage,
  objectName: string,
  record: Record<string, JsonValue>,
) => {
  const store = new MetadataStore(sql);
  const object = store.findMany('objectMetadata', {
    nameSingular: objectName,
  })[0];
  const fields = store.findMany('fieldMetadata', {
    objectMetadataId: object.id,
  }) as FieldMetadataRow[];
  const entries = fields.flatMap((field) => {
    const column = computeFieldColumn(field);
    if (!column) return [];
    const value = record[column.columnName] ?? defaultValue(field.defaultValue);
    return [
      [
        column.columnName,
        typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : typeof value === 'boolean'
            ? Number(value)
            : value,
      ] as const,
    ];
  });

  sql.exec(
    `INSERT INTO "rec_${objectName}" (${entries.map(([name]) => `"${name}"`).join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`,
    ...entries.map(([, value]) => value),
  );
};

export const getWorkspaceMember = (
  sql: SqlStorage,
  input: Pick<WorkspaceMemberInput, 'workspaceMemberId' | 'userWorkspaceId'>,
) => {
  const record = sql
    .exec<Record<string, SqlStorageValue>>(
      'SELECT * FROM "rec_workspaceMember" WHERE "id" = ? AND "deletedAt" IS NULL',
      input.workspaceMemberId,
    )
    .toArray()[0];
  if (!record) return null;

  return {
    ...record,
    id: record.id as string,
    createdBy: record.createdBy
      ? (JSON.parse(record.createdBy as string) as Record<string, JsonValue>)
      : null,
    updatedBy: record.updatedBy
      ? (JSON.parse(record.updatedBy as string) as Record<string, JsonValue>)
      : null,
    name: JSON.parse(record.name as string) as {
      firstName: string;
      lastName: string;
    },
    userWorkspaceId: input.userWorkspaceId,
  };
};

export const addWorkspaceMember = (
  sql: SqlStorage,
  input: WorkspaceMemberInput,
  isCreator: boolean,
) => {
  const store = new MetadataStore(sql);
  const defaultRole = store.findMany('role', {
    universalIdentifier: standardMetadata.defaultRoleUniversalIdentifier,
  })[0];
  const role = isCreator
    ? store.findMany('role', {
        universalIdentifier: '20202020-02c2-43f2-b94d-cab1f2b532eb',
      })[0]
    : defaultRole;

  if (!getWorkspaceMember(sql, input)) {
    insertSeedRecord(sql, 'workspaceMember', {
      id: input.workspaceMemberId,
      userId: input.userId,
      userEmail: input.email,
      name: { firstName: input.firstName, lastName: input.lastName },
      locale: input.locale,
      avatarUrl: '',
      jobTitle: '',
    });
  }

  if (
    store.findMany('roleTarget', { userWorkspaceId: input.userWorkspaceId })
      .length === 0
  ) {
    const now = new Date().toISOString();
    store.insert('roleTarget', {
      id: crypto.randomUUID(),
      roleId: role.id,
      userWorkspaceId: input.userWorkspaceId,
      agentId: null,
      apiKeyId: null,
      webhookId: null,
      targetApplicationId: null,
      applicationId: role.applicationId,
      universalIdentifier: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    bumpMetadataCollectionHashes(sql, store.touchedEntityNames);
  }

  return { defaultRoleId: defaultRole.id };
};

export const activateWorkspaceRecords = (
  storage: DurableObjectStorage,
  input: WorkspaceMemberInput,
) =>
  storage.transactionSync(() => {
    const result = addWorkspaceMember(storage.sql, input, true);
    storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS "sys_workspaceActivation" ("id" INTEGER PRIMARY KEY CHECK ("id" = 1))',
    );
    if (
      storage.sql.exec('SELECT "id" FROM "sys_workspaceActivation"').toArray()
        .length > 0
    )
      return result;

    for (const [objectName, records] of Object.entries(demoData.records)) {
      for (const record of records) {
        const substituted = JSON.parse(
          JSON.stringify(record).replaceAll(
            '{{creatorWorkspaceMemberId}}',
            input.workspaceMemberId,
          ),
        ) as Record<string, JsonValue>;
        insertSeedRecord(storage.sql, objectName, substituted);
      }
    }
    storage.sql.exec('INSERT INTO "sys_workspaceActivation" ("id") VALUES (1)');
    return result;
  });
