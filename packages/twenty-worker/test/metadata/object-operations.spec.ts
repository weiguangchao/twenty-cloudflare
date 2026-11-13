import { FieldMetadataType } from 'twenty-shared/types';
import { describe, expect, it } from 'vitest';

import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import {
  createProjectObject,
  expectFailure,
  expectSuccess,
  failureCodes,
  findFieldByName,
  findObjectByName,
  recordTableColumns,
  recordTableForeignKeys,
  tableExists,
} from '../utils/metadata-test.util';
import { selectRows } from '../utils/select-rows.util';

describe('createObject', () => {
  it('creates the object, its system fields and its record table', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const fields = new MetadataStore(sql).findMany('fieldMetadata', {
        objectMetadataId: project.id,
      });
      const fieldTypeByName = Object.fromEntries(
        fields.map((field) => [field.name, field.type]),
      );

      expect(fieldTypeByName).toEqual({
        id: 'UUID',
        name: 'TEXT',
        createdAt: 'DATE_TIME',
        updatedAt: 'DATE_TIME',
        deletedAt: 'DATE_TIME',
        createdBy: 'ACTOR',
        updatedBy: 'ACTOR',
        position: 'POSITION',
        searchVector: 'TS_VECTOR',
        timelineActivities: 'RELATION',
        attachments: 'RELATION',
        noteTargets: 'RELATION',
        taskTargets: 'RELATION',
      });
      expect(project.labelIdentifierFieldMetadataId).toBe(
        fields.find((field) => field.name === 'name')?.id,
      );
      expect(recordTableColumns(sql, 'project')).toEqual({
        id: 'TEXT',
        name: 'TEXT',
        createdAt: 'TEXT',
        updatedAt: 'TEXT',
        deletedAt: 'TEXT',
        createdBy: 'TEXT',
        updatedBy: 'TEXT',
        position: 'REAL',
      });
      expect(
        new MetadataStore(sql)
          .findMany('searchFieldMetadata', { objectMetadataId: project.id })
          .map((searchField) => searchField.fieldMetadataId),
      ).toEqual([fields.find((field) => field.name === 'name')?.id]);
    });
  });

  it('adds target<Object> morph relations on noteTarget, taskTarget, attachment and timelineActivity', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);

      for (const [objectName, label] of [
        ['noteTarget', 'Linked to'],
        ['taskTarget', 'Linked to'],
        ['attachment', 'Attached to'],
        ['timelineActivity', 'Project'],
      ]) {
        const reverseField = findFieldByName(sql, objectName, 'targetProject');
        const morphHead = findFieldByName(sql, objectName, 'target');

        expect(reverseField, objectName).toMatchObject({
          type: FieldMetadataType.MORPH_RELATION,
          label,
          relationTargetObjectMetadataId: project.id,
          settings: {
            relationType: 'MANY_TO_ONE',
            onDelete: 'SET_NULL',
            joinColumnName: 'targetProjectId',
          },
        });
        expect(reverseField?.morphId).toBe(morphHead?.morphId);
        expect(recordTableForeignKeys(sql, objectName).targetProjectId).toEqual(
          {
            table: 'rec_project',
            onDelete: 'SET NULL',
          },
        );
      }
    });
  });

  it('rejects names that are taken, reserved or malformed with structured errors', async () => {
    await runInNewWorkspace((_state, instance) => {
      const taken = expectFailure(
        instance.createObject({
          nameSingular: 'person',
          namePlural: 'persons',
          labelSingular: 'Person',
          labelPlural: 'Persons',
        }),
      );
      const malformed = expectFailure(
        instance.createObject({
          nameSingular: 'Bad Name',
          namePlural: 'badNames',
          labelSingular: 'Bad Name',
          labelPlural: 'Bad Names',
        }),
      );
      const samePlural = expectFailure(
        instance.createObject({
          nameSingular: 'sheep',
          namePlural: 'sheep',
          labelSingular: 'Sheep',
          labelPlural: 'Sheep',
        }),
      );

      expect(failureCodes(taken)).toEqual(['NOT_AVAILABLE']);
      expect(taken.errors.objectMetadata?.[0]).toMatchObject({
        status: 'fail',
        metadataName: 'objectMetadata',
        type: 'create',
      });
      expect(taken.summary.totalErrors).toBe(1);
      expect(failureCodes(malformed)).toContain('INVALID_OBJECT_INPUT');
      expect(failureCodes(samePlural)).toContain('INVALID_OBJECT_INPUT');
    });
  });
});

