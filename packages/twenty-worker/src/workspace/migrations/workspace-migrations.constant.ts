import { createMetadataCollectionHashTable } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { createMetadataTables } from '@/workspace/metadata/storage/create-metadata-tables.util';
import { loadStandardMetadata } from '@/workspace/metadata/seed/load-standard-metadata.util';
import { type StandardMetadataSeed } from '@/workspace/metadata/types/standard-metadata-seed.type';
import { type WorkspaceMigration } from '@/workspace/migrations/types/workspace-migration.type';
import standardMetadataSeed from '@/workspace/seed/standard-metadata.json';

export const WORKSPACE_MIGRATIONS: WorkspaceMigration[] = [
  {
    name: '0001-create-metadata-tables',
    up: (sql) => {
      createMetadataTables(sql);
      createMetadataCollectionHashTable(sql);
    },
  },
  {
    name: '0002-load-standard-metadata',
    up: (sql) =>
      loadStandardMetadata(
        sql,
        standardMetadataSeed as unknown as StandardMetadataSeed,
      ),
  },
];
