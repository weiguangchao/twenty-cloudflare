import { FieldMetadataType } from 'crm-shared/types';
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
} from '../utils/metadata-test.util';
import { selectRows } from '../utils/select-rows.util';

const indexedColumns = (sql: SqlStorage, objectNameSingular: string) =>
  selectRows(
    sql,
    `SELECT "ii"."name" AS "column" FROM sqlite_master AS "m", pragma_index_info("m"."name") AS "ii" WHERE "m"."type" = 'index' AND "m"."tbl_name" = ?`,
    `rec_${objectNameSingular}`,
  ).map((row) => row.column);

describe('relation fields', () => {
  it('creates a MANY_TO_ONE pair with a join column, foreign key and index', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const person = findObjectByName(sql, 'person');
      const [lead, ledProjects] = expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.RELATION,
          name: 'lead',
          label: 'Lead',
          relationCreationPayload: {
            type: 'MANY_TO_ONE',
            targetObjectMetadataId: person?.id as string,
            targetFieldLabel: 'Led Projects',
            targetFieldIcon: 'IconUsers',
          },
        }),
      );

      expect(lead).toMatchObject({
        relationTargetObjectMetadataId: person?.id,
        relationTargetFieldMetadataId: ledProjects.id,
        settings: {
          relationType: 'MANY_TO_ONE',
          onDelete: 'SET_NULL',
          joinColumnName: 'leadId',
        },
        description: 'Projects tied to the Person',
      });
      expect(findFieldByName(sql, 'person', 'ledProjects')).toMatchObject({
        label: 'Led Projects',
        icon: 'IconUsers',
        relationTargetFieldMetadataId: lead.id,
        settings: { relationType: 'ONE_TO_MANY' },
      });
      expect(recordTableForeignKeys(sql, 'project').leadId).toEqual({
        table: 'rec_person',
        onDelete: 'SET NULL',
      });
      expect(recordTableColumns(sql, 'person')).not.toHaveProperty(
        'ledProjects',
      );
      expect(indexedColumns(sql, 'project')).toContain('leadId');
    });
  });

  it('puts the join column on the target side of a ONE_TO_MANY relation', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const opportunity = findObjectByName(sql, 'opportunity');

      expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.RELATION,
          name: 'opportunities',
          label: 'Opportunities',
          relationCreationPayload: {
            type: 'ONE_TO_MANY',
            targetObjectMetadataId: opportunity?.id as string,
            targetFieldLabel: 'Project',
          },
        }),
      );

      expect(recordTableColumns(sql, 'project')).not.toHaveProperty(
        'opportunitiesId',
      );
      expect(recordTableForeignKeys(sql, 'opportunity').projectId).toEqual({
        table: 'rec_project',
        onDelete: 'SET NULL',
      });
    });
  });

  it('applies ON DELETE SET NULL to records through SQLite', async () => {
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
      sql.exec(`INSERT INTO "rec_person" ("id") VALUES ('person-1')`);
      sql.exec(
        `INSERT INTO "rec_project" ("id", "leadId") VALUES ('project-1', 'person-1')`,
      );
      sql.exec(`DELETE FROM "rec_person" WHERE "id" = 'person-1'`);

      expect(selectRows(sql, 'SELECT "leadId" FROM "rec_project"')).toEqual([
        { leadId: null },
      ]);
    });
  });

  it('renames a relation field together with its join column', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const person = findObjectByName(sql, 'person');
      const [lead] = expectSuccess(
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

      expectSuccess(
        instance.updateField({
          id: lead.id,
          update: { name: 'owner', label: 'Owner' },
        }),
      );

      expect(findFieldByName(sql, 'project', 'owner')?.settings).toMatchObject({
        joinColumnName: 'ownerId',
      });
      expect(recordTableForeignKeys(sql, 'project').ownerId).toEqual({
        table: 'rec_person',
        onDelete: 'SET NULL',
      });
      expect(recordTableColumns(sql, 'project')).not.toHaveProperty('leadId');
    });
  });

  it('deletes both sides, the join column and its index', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const person = findObjectByName(sql, 'person');
      const [lead] = expectSuccess(
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

      expectSuccess(instance.deleteField({ id: lead.id }));

      expect(findFieldByName(sql, 'project', 'lead')).toBeUndefined();
      expect(findFieldByName(sql, 'person', 'ledProjects')).toBeUndefined();
      expect(recordTableColumns(sql, 'project')).not.toHaveProperty('leadId');
      expect(indexedColumns(sql, 'project')).not.toContain('leadId');
    });
  });
});

