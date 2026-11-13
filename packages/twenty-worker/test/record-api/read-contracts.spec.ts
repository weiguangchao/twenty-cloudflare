import { beforeAll, expect, inject, it } from 'vitest';
import { Kind, parse, print, visit } from 'graphql';
import { isPlainObject } from 'twenty-shared/utils';

import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';
import {
  addFieldColumn,
  createRecordTable,
} from '@/workspace/metadata/ddl/record-table-ddl.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { bumpMetadataCollectionHashes } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { type MetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { type JsonValue } from '@/workspace/metadata/types/json-value.type';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import { env, runInDurableObject } from 'cloudflare:test';

import {
  createRecordIdentity,
  insertRecord,
} from '../utils/record-query-test.util';
import {
  projectRecordQuery,
  standardRecordSchema,
} from '../utils/project-record-query.util';
import { type readRecordFixtures } from '../config/read-record-fixtures.util';

declare module 'vitest' {
  export interface ProvidedContext {
    recordReadContracts: ReturnType<typeof readRecordFixtures>;
  }
}

const contracts = inject('recordReadContracts');
const schema = standardRecordSchema({
  object: contracts.customObject,
  fields: contracts.customFields,
});
const fixtures = contracts.fixtures.flatMap((fixture) => {
  const normalized = print(
    visit(parse(fixture.query), {
      NamedType: (node) =>
        node.name.value.startsWith('Project')
          ? {
              ...node,
              name: {
                ...node.name,
                value: node.name.value.replace(/^Project/, 'Initiative'),
              },
            }
          : undefined,
      OperationDefinition: {
        leave: (node) => ({
          ...node,
          selectionSet: {
            ...node.selectionSet,
            selections: node.selectionSet.selections.map((selection) =>
              selection.kind === Kind.FIELD &&
              ['project', 'projects'].includes(selection.name.value)
                ? {
                    ...selection,
                    name: {
                      ...selection.name,
                      value:
                        selection.name.value === 'project'
                          ? 'initiative'
                          : 'initiatives',
                    },
                  }
                : selection,
            ),
          },
        }),
      },
    }),
  );
  const original = parse(normalized).definitions.find(
    (definition) => definition.kind === Kind.OPERATION_DEFINITION,
  );
  if (
    !original ||
    original.kind !== Kind.OPERATION_DEFINITION ||
    !original.selectionSet.selections.some(
      (selection) =>
        selection.kind === Kind.FIELD &&
        schema.getQueryType()!.getFields()[selection.name.value],
    )
  )
    return [];
  const query = projectRecordQuery(normalized, schema);
  const document = parse(query);
  const operation = document.definitions.find(
    (definition) => definition.kind === Kind.OPERATION_DEFINITION,
  );
  return operation?.kind === Kind.OPERATION_DEFINITION &&
    operation.selectionSet.selections.length
    ? [{ ...fixture, query }]
    : [];
});
const stub = env.WORKSPACE.get(env.WORKSPACE.newUniqueId());
let identity: RecordQueryIdentity;

const expectCompatibleShape = (actual: unknown, expected: unknown) => {
  if (actual === null || expected === null || expected === undefined) return;
  if (Array.isArray(actual)) {
    expect(Array.isArray(expected)).toBe(true);
    if (Array.isArray(expected) && expected.length && actual.length)
      expectCompatibleShape(actual[0], expected[0]);
  } else if (isPlainObject(actual)) {
    expect(isPlainObject(expected)).toBe(true);
    if (isPlainObject(expected))
      for (const [name, value] of Object.entries(actual)) {
        if (name === '__typename') continue;
        expect(expected).toHaveProperty(name);
        expectCompatibleShape(value, expected[name]);
      }
  } else expect(typeof actual).toBe(typeof expected);
};

beforeAll(async () => {
  identity = await runInDurableObject(
    stub,
    (instance: WorkspaceDurableObject, { storage }) => {
      const { sql } = storage;
      storage.transactionSync(() => {
        sql.exec('PRAGMA defer_foreign_keys = ON');
        const store = new MetadataStore(sql);
        const object = contracts.customObject;
        store.insert('objectMetadata', {
          ...object,
          labelIdentifierFieldMetadataId: null,
          imageIdentifierFieldMetadataId: null,
        });
        for (const field of contracts.customFields)
          store.insert('fieldMetadata', field as MetadataRow<'fieldMetadata'>);
        const objectName = (id: string) =>
          store.findById('objectMetadata', id)!.nameSingular;
        createRecordTable(
          sql,
          object.nameSingular,
          contracts.customFields.filter(
            (field) => field.objectMetadataId === object.id,
          ),
          objectName,
        );
        for (const field of contracts.customFields.filter(
          (field) => field.objectMetadataId !== object.id,
        ))
          addFieldColumn(
            sql,
            objectName(field.objectMetadataId),
            field,
            objectName,
          );
        bumpMetadataCollectionHashes(sql, store.touchedEntityNames);
      });
      const identity = createRecordIdentity(instance);
      const snapshot = instance.getMetadataSnapshot();
      const pending: {
        table: string;
        id: string;
        column: string;
        value: string;
      }[] = [];
      const recordIds = new Set(
        contracts.records.map((record) => record.values.id),
      );
      for (const { objectName, values } of contracts.records) {
        const object = snapshot.objects.find(
          (object) => object.nameSingular === objectName,
        )!;
        const data: Record<string, JsonValue> = {};
        for (const field of object.fields) {
          const column = computeFieldColumn(field);
          if (!column || !(column.columnName in values)) continue;
          const value = values[column.columnName];
          if (column.references) {
            if (typeof value === 'string' && recordIds.has(value))
              pending.push({
                table: objectName,
                id: String(values.id),
                column: column.columnName,
                value,
              });
          } else data[column.columnName] = value as JsonValue;
        }
        if (objectName === 'workspaceMember') {
          data.userEmail = `${data.id}@fixture.example`;
          data.userId ??= crypto.randomUUID();
        }
        data.deletedAt = null;
        insertRecord(sql, objectName, data);
      }
      for (const update of pending)
        sql.exec(
          `UPDATE "rec_${update.table}" SET "${update.column}" = ? WHERE "id" = ?`,
          update.value,
          update.id,
        );
      return identity;
    },
  );
});

for (const fixture of fixtures)
  it(`replays ${fixture.path}`, async () => {
    const variables = { ...fixture.variables };
    const result = JSON.parse(
      await stub.executeRecordQuery(
        { query: fixture.query, variables },
        identity,
      ),
    );
    expect(result.errors, fixture.path).toBeUndefined();
    expect(result.data).toBeDefined();
    const roots: string[] = [];
    const document = parse(fixture.query);
    visit(document, {
      OperationDefinition: (operation) => {
        for (const selection of operation.selectionSet.selections)
          if (selection.kind === Kind.FIELD)
            roots.push(selection.alias?.value ?? selection.name.value);
        return false;
      },
    });
    expect(Object.keys(result.data)).toEqual(roots);
    const expected = isPlainObject(fixture.data)
      ? Object.fromEntries(
          Object.entries(fixture.data).map(([name, value]) => [
            name === 'project'
              ? 'initiative'
              : name === 'projects'
                ? 'initiatives'
                : name,
            value,
          ]),
        )
      : fixture.data;
    expectCompatibleShape(result.data, expected);
  });
