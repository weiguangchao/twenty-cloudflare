import { FieldMetadataType } from 'twenty-shared/types';
import { isMorphRelationHead } from 'twenty-shared/utils';

import {
  type FieldMetadataRow,
  type RelationOnDeleteAction,
} from '@/workspace/metadata/types/field-metadata-row.type';

export type FieldColumn = {
  columnName: string;
  sqlType: 'TEXT' | 'REAL' | 'INTEGER';
  references?: {
    objectMetadataId: string;
    onDelete: RelationOnDeleteAction;
  };
};

const SQL_TYPE_BY_FIELD_TYPE: Partial<
  Record<FieldMetadataType, FieldColumn['sqlType']>
> = {
  [FieldMetadataType.NUMBER]: 'REAL',
  [FieldMetadataType.NUMERIC]: 'REAL',
  [FieldMetadataType.POSITION]: 'REAL',
  [FieldMetadataType.BOOLEAN]: 'INTEGER',
};

// Column layout from CLOUDFLARE_MIGRATION.md 5.2: one TEXT column per
// composite field, join columns only on the MANY_TO_ONE side, no column for
// ONE_TO_MANY relations, morph relation heads or TS_VECTOR.
export const computeFieldColumn = (
  field: Pick<
    FieldMetadataRow,
    | 'type'
    | 'name'
    | 'settings'
    | 'morphId'
    | 'universalIdentifier'
    | 'relationTargetObjectMetadataId'
  >,
): FieldColumn | null => {
  if (field.type === FieldMetadataType.TS_VECTOR) {
    return null;
  }

  if (
    field.type === FieldMetadataType.RELATION ||
    field.type === FieldMetadataType.MORPH_RELATION
  ) {
    if (
      isMorphRelationHead(field) ||
      field.settings?.relationType !== 'MANY_TO_ONE' ||
      field.relationTargetObjectMetadataId === null
    ) {
      return null;
    }

    return {
      columnName: field.settings.joinColumnName ?? `${field.name}Id`,
      sqlType: 'TEXT',
      references: {
        objectMetadataId: field.relationTargetObjectMetadataId,
        onDelete: field.settings.onDelete ?? 'SET_NULL',
      },
    };
  }

  return {
    columnName: field.name,
    sqlType: SQL_TYPE_BY_FIELD_TYPE[field.type] ?? 'TEXT',
  };
};
