import { CUSTOM_APPLICATION_ID } from '@/workspace/metadata/constants/metadata-application-ids.constant';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import {
  type IndexFieldMetadataRow,
  type IndexMetadataRow,
} from '@/workspace/metadata/types/metadata-row.type';

type FieldRowInput = Pick<
  FieldMetadataRow,
  'objectMetadataId' | 'name' | 'label' | 'type'
> &
  Partial<FieldMetadataRow>;

export const buildFieldRow = (input: FieldRowInput): FieldMetadataRow => {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    universalIdentifier: crypto.randomUUID(),
    applicationId: CUSTOM_APPLICATION_ID,
    defaultValue: null,
    description: null,
    icon: null,
    options: null,
    settings: null,
    isActive: true,
    isSystem: false,
    isUIReadOnly: false,
    isNullable: true,
    isLabelSyncedWithName: false,
    relationTargetFieldMetadataId: null,
    relationTargetObjectMetadataId: null,
    morphId: null,
    createdAt: now,
    updatedAt: now,
    isUIEditable: true,
    isSystemSideEffect: false,
    overrides: null,
    writability: 'OPEN',
    isAuditLogged: true,
    disabledFieldPermissionActions: null,
    ...input,
  };
};

export const buildIndexRows = ({
  objectMetadataId,
  columns,
  isUnique = false,
  indexWhereClause = null,
  indexType = 'BTREE',
  isSystemSideEffect = true,
}: {
  objectMetadataId: string;
  columns: { fieldMetadataId: string; subFieldName?: string | null }[];
  isUnique?: boolean;
  indexWhereClause?: string | null;
  indexType?: 'BTREE' | 'GIN';
  isSystemSideEffect?: boolean;
}): { index: IndexMetadataRow; indexFields: IndexFieldMetadataRow[] } => {
  const now = new Date().toISOString();
  const indexId = crypto.randomUUID();
  const nameHash = crypto.randomUUID().replaceAll('-', '').slice(0, 27);

  return {
    index: {
      id: indexId,
      createdAt: now,
      updatedAt: now,
      name: `IDX_${isUnique ? 'UNIQUE_' : ''}${nameHash}`,
      objectMetadataId,
      isUnique,
      indexWhereClause,
      indexType,
      universalIdentifier: crypto.randomUUID(),
      applicationId: CUSTOM_APPLICATION_ID,
      isSystemSideEffect,
    },
    indexFields: columns.map((column, order) => ({
      id: crypto.randomUUID(),
      indexMetadataId: indexId,
      fieldMetadataId: column.fieldMetadataId,
      order,
      createdAt: now,
      updatedAt: now,
      subFieldName: column.subFieldName ?? null,
    })),
  };
};
