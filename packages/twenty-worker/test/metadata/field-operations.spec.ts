import { FieldMetadataType } from 'twenty-shared/types';
import { describe, expect, it } from 'vitest';

import { type CreateFieldInput } from '@/workspace/metadata/types/field-metadata-inputs.type';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import {
  createProjectObject,
  expectFailure,
  expectSuccess,
  failureCodes,
  findFieldByName,
  findObjectByName,
  recordTableColumns,
} from '../utils/metadata-test.util';
import { selectRows } from '../utils/select-rows.util';

type FieldTypeCase = {
  type: FieldMetadataType;
  columnType: string;
  extraInput?: Partial<CreateFieldInput>;
};

const SELECT_OPTIONS = [
  { label: 'Planning', value: 'PLANNING', color: 'green' },
  { label: 'Execution', value: 'EXECUTION', color: 'blue' },
];

const FIELD_TYPE_CASES: FieldTypeCase[] = [
  { type: FieldMetadataType.TEXT, columnType: 'TEXT' },
  { type: FieldMetadataType.NUMBER, columnType: 'REAL' },
  { type: FieldMetadataType.NUMERIC, columnType: 'REAL' },
  { type: FieldMetadataType.BOOLEAN, columnType: 'INTEGER' },
  { type: FieldMetadataType.DATE_TIME, columnType: 'TEXT' },
  { type: FieldMetadataType.DATE, columnType: 'TEXT' },
  { type: FieldMetadataType.UUID, columnType: 'TEXT' },
  {
    type: FieldMetadataType.SELECT,
    columnType: 'TEXT',
    extraInput: { options: SELECT_OPTIONS },
  },
  {
    type: FieldMetadataType.MULTI_SELECT,
    columnType: 'TEXT',
    extraInput: { options: SELECT_OPTIONS },
  },
  { type: FieldMetadataType.RATING, columnType: 'TEXT' },
  { type: FieldMetadataType.ARRAY, columnType: 'TEXT' },
  { type: FieldMetadataType.RAW_JSON, columnType: 'TEXT' },
  { type: FieldMetadataType.FILES, columnType: 'TEXT' },
  { type: FieldMetadataType.CURRENCY, columnType: 'TEXT' },
  { type: FieldMetadataType.EMAILS, columnType: 'TEXT' },
  { type: FieldMetadataType.LINKS, columnType: 'TEXT' },
  { type: FieldMetadataType.PHONES, columnType: 'TEXT' },
  { type: FieldMetadataType.FULL_NAME, columnType: 'TEXT' },
  { type: FieldMetadataType.ADDRESS, columnType: 'TEXT' },
  { type: FieldMetadataType.RICH_TEXT, columnType: 'TEXT' },
  { type: FieldMetadataType.ACTOR, columnType: 'TEXT' },
];

describe('field lifecycle per type', () => {
  for (const { type, columnType, extraInput } of FIELD_TYPE_CASES) {
    it(`creates, renames and deletes a ${type} field`, async () => {
      await runInNewWorkspace(({ storage: { sql } }, instance) => {
        const project = createProjectObject(instance);
        const [created] = expectSuccess(
          instance.createField({
            objectMetadataId: project.id,
            type,
            name: 'sample',
            label: 'Sample',
            ...extraInput,
          }),
        );

        expect(findFieldByName(sql, 'project', 'sample')).toMatchObject({
          id: created.id,
          type,
          label: 'Sample',
          isActive: true,
        });
        expect(recordTableColumns(sql, 'project').sample).toBe(columnType);

        expectSuccess(
          instance.updateField({
            id: created.id,
            update: { name: 'renamed', label: 'Renamed' },
          }),
        );

        expect(findFieldByName(sql, 'project', 'sample')).toBeUndefined();
        expect(findFieldByName(sql, 'project', 'renamed')).toMatchObject({
          id: created.id,
          label: 'Renamed',
        });
        expect(recordTableColumns(sql, 'project')).not.toHaveProperty('sample');
        expect(recordTableColumns(sql, 'project').renamed).toBe(columnType);

        expectSuccess(instance.deleteField({ id: created.id }));

        expect(findFieldByName(sql, 'project', 'renamed')).toBeUndefined();
        expect(recordTableColumns(sql, 'project')).not.toHaveProperty(
          'renamed',
        );
      });
    });
  }

  it('generates the five RATING_n options for rating fields', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);

      expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.RATING,
          name: 'priority',
          label: 'Priority',
        }),
      );

      expect(
        findFieldByName(sql, 'project', 'priority')?.options?.map(
          ({ label, value, position }) => ({ label, value, position }),
        ),
      ).toEqual(
        [1, 2, 3, 4, 5].map((rating) => ({
          label: String(rating),
          value: `RATING_${rating}`,
          position: rating - 1,
        })),
      );
    });
  });
});

