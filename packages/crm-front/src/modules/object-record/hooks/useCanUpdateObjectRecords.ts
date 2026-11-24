import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { canReachSomeRecords } from 'crm-shared/utils';

export const useCanUpdateObjectRecords = (objectNameSingular: string) => {
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular,
  });

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  return {
    canUpdateSomeRecords: canReachSomeRecords({
      objectRecordsPermissions: objectPermissions,
      operationType: 'update',
    }),
  };
};
