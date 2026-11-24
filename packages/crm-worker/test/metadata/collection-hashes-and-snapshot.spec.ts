import { FieldMetadataType } from 'crm-shared/types';
import { describe, expect, it } from 'vitest';

import { METADATA_COLLECTION_NAMES } from '@/workspace/metadata/constants/metadata-collection-names.constant';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import {
  createProjectObject,
  expectFailure,
  expectSuccess,
  findObjectByName,
} from '../utils/metadata-test.util';

const hashByCollection = (hashes: { collectionName: string; hash: string }[]) =>
  Object.fromEntries(
    hashes.map(({ collectionName, hash }) => [collectionName, hash]),
  );

describe('collection hashes', () => {
  it('reports every collection FindMinimalMetadata lists', async () => {
    await runInNewWorkspace((_state, instance) => {
      expect(
        instance
          .getCollectionHashes()
          .map(({ collectionName }) => collectionName),
      ).toEqual([...METADATA_COLLECTION_NAMES]);
    });
  });

  it('changes the hashes of touched collections only', async () => {
    await runInNewWorkspace((_state, instance) => {
      const project = createProjectObject(instance);
      const before = hashByCollection(instance.getCollectionHashes());

      expectSuccess(
        instance.createField({
          objectMetadataId: project.id,
          type: FieldMetadataType.TEXT,
          name: 'code',
          label: 'Code',
          isUnique: true,
        }),
      );

      const after = hashByCollection(instance.getCollectionHashes());

      expect(after.fieldMetadata).not.toBe(before.fieldMetadata);
      expect(after.index).not.toBe(before.index);
      expect(after.objectMetadata).toBe(before.objectMetadata);
      expect(after.view).toBe(before.view);
    });
  });

  it('marks collections changed by foreign key cascades', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const project = createProjectObject(instance);

      sql.exec(
        `INSERT INTO "meta_view" ("id", "name", "objectMetadataId", "type", "key", "icon", "position", "isCompact", "openRecordIn", "createdAt", "updatedAt", "visibility", "shouldHideEmptyGroups", "isActive", "isSystemSideEffect", "kanbanColumnWidth", "groupLoadLimit", "universalIdentifier", "applicationId") VALUES ('view-1', 'All', ?, 'TABLE', NULL, 'IconList', 0, 0, 'SIDE_PANEL', '', '', 'WORKSPACE', 0, 1, 0, 300, 20, 'view-1', 'app')`,
        project.id,
      );

      const before = hashByCollection(instance.getCollectionHashes());

      expectSuccess(instance.deleteObject({ id: project.id }));

      expect(hashByCollection(instance.getCollectionHashes()).view).not.toBe(
        before.view,
      );
    });
  });

  it('leaves hashes alone when an operation fails', async () => {
    await runInNewWorkspace(({ storage: { sql } }, instance) => {
      const before = instance.getCollectionHashes();
      const person = findObjectByName(sql, 'person');

      expectFailure(instance.deleteObject({ id: person?.id as string }));

      expect(instance.getCollectionHashes()).toEqual(before);
    });
  });
});

describe('metadata snapshot', () => {
  it('describes objects with their fields, indexes and search fields', async () => {
    await runInNewWorkspace((_state, instance) => {
      const person = instance
        .getMetadataSnapshot()
        .objects.find((object) => object.nameSingular === 'person');

      expect(person?.fields.map((field) => field.name)).toEqual(
        expect.arrayContaining([
          'id',
          'name',
          'emails',
          'company',
          'searchVector',
        ]),
      );
      expect(person?.indexes.some((index) => index.isUnique)).toBe(true);
      expect(person?.searchFields.length).toBeGreaterThan(0);
    });
  });

  it('is cached until the metadata changes', async () => {
    await runInNewWorkspace((_state, instance) => {
      const first = instance.getMetadataSnapshot();

      expect(instance.getMetadataSnapshot()).toBe(first);

      createProjectObject(instance);

      const second = instance.getMetadataSnapshot();

      expect(second).not.toBe(first);
      expect(second.version).not.toBe(first.version);
      expect(second.objects.map((object) => object.nameSingular)).toContain(
        'project',
      );
    });
  });

  it('is reachable over RPC', async () => {
    const { env } = await import('cloudflare:test');
    const stub = env.WORKSPACE.get(env.WORKSPACE.idFromName('snapshot-rpc'));
    const snapshot = await stub.getMetadataSnapshot();

    expect(snapshot.objects).toHaveLength(10);
  });
});
