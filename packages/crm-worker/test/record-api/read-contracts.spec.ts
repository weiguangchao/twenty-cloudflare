import { beforeAll, expect, inject, it } from 'vitest';
import { installCapturedRecords } from '../utils/install-captured-records.util';
import { Kind, parse, print, visit } from 'graphql';
import { isPlainObject } from 'crm-shared/utils';

import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';
import { env, runInDurableObject } from 'cloudflare:test';

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
    (instance: WorkspaceDurableObject, { storage }) =>
      installCapturedRecords(storage, instance, contracts),
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
