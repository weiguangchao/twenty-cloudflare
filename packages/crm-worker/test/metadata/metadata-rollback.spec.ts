import { FieldMetadataType } from 'crm-shared/types';
import { describe, expect, it } from 'vitest';

import { MetadataValidationException } from '@/workspace/metadata/errors/metadata-validation.exception';
import { createField } from '@/workspace/metadata/operations/create-field.operation';
import { runMetadataOperation } from '@/workspace/metadata/operations/run-metadata-operation.util';
import { getMetadataCollectionHashes } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
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
  tableExists,
} from '../utils/metadata-test.util';

const metadataRowCounts = (sql: SqlStorage) => {
  const store = new MetadataStore(sql);

  return {
    objects: store.findMany('objectMetadata').length,
    fields: store.findMany('fieldMetadata').length,
    indexes: store.findMany('indexMetadata').length,
    searchFields: store.findMany('searchFieldMetadata').length,
  };
};

describe('metadata operations roll back as a whole', () => {
  it('undoes earlier writes when validation fails later in the operation', async () => {
    await runInNewWorkspace(({ storage }, instance) => {
      const project = createProjectObject(instance);
      const countsBefore = metadataRowCounts(storage.sql);
      const hashesBefore = getMetadataCollectionHashes(storage.sql);

      const result = runMetadataOperation(storage, (context) => {
        createField(context, {
          objectMetadataId: project.id,
          type: FieldMetadataType.TEXT,
          name: 'code',
          label: 'Code',
          isUnique: true,
          isSearchable: true,
        });
        throw MetadataValidationException.single({
          metadataName: 'fieldMetadata',
          type: 'create',
          errors: [{ code: 'INVALID_FIELD_INPUT', message: 'late failure' }],
        });
      });

      expect(failureCodes(expectFailure(result))).toEqual([
        'INVALID_FIELD_INPUT',
      ]);
      expect(metadataRowCounts(storage.sql)).toEqual(countsBefore);
      expect(findFieldByName(storage.sql, 'project', 'code')).toBeUndefined();
      expect(recordTableColumns(storage.sql, 'project')).not.toHaveProperty(
        'code',
      );
      expect(getMetadataCollectionHashes(storage.sql)).toEqual(hashesBefore);
    });
  });

  it('undoes the object, its table and its relations when DDL fails midway', async () => {
    await runInNewWorkspace(({ storage }, instance) => {
      // A stray column makes the noteTarget join column for "project" collide.
      storage.sql.exec(
        'ALTER TABLE "rec_noteTarget" ADD COLUMN "targetProjectId" TEXT',
      );

      const countsBefore = metadataRowCounts(storage.sql);
      const hashesBefore = getMetadataCollectionHashes(storage.sql);

      expect(() => createProjectObject(instance)).toThrow(
        /duplicate column name/,
      );

      expect(metadataRowCounts(storage.sql)).toEqual(countsBefore);
      expect(findObjectByName(storage.sql, 'project')).toBeUndefined();
      expect(tableExists(storage.sql, 'rec_project')).toBe(false);
      expect(
        findFieldByName(storage.sql, 'timelineActivity', 'targetProject'),
      ).toBeUndefined();
      expect(
        recordTableColumns(storage.sql, 'timelineActivity'),
      ).not.toHaveProperty('targetProjectId');
      expect(getMetadataCollectionHashes(storage.sql)).toEqual(hashesBefore);
    });
  });

  it('keeps a field unchanged when its unique index cannot be built', async () => {
    await runInNewWorkspace(({ storage }, instance) => {
      const project = createProjectObject(instance);
      const [code] = expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.TEXT,
          name: 'code',
          label: 'Code',
        }),
      );

      storage.sql.exec(
        `INSERT INTO "rec_project" ("id", "code") VALUES ('a', 'X'), ('b', 'X')`,
      );

      const countsBefore = metadataRowCounts(storage.sql);
      const failure = expectFailure(
        instance.updateField({
          id: code.id,
          update: { isUnique: true, label: 'Project code' },
        }),
      );

      expect(failureCodes(failure)).toEqual(['INVALID_INDEX_INPUT']);
      expect(metadataRowCounts(storage.sql)).toEqual(countsBefore);
      expect(findFieldByName(storage.sql, 'project', 'code')?.label).toBe(
        'Code',
      );
    });
  });
});
