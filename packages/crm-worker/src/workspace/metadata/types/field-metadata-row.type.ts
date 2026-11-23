import { type FieldMetadataType } from 'crm-shared/types';

import { type JsonValue } from '@/workspace/metadata/types/json-value.type';
import { type MetadataRow } from '@/workspace/metadata/types/metadata-row.type';

export type RelationType = 'MANY_TO_ONE' | 'ONE_TO_MANY';

export type RelationOnDeleteAction =
  | 'CASCADE'
  | 'SET_NULL'
  | 'RESTRICT'
  | 'NO_ACTION';

export type FieldMetadataSettings = {
  relationType?: RelationType;
  onDelete?: RelationOnDeleteAction;
  joinColumnName?: string;
  [key: string]: JsonValue | undefined;
};

export type FieldMetadataOption = {
  id: string;
  label: string;
  value: string;
  position: number;
  color?: string;
};

export type FieldMetadataOptionInput = Omit<
  FieldMetadataOption,
  'id' | 'position'
> &
  Partial<Pick<FieldMetadataOption, 'id' | 'position'>>;

export type FieldMetadataRow = Omit<
  MetadataRow<'fieldMetadata'>,
  'type' | 'settings' | 'options'
> & {
  type: FieldMetadataType;
  settings: FieldMetadataSettings | null;
  options: FieldMetadataOption[] | null;
};
