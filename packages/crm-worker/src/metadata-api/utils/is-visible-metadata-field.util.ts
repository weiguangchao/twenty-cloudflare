import { isMorphRelationHead } from 'crm-shared/utils';

import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';

export const isVisibleMetadataField = (
  field: Pick<FieldMetadataRow, 'type' | 'morphId' | 'universalIdentifier'>,
) => field.type !== 'MORPH_RELATION' || isMorphRelationHead(field);