describe('updateField', () => {
  it('rewrites stored values when select options are renamed or removed', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const [phase] = expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.SELECT,
          name: 'phase',
          label: 'Phase',
          options: SELECT_OPTIONS,
          defaultValue: "'PLANNING'",
        }),
      );
      const [tags] = expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.MULTI_SELECT,
          name: 'tags',
          label: 'Tags',
          options: SELECT_OPTIONS,
        }),
      );

      sql.exec(
        `INSERT INTO "rec_project" ("id", "phase", "tags") VALUES ('a', 'PLANNING', '["PLANNING","EXECUTION"]'), ('b', 'EXECUTION', '["EXECUTION"]')`,
      );

      const [planning, execution] = phase.options ?? [];
      const [tagPlanning, tagExecution] = tags.options ?? [];

      expectSuccess(
        instance.updateField({
          id: phase.id,
          update: {
            options: [{ ...planning, value: 'DISCOVERY', label: 'Discovery' }],
          },
        }),
      );
      expectSuccess(
        instance.updateField({
          id: tags.id,
          update: {
            options: [
              { ...tagPlanning, value: 'EXECUTION' },
              { ...tagExecution, value: 'PLANNING' },
            ],
          },
        }),
      );

      expect(
        selectRows(
          sql,
          'SELECT "id", "phase", "tags" FROM "rec_project" ORDER BY "id"',
        ),
      ).toEqual([
        { id: 'a', phase: 'DISCOVERY', tags: '["EXECUTION","PLANNING"]' },
        { id: 'b', phase: null, tags: '["PLANNING"]' },
      ]);
      expect(findFieldByName(sql, 'project', 'phase')?.defaultValue).toBe(
        "'DISCOVERY'",
      );
      expect(execution.value).toBe('EXECUTION');
    });
  });

  it('creates and drops the unique index when isUnique changes', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const [code] = expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.TEXT,
          name: 'code',
          label: 'Code',
        }),
      );

      expectSuccess(
        instance.updateField({ id: code.id, update: { isUnique: true } }),
      );
      sql.exec(`INSERT INTO "rec_project" ("id", "code") VALUES ('a', 'X')`);
      expect(() =>
        sql.exec(`INSERT INTO "rec_project" ("id", "code") VALUES ('b', 'X')`),
      ).toThrow(/UNIQUE constraint failed/);
      sql.exec(
        `INSERT INTO "rec_project" ("id", "code", "deletedAt") VALUES ('c', 'X', '2026-01-01T00:00:00.000Z')`,
      );

      expectSuccess(
        instance.updateField({ id: code.id, update: { isUnique: false } }),
      );
      sql.exec(`INSERT INTO "rec_project" ("id", "code") VALUES ('d', 'X')`);

      expect(
        selectRows(
          sql,
          `SELECT count(*) AS "count" FROM "rec_project" WHERE "code" = 'X'`,
        ),
      ).toEqual([{ count: 3 }]);
    });
  });

  it('lets standard fields change labels and activation but not names', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const jobTitle = findFieldByName(sql, 'person', 'jobTitle');

      expectSuccess(
        instance.updateField({
          id: jobTitle?.id as string,
          update: { label: 'Role', isActive: false },
        }),
      );
      expect(findFieldByName(sql, 'person', 'jobTitle')).toMatchObject({
        label: 'Role',
        isActive: false,
      });
      expect(
        failureCodes(
          expectFailure(
            instance.updateField({
              id: jobTitle?.id as string,
              update: { name: 'role' },
            }),
          ),
        ),
      ).toEqual(['FIELD_MUTATION_NOT_ALLOWED']);
    });
  });

  it('only allows activation changes on system fields', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const createdAt = findFieldByName(sql, 'person', 'createdAt');

      expect(
        failureCodes(
          expectFailure(
            instance.updateField({
              id: createdAt?.id as string,
              update: { label: 'Born' },
            }),
          ),
        ),
      ).toEqual(['FIELD_MUTATION_NOT_ALLOWED']);
    });
  });

  it('refuses to deactivate the label identifier field', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      createProjectObject(instance);
      const name = findFieldByName(sql, 'project', 'name');

      expect(
        failureCodes(
          expectFailure(
            instance.updateField({
              id: name?.id as string,
              update: { isActive: false },
            }),
          ),
        ),
      ).toEqual(['LABEL_IDENTIFIER_FIELD_METADATA_ID_NOT_FOUND']);
    });
  });
});

