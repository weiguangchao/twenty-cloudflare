import { expect, inject, it } from 'vitest';
import { parse, print, visit, Kind } from 'graphql';
import { isPlainObject } from 'crm-shared/utils';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import { installCapturedRecords } from '../utils/install-captured-records.util';
import {
  projectRecordQuery,
  standardRecordSchema,
} from '../utils/project-record-query.util';

const contracts = inject('recordReadContracts');
const schema = standardRecordSchema({
  object: contracts.customObject,
  fields: contracts.customFields,
});

for (const fixture of contracts.writeFixtures)
  it(`replays write ${fixture.path}`, async () =>
    runInNewWorkspace(({ storage }, instance) => {
      const identity = installCapturedRecords(storage, instance, contracts);
      const document = parse(fixture.query);
      const operation = document.definitions.find(
        (definition) => definition.kind === Kind.OPERATION_DEFINITION,
      )!;
      if (operation.kind !== Kind.OPERATION_DEFINITION)
        throw new Error('Missing operation');
      const root = operation.selectionSet.selections[0];
      if (
        root.kind !== Kind.FIELD ||
        !schema.getMutationType()!.getFields()[root.name.value]
      )
        throw new Error(`Unknown mutation ${fixture.path}`);
      const query = projectRecordQuery(
        print(
          visit(document, {
            VariableDefinition: (node) =>
              node.type.kind === Kind.LIST_TYPE
                ? {
                    ...node,
                    type: { kind: Kind.NON_NULL_TYPE, type: node.type },
                  }
                : undefined,
          }),
        ),
        schema,
      );
      const variables = structuredClone(fixture.variables);
      if (root.name.value.startsWith('create') && !fixture.expectedErrorCode) {
        const object = instance
          .getMetadataSnapshot()
          .objects.find(
            (object) =>
              root.name.value ===
                `create${object.nameSingular[0].toUpperCase() + object.nameSingular.slice(1)}` ||
              root.name.value ===
                `create${object.namePlural[0].toUpperCase() + object.namePlural.slice(1)}`,
          )!;
        for (const input of Array.isArray(variables.data)
          ? variables.data
          : [variables.input ?? variables.data])
          if (isPlainObject(input)) {
            if (typeof input.id === 'string')
              storage.sql.exec(
                `DELETE FROM "rec_${object.nameSingular}" WHERE "id" = ?`,
                input.id,
              );
            if (
              isPlainObject(input.emails) &&
              typeof input.emails.primaryEmail === 'string'
            )
              storage.sql.exec(
                `DELETE FROM "rec_${object.nameSingular}" WHERE "emails" ->> '$.primaryEmail' = ?`,
                input.emails.primaryEmail,
              );
          }
      }
      const result = JSON.parse(
        instance.executeRecordQuery({ query, variables }, identity),
      );
      if (fixture.expectedErrorCode)
        expect(result.errors?.[0].extensions.code).toBe(
          fixture.expectedErrorCode,
        );
      else {
        expect(result.errors, fixture.path).toBeUndefined();
        expect(result.data).toHaveProperty(
          root.alias?.value ?? root.name.value,
        );
        const expected = isPlainObject(fixture.data)
          ? fixture.data[root.alias?.value ?? root.name.value]
          : undefined;
        const actual = result.data[root.alias?.value ?? root.name.value];
        expect(Array.isArray(actual)).toBe(Array.isArray(expected));
        if (!Array.isArray(actual) && isPlainObject(expected))
          for (const key of Object.keys(actual))
            expect(expected).toHaveProperty(key);
      }
    }));
