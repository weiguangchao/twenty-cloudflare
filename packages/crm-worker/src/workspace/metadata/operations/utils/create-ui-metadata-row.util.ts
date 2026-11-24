import { CUSTOM_APPLICATION_ID } from '@/workspace/metadata/constants/metadata-application-ids.constant';
import { METADATA_TABLE_DEFINITIONS } from '@/workspace/metadata/constants/metadata-table-definitions.constant';
import {
  type MetadataEntityName,
  type MetadataRow,
} from '@/workspace/metadata/types/metadata-row.type';

export const createUiMetadataRow = <TEntityName extends MetadataEntityName>(
  entityName: TEntityName,
  values: Partial<MetadataRow<TEntityName>>,
): MetadataRow<TEntityName> => {
  const now = new Date().toISOString();
  const defaults: Record<string, unknown> = {
    id: crypto.randomUUID(),
    universalIdentifier: crypto.randomUUID(),
    applicationId: CUSTOM_APPLICATION_ID,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    isVisible: true,
    isSystemSideEffect: false,
  };
  const definition = METADATA_TABLE_DEFINITIONS.find(
    (definition) => definition.entityName === entityName,
  )!;
  return Object.fromEntries(
    definition.columns.map((column) => [
      column.name,
      column.name in values
        ? (values as Record<string, unknown>)[column.name]
        : column.name in defaults
          ? defaults[column.name]
          : column.isNullable
            ? null
            : column.kind === 'boolean'
              ? false
              : ['integer', 'real'].includes(column.kind)
                ? 0
                : column.kind === 'json'
                  ? {}
                  : '',
    ]),
  ) as MetadataRow<TEntityName>;
};
