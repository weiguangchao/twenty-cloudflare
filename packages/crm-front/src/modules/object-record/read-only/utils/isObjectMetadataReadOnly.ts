import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { canReachSomeRecords, isDefined } from 'crm-shared/utils';
import { type ObjectRecordsPermissions } from 'crm-shared/types';

type IsObjectMetadataReadOnlyParams = {
  objectPermissions?: ObjectRecordsPermissions;
  objectMetadataItem?: Pick<
    EnrichedObjectMetadataItem,
    'isUIEditable' | 'isRemote'
  >;
};

export const isObjectMetadataReadOnly = ({
  objectPermissions,
  objectMetadataItem,
}: IsObjectMetadataReadOnlyParams) => {
  return (
    (isDefined(objectPermissions) &&
      !canReachSomeRecords({
        objectRecordsPermissions: objectPermissions,
        operationType: 'update',
      })) ||
    (isDefined(objectMetadataItem) &&
      (!objectMetadataItem.isUIEditable || objectMetadataItem.isRemote))
  );
};
