import { FieldMetadataType } from 'crm-shared/types';
import { describe, expect, it } from 'vitest';

import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import {
  createProjectObject,
  expectFailure,
  expectSuccess,
  failureCodes,
} from '../utils/metadata-test.util';
import { selectRows } from '../utils/select-rows.util';

const physicalIndexSql = (sql: SqlStorage, indexName: string) =>
  selectRows(
    sql,
    `SELECT "sql" FROM sqlite_master WHERE "type" = 'index' AND "name" = ?`,
    indexName,
  )[0]?.sql;

describe('index operations', () => {
  it('creates and deletes a unique index on a composite sub-field', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const [contact] = expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.EMAILS,
          name: 'contact',
          label: 'Contact',
        }),
      );
      const index = expectSuccess(
        instance.createIndex({
          objectMetadataId: project.id,
          fields: [
            { fieldMetadataId: contact.id, subFieldName: 'primaryEmail' },
          ],
          isUnique: true,
          indexWhereClause: '"deletedAt" IS NULL',
        }),
      );

      expect(physicalIndexSql(sql, index.name)).toBe(
        `CREATE UNIQUE INDEX "${index.name}" ON "rec_project" (("contact" ->> '$.primaryEmail')) WHERE "deletedAt" IS NULL`,
      );
      sql.exec(
        `INSERT INTO "rec_project" ("id", "contact") VALUES ('a', '{"primaryEmail":"x@y.z"}')`,
      );
      expect(() =>
        sql.exec(
          `INSERT INTO "rec_project" ("id", "contact") VALUES ('b', '{"primaryEmail":"x@y.z"}')`,
        ),
      ).toThrow(/UNIQUE constraint failed/);

      expectSuccess(instance.deleteIndex({ id: index.id }));

      expect(physicalIndexSql(sql, index.name)).toBeUndefined();
      expect(
        new MetadataStore(sql).findById('indexMetadata', index.id),
      ).toBeUndefined();
    });
  });

  it('rejects indexes on fields without a column and refuses to delete system indexes', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);
      const store = new MetadataStore(sql);
      const noteTargets = store.findMany('fieldMetadata', {
        objectMetadataId: project.id,
        name: 'noteTargets',
      })[0];
      const systemIndex = store.findMany('indexMetadata', {
        objectMetadataId: project.id,
      })[0];

      expect(
        failureCodes(
          expectFailure(
            instance.createIndex({
              objectMetadataId: project.id,
              fields: [{ fieldMetadataId: noteTargets.id }],
            }),
          ),
        ),
      ).toEqual(['INVALID_INDEX_INPUT']);
      expect(
        failureCodes(
          expectFailure(instance.deleteIndex({ id: systemIndex.id })),
        ),
      ).toEqual(['INDEX_MUTATION_NOT_ALLOWED']);
    });
  });
});