describe('morph relation fields', () => {
  it('creates a head and one target field per object, each with its inverse', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const person = findObjectByName(sql, 'person');
      const company = findObjectByName(sql, 'company');
      const [head] = expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.MORPH_RELATION,
          name: 'owner',
          label: 'Owner',
          morphRelationsCreationPayload: [person, company].map((target) => ({
            type: 'MANY_TO_ONE' as const,
            targetObjectMetadataId: target?.id as string,
            targetFieldLabel: 'Owned Projects',
          })),
        }),
      );

      expect(head).toMatchObject({
        type: FieldMetadataType.MORPH_RELATION,
        morphId: head.universalIdentifier,
        relationTargetObjectMetadataId: null,
      });
      for (const [fieldName, targetName] of [
        ['ownerPerson', 'person'],
        ['ownerCompany', 'company'],
      ]) {
        expect(findFieldByName(sql, 'project', fieldName)).toMatchObject({
          type: FieldMetadataType.MORPH_RELATION,
          morphId: head.morphId,
          settings: { joinColumnName: `${fieldName}Id` },
        });
        expect(findFieldByName(sql, targetName, 'ownedProjects')).toMatchObject(
          {
            type: FieldMetadataType.RELATION,
            settings: { relationType: 'ONE_TO_MANY' },
          },
        );
        expect(
          recordTableForeignKeys(sql, 'project')[`${fieldName}Id`],
        ).toEqual({
          table: `rec_${targetName}`,
          onDelete: 'SET NULL',
        });
      }
      expect(recordTableColumns(sql, 'project')).not.toHaveProperty('owner');
      expect(recordTableColumns(sql, 'project')).not.toHaveProperty('ownerId');
    });
  });

  it('renames and deletes the whole morph group from its head', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const person = findObjectByName(sql, 'person');
      const company = findObjectByName(sql, 'company');
      const [head] = expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.MORPH_RELATION,
          name: 'owner',
          label: 'Owner',
          morphRelationsCreationPayload: [person, company].map((target) => ({
            type: 'MANY_TO_ONE' as const,
            targetObjectMetadataId: target?.id as string,
            targetFieldLabel: 'Owned Projects',
          })),
        }),
      );

      expectSuccess(
        instance.updateField({
          id: head.id,
          update: { name: 'sponsor', label: 'Sponsor' },
        }),
      );

      expect(Object.keys(recordTableColumns(sql, 'project'))).toEqual(
        expect.arrayContaining(['sponsorPersonId', 'sponsorCompanyId']),
      );
      expect(findFieldByName(sql, 'project', 'ownerPerson')).toBeUndefined();

      expectSuccess(instance.deleteField({ id: head.id }));

      const store = new MetadataStore(sql);

      expect(
        store.findMany('fieldMetadata', { morphId: head.morphId as string }),
      ).toEqual([]);
      expect(findFieldByName(sql, 'person', 'ownedProjects')).toBeUndefined();
      expect(Object.keys(recordTableColumns(sql, 'project'))).not.toEqual(
        expect.arrayContaining(['sponsorPersonId']),
      );
    });
  });
});

describe('relation validation', () => {
  it('rejects a relation whose join column would shadow an existing field', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const person = findObjectByName(sql, 'person');

      expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.TEXT,
          name: 'leadId',
          label: 'Lead id',
        }),
      );

      const failure = expectFailure(
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

      expect(failureCodes(failure)).toEqual(['NOT_AVAILABLE']);
      expect(findFieldByName(sql, 'person', 'ledProjects')).toBeUndefined();
    });
  });
});