describe('updateObject', () => {
  it('renames the object, its table and its target<Object> fields', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);

      sql.exec(
        `INSERT INTO "rec_project" ("id", "name") VALUES ('p1', 'Revamp')`,
      );

      expectSuccess(
        instance.updateObject({
          id: project.id,
          update: {
            nameSingular: 'initiative',
            namePlural: 'initiatives',
            labelSingular: 'Initiative',
            labelPlural: 'Initiatives',
          },
        }),
      );

      expect(tableExists(sql, 'rec_project')).toBe(false);
      expect(
        selectRows(sql, 'SELECT "id", "name" FROM "rec_initiative"'),
      ).toEqual([{ id: 'p1', name: 'Revamp' }]);
      expect(
        findFieldByName(sql, 'noteTarget', 'targetProject'),
      ).toBeUndefined();
      expect(
        findFieldByName(sql, 'timelineActivity', 'targetInitiative'),
      ).toMatchObject({
        label: 'Initiative',
        settings: { joinColumnName: 'targetInitiativeId' },
      });
      expect(
        recordTableForeignKeys(sql, 'noteTarget').targetInitiativeId,
      ).toEqual({
        table: 'rec_initiative',
        onDelete: 'SET NULL',
      });
    });
  });

  it('updates labels and deactivates standard objects but not their names', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const company = findObjectByName(sql, 'company');

      expectSuccess(
        instance.updateObject({
          id: company?.id as string,
          update: {
            labelSingular: 'Account',
            labelPlural: 'Accounts',
            isActive: false,
          },
        }),
      );

      expect(findObjectByName(sql, 'company')).toMatchObject({
        labelSingular: 'Account',
        isActive: false,
      });
      expect(
        failureCodes(
          expectFailure(
            instance.updateObject({
              id: company?.id as string,
              update: { nameSingular: 'account' },
            }),
          ),
        ),
      ).toEqual(['INVALID_OBJECT_INPUT']);
    });
  });

  it('refuses to change system objects', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const noteTarget = findObjectByName(sql, 'noteTarget');

      expect(
        failureCodes(
          expectFailure(
            instance.updateObject({
              id: noteTarget?.id as string,
              update: { labelSingular: 'Link' },
            }),
          ),
        ),
      ).toEqual(['INVALID_OBJECT_INPUT']);
    });
  });
});

describe('deleteObject', () => {
  it('drops the table, its fields and the relation fields pointing at it', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const person = findObjectByName(sql, 'person');

      expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.RELATION,
          name: 'lead',
          label: 'Lead',
          relationCreationPayload: {
            type: 'MANY_TO_ONE',
            targetObjectMetadataId: person?.id as string,
            targetFieldLabel: 'Led Projects',
          },
        }),
      );
      expectSuccess(instance.deleteObject({ id: project.id }));

      const store = new MetadataStore(sql);

      expect(tableExists(sql, 'rec_project')).toBe(false);
      expect(findObjectByName(sql, 'project')).toBeUndefined();
      expect(
        store.findMany('fieldMetadata', { objectMetadataId: project.id }),
      ).toEqual([]);
      expect(findFieldByName(sql, 'person', 'ledProjects')).toBeUndefined();
      expect(
        findFieldByName(sql, 'noteTarget', 'targetProject'),
      ).toBeUndefined();
      expect(recordTableColumns(sql, 'noteTarget')).not.toHaveProperty(
        'targetProjectId',
      );
      expect(
        store.findMany('fieldMetadata', {
          relationTargetObjectMetadataId: project.id,
        }),
      ).toEqual([]);
    });
  });

  it('refuses to delete standard objects', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const person = findObjectByName(sql, 'person');

      expect(
        failureCodes(
          expectFailure(instance.deleteObject({ id: person?.id as string })),
        ),
      ).toEqual(['INVALID_OBJECT_INPUT']);
      expect(tableExists(sql, 'rec_person')).toBe(true);
    });
  });
});
