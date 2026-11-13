import { printSchema } from 'graphql';
import { expect, it } from 'vitest';

import { buildMetadataSnapshot } from '@/workspace/metadata/snapshot/build-metadata-snapshot.util';
import { MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { createRecordCatalog } from '@/workspace/record-api/record-catalog.util';
import { buildRecordSchema } from '@/workspace/record-api/schema/build-record-schema.util';
import exportedSchema from '../../contract/worker-core-schema.graphql';
import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';

it('exports the same core schema as a newly created workspace', async () => {
  await runInNewWorkspace(({ storage }) => {
    const snapshot = buildMetadataSnapshot(
      new MetadataStore(storage.sql),
      'standard',
    );
    expect(
      printSchema(buildRecordSchema(createRecordCatalog(snapshot))).trim(),
    ).toBe(exportedSchema.trim());
  });
});
