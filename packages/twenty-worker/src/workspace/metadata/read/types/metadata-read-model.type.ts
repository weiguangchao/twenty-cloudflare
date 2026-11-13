import {
  type MetadataEntityName,
  type MetadataRow,
} from '@/workspace/metadata/types/metadata-row.type';
import { type MetadataCollectionHash } from '@/workspace/metadata/storage/metadata-collection-hashes.util';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';
import { type getWorkspaceApplications } from '@/workspace/metadata/read/workspace-applications.util';

export type MetadataReadTables = {
  [TEntityName in MetadataEntityName]: MetadataRow<TEntityName>[];
};

export type MetadataReadModel = {
  tables: MetadataReadTables;
  collectionHashes: MetadataCollectionHash[];
  permissions: PermissionContext;
  applications: ReturnType<typeof getWorkspaceApplications>;
};