describe('createField validation', () => {
  it('rejects malformed, reserved, duplicate and label-unsynced names', async () => {
    await runInNewWorkspace((_state, instance) => {
      const project = createProjectObject(instance);
      const create = (name: string, extra: Partial<CreateFieldInput> = {}) =>
        failureCodes(
          expectFailure(
            instance.createField({
              objectMetadataId: project.id,
              type: FieldMetadataType.TEXT,
              name,
              label: 'Label',
              ...extra,
            }),
          ),
        );

      expect(create('Bad Name!')).toEqual(['INVALID_FIELD_INPUT']);
      expect(create('id')).toEqual(['NOT_AVAILABLE']);
      expect(create('createdBy')).toEqual(['NOT_AVAILABLE']);
      expect(create('appToken')).toEqual(['INVALID_FIELD_INPUT']);
      expect(create('code', { isLabelSyncedWithName: true })).toEqual([
        'NAME_NOT_SYNCED_WITH_LABEL',
      ]);
    });
  });

  it('rejects select fields without options and with invalid option values', async () => {
    await runInNewWorkspace((_state, instance) => {
      const project = createProjectObject(instance);
      const create = (options: CreateFieldInput['options']) =>
        failureCodes(
          expectFailure(
            instance.createField({
              objectMetadataId: project.id,
              type: FieldMetadataType.SELECT,
              name: 'phase',
              label: 'Phase',
              options,
            }),
          ),
        );

      expect(create([])).toEqual(['INVALID_FIELD_INPUT']);
      expect(create([{ label: 'Low', value: 'low' }])).toEqual([
        'INVALID_FIELD_INPUT',
      ]);
      expect(
        create([
          { label: 'A', value: 'SAME' },
          { label: 'B', value: 'SAME' },
        ]),
      ).toEqual(['INVALID_FIELD_INPUT']);
    });
  });

  it('caps objects at 90 fields', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const existingFieldCount = selectRows(
        sql,
        'SELECT count(*) AS "count" FROM "meta_fieldMetadata" WHERE "objectMetadataId" = ?',
        project.id,
      )[0].count as number;

      for (let index = existingFieldCount; index < 90; index++) {
        expectSuccess(
          instance.createField({
            objectMetadataId: project.id,
            type: FieldMetadataType.TEXT,
            name: `extra${index}`,
            label: `Extra ${index}`,
          }),
        );
      }

      const failure = expectFailure(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.TEXT,
          name: 'oneTooMany',
          label: 'One too many',
        }),
      );

      expect(failureCodes(failure)).toEqual(['INVALID_FIELD_INPUT']);
      expect(failure.message).toContain('90 fields');
    });
  });
});

describe('deleteField', () => {
  it('refuses to delete standard, system and system-managed fields', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      createProjectObject(instance);

      for (const [objectName, fieldName] of [
        ['person', 'jobTitle'],
        ['project', 'createdAt'],
        ['project', 'noteTargets'],
        ['project', 'name'],
      ]) {
        const field = findFieldByName(sql, objectName, fieldName);

        expect(
          failureCodes(
            expectFailure(instance.deleteField({ id: field?.id as string })),
          ),
          `${objectName}.${fieldName}`,
        ).toEqual(['FIELD_MUTATION_NOT_ALLOWED']);
      }
      expect(findObjectByName(sql, 'project')).toBeDefined();
    });
  });
});
