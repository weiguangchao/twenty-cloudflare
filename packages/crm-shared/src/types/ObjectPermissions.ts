export type ObjectPermissions = {
  canCreateObjectRecords: boolean;
  canReadObjectRecords: boolean;
  canUpdateObjectRecords: boolean;
  canSoftDeleteObjectRecords: boolean;
  canDestroyObjectRecords: boolean;
  unreadableFields: string[];
  uneditableFields: string[];
};
