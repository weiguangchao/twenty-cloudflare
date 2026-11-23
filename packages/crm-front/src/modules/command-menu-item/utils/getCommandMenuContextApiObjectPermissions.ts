import {
  type CommandMenuContextApi,
  type ObjectRecordsPermissions,
} from 'crm-shared/types';
import { canReachSomeRecords } from 'crm-shared/utils';

// Stored conditional availability expressions read the legacy permission names
export const getCommandMenuContextApiObjectPermissions = ({
  objectMetadataId,
  objectRecordsPermissions,
}: {
  objectMetadataId: string;
  objectRecordsPermissions: ObjectRecordsPermissions;
}): CommandMenuContextApi['objectPermissions'] => ({
  objectMetadataId,
  canCreateObjectRecords: canReachSomeRecords({
    objectRecordsPermissions,
    operationType: 'create',
  }),
  canReadObjectRecords: canReachSomeRecords({
    objectRecordsPermissions,
    operationType: 'read',
  }),
  canUpdateObjectRecords: canReachSomeRecords({
    objectRecordsPermissions,
    operationType: 'update',
  }),
  canSoftDeleteObjectRecords: canReachSomeRecords({
    objectRecordsPermissions,
    operationType: 'softDelete',
  }),
  canDestroyObjectRecords: canReachSomeRecords({
    objectRecordsPermissions,
    operationType: 'destroy',
  }),
  unreadableFields: objectRecordsPermissions.unreadableFields,
  uneditableFields: objectRecordsPermissions.uneditableFields,
});
