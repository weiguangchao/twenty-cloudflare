import { env } from 'cloudflare:test';
import { graphql, parse, Kind, valueFromASTUntyped } from 'graphql';
import { expect, inject, it } from 'vitest';
import { isPlainObject } from 'twenty-shared/utils';

import { buildMetadataSchema } from '@/metadata-api/metadata-schema.util';
import { createMetadataContext } from '@/metadata-api/create-metadata-context.util';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { METADATA_TABLE_DEFINITIONS } from '@/workspace/metadata/constants/metadata-table-definitions.constant';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { bumpMetadataCollectionHashes } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { type MetadataReadTables } from '@/workspace/metadata/read/types/metadata-read-model.type';
import { type MetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { type CreateFieldInput } from '@/workspace/metadata/types/field-metadata-inputs.type';

import { type readMetadataWriteFixtures } from '../config/read-metadata-write-fixtures.util';
import { installCapturedRecords } from '../utils/install-captured-records.util';
import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import { expectSuccess } from '../utils/metadata-test.util';

declare module 'vitest' {
  export interface ProvidedContext {
    metadataWriteContracts: ReturnType<typeof readMetadataWriteFixtures>;
  }
}
const contracts = inject('metadataWriteContracts');
const records = inject('recordReadContracts');
const schema = buildMetadataSchema();
const UI_TABLES = [
  'view',
  'viewFieldGroup',
  'viewFilterGroup',
  'viewField',
  'viewFilter',
  'viewSort',
  'viewGroup',
  'navigationMenuItem',
] as const;

const expectShape = (actual: unknown, expected: unknown) => {
  if (actual === null || expected === null || expected === undefined) return;
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    if (expected.length)
      for (const item of actual as unknown[]) expectShape(item, expected[0]);
  } else if (isPlainObject(expected)) {
    expect(isPlainObject(actual)).toBe(true);
    for (const [key, value] of Object.entries(expected)) {
      expect(actual).toHaveProperty(key);
      if (!['defaultValue', 'options', 'settings', 'overrides'].includes(key))
        expectShape((actual as Record<string, unknown>)[key], value);
    }
  } else expect(typeof actual).toBe(typeof expected);
};

