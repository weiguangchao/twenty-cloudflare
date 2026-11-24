import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { FieldMetadataType } from 'crm-shared/types';
import { isSearchableFieldType } from 'crm-shared/utils';

export const canBeSearchable = (
  field: Pick<FieldMetadataItem, 'type' | 'name'>,
) =>
  isSearchableFieldType(field.type) &&
  field.type !== FieldMetadataType.UUID &&
  field.name !== 'id';
