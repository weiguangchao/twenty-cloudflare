import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';

export type MetadataOperationContext = {
  sql: SqlStorage;
  store: MetadataStore;
};