for (const fixture of contracts.fixtures)
  it(`replays ${fixture.path}`, async () =>
    runInNewWorkspace(async ({ storage }, instance) => {
      const identity = installCapturedRecords(storage, instance, records);
      const store = new MetadataStore(storage.sql);
      const admin = store.findMany('role', { label: 'Admin' })[0];
      store.update(
        'roleTarget',
        store.findMany('roleTarget', {
          userWorkspaceId: identity.userWorkspaceId,
        })[0].id,
        { roleId: admin.id },
      );
      for (const table of UI_TABLES) {
        const definition = METADATA_TABLE_DEFINITIONS.find(
          (definition) => definition.entityName === table,
        )!;
        for (const candidate of contracts.tables[table]) {
          if (store.findById(table, candidate.id)) continue;
          const row = { ...candidate } as Record<string, unknown>;
          if (row.userWorkspaceId)
            row.userWorkspaceId = identity.userWorkspaceId;
          if (row.createdByUserWorkspaceId)
            row.createdByUserWorkspaceId = identity.userWorkspaceId;
          const references = definition.columns.filter(
            (column) => 'references' in column,
          );
          if (
            references.some(
              (column) =>
                'references' in column &&
                row[column.name] &&
                !store.findById(
                  column.references.entityName as keyof MetadataReadTables,
                  String(row[column.name]),
                ),
            )
          )
            continue;
          store.insert(table, row as MetadataRow<typeof table>);
        }
      }
      const operation = parse(fixture.query).definitions.find(
        (definition) => definition.kind === Kind.OPERATION_DEFINITION,
      )!;
      if (
        operation.kind !== Kind.OPERATION_DEFINITION ||
        operation.selectionSet.selections[0].kind !== Kind.FIELD
      )
        throw new Error('Invalid fixture operation');
      const root = operation.selectionSet.selections[0];
      const arguments_ = Object.fromEntries(
        (root.arguments ?? []).map((argument) => [
          argument.name.value,
          valueFromASTUntyped(argument.value, fixture.variables),
        ]),
      );
      const input = isPlainObject(arguments_.input) ? arguments_.input : {};
      if (
        fixture.duplicateField &&
        isPlainObject(input.field) &&
        !store.findMany('fieldMetadata', {
          objectMetadataId: String(input.field.objectMetadataId),
          name: String(input.field.name),
        }).length
      )
        expectSuccess(instance.createField(input.field as CreateFieldInput));
      if (
        !fixture.expectedErrorCode &&
        root.name.value === 'createOneField' &&
        isPlainObject(input.field)
      ) {
        const field = store.findMany('fieldMetadata', {
          objectMetadataId: String(input.field.objectMetadataId),
          name: String(input.field.name),
        })[0];
        if (field) expectSuccess(instance.deleteField({ id: field.id }));
      }
      if (
        ['updateOneField', 'deleteOneField'].includes(root.name.value) &&
        !store.findById('fieldMetadata', String(input.id))
      ) {
        const field = contracts.fieldDefinitions.find(
          (field) => field.id === input.id,
        );
        if (field)
          expectSuccess(
            instance.createField({
              ...field,
              id: String(input.id),
            } as CreateFieldInput),
          );
      }
      const entityByMutation: Record<string, (typeof UI_TABLES)[number]> = {
        createView: 'view',
        createManyViewFields: 'viewField',
        createViewFilter: 'viewFilter',
        createViewSort: 'viewSort',
        createManyNavigationMenuItems: 'navigationMenuItem',
      };
      const entity = entityByMutation[root.name.value];
      if (entity)
        for (const entry of Array.isArray(arguments_.inputs)
          ? arguments_.inputs
          : [input]) {
          if (!isPlainObject(entry)) continue;
          if (entry.id) store.delete(entity, [String(entry.id)]);
          if (entity === 'viewField')
            store.delete(
              'viewField',
              store
                .findMany('viewField', {
                  viewId: String(entry.viewId),
                  fieldMetadataId: String(entry.fieldMetadataId),
                })
                .map((row) => row.id),
            );
          if ('userWorkspaceId' in entry)
            entry.userWorkspaceId = identity.userWorkspaceId;
        }
      if (root.name.value === 'deleteManyNavigationMenuItems') {
        for (const id of arguments_.ids as string[])
          if (!store.findById('navigationMenuItem', id)) {
            const creation = contracts.fixtures
              .flatMap((fixture) =>
                Array.isArray(fixture.variables.inputs)
                  ? fixture.variables.inputs
                  : [],
              )
              .find((input) => isPlainObject(input) && input.id === id);
            if (isPlainObject(creation)) {
              const result = JSON.parse(
                instance.executeMetadataMutation(
                  'createNavigationMenuItem',
                  JSON.stringify({
                    input: {
                      ...creation,
                      userWorkspaceId: identity.userWorkspaceId,
                    },
                  }),
                  identity,
                ),
              );
              expect(result.status).toBe('success');
            }
          }
      }
      bumpMetadataCollectionHashes(storage.sql, store.touchedEntityNames);
      const metadata = () => ({
        ...instance.getMetadataReadModel(identity.userWorkspaceId),
        workspace: { id: 'fixture-workspace' },
        membership: {
          id: identity.userWorkspaceId,
          workspaceMemberId: identity.workspaceMemberId,
        },
        objectsById: new Map(
          store.findMany('objectMetadata').map((object) => [object.id, object]),
        ),
        fieldsById: new Map(
          store.findMany('fieldMetadata').map((field) => [field.id, field]),
        ),
        fieldsByObjectId: Object.groupBy(
          store.findMany('fieldMetadata'),
          (field) => field.objectMetadataId,
        ),
        indexFieldsByIndexId: Object.groupBy(
          store.findMany('indexFieldMetadata'),
          (field) => field.indexMetadataId,
        ),
      });
      const context = {
        ...createMetadataContext(
          env,
          new Request('http://localhost/metadata'),
          new Headers(),
        ),
        requireMetadata: async () => metadata(),
        requireAuth: async () => ({ userId: identity.userId }),
        workspace: () => instance,
        invalidateMetadata: () => {},
        requireNavigationIdentifiers: async () =>
          new Map(
            instance
              .getNavigationRecordIdentifiers(identity)
              .map((row) => [row.navigationMenuItemId, row.identifier]),
          ),
      } as unknown as MetadataContext;
      const variables = structuredClone(fixture.variables);
      if (Array.isArray(variables.inputs))
        for (const input of variables.inputs)
          if (isPlainObject(input) && 'userWorkspaceId' in input)
            input.userWorkspaceId = identity.userWorkspaceId;
      const result = await graphql({
        schema,
        source: fixture.query,
        variableValues: variables,
        contextValue: context,
      });
      if (fixture.expectedErrorCode) {
        expect(result.errors?.[0]?.extensions.code).toBe(
          fixture.expectedErrorCode,
        );
        if (fixture.expectedErrorCode === 'METADATA_VALIDATION_FAILED')
          expect(result.errors?.[0]?.extensions).toMatchObject({
            errors: expect.any(Object),
            summary: { totalErrors: expect.any(Number) },
          });
      } else {
        expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
        expectShape(result.data, fixture.data);
      }
    }));
