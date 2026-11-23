import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';

import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { type OrderBy, type RecordGqlOperationOrderBy } from 'crm-shared/types';
import { getOrderByForFieldMetadataType, isDefined } from 'crm-shared/utils';

export const getOrderByFieldForObjectMetadataItem = (
  objectMetadataItem: EnrichedObjectMetadataItem,
  orderBy?: OrderBy | null,
): RecordGqlOperationOrderBy => {
  const labelIdentifierFieldMetadata =
    getLabelIdentifierFieldMetadataItem(objectMetadataItem);

  if (isDefined(labelIdentifierFieldMetadata)) {
    return getOrderByForFieldMetadataType({
      field: labelIdentifierFieldMetadata,
      orderByDirection: orderBy,
    });
  }
  return [
    {
      createdAt: orderBy ?? 'DescNullsLast',
    },
  ];
};
