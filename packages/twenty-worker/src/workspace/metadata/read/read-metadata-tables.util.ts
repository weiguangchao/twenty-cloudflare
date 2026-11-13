import { METADATA_TABLE_DEFINITIONS } from '@/workspace/metadata/constants/metadata-table-definitions.constant';
import { type MetadataReadTables } from '@/workspace/metadata/read/types/metadata-read-model.type';
import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';

export const readMetadataTables = (store: MetadataStore): MetadataReadTables =>
  Object.fromEntries(
    METADATA_TABLE_DEFINITIONS.map(({ entityName }) => [
      entityName,
      store.findMany(entityName),
    ]),
  ) as MetadataReadTables;
