export type ObjectRecordsPermissions = {
  canCreateAllRecords: boolean;
  canReadAllRecords: boolean;
  canUpdateAllRecords: boolean;
  canSoftDeleteAllRecords: boolean;
  canDestroyAllRecords: boolean;
  unreadableFields: string[];
  uneditableFields: string[];
};
