export type ObjectRecordsPermissions = {
  objectMetadataId: string;
  canCreateAllRecords: boolean;
  canReadAllRecords: boolean;
  canUpdateAllRecords: boolean;
  canSoftDeleteAllRecords: boolean;
  canDestroyAllRecords: boolean;
  unreadableFields: string[];
  uneditableFields: string[];
  restrictedFields: Record<string, { canRead: false | null; canUpdate: false }>;
  rowLevelRecordsPermissions: null;
};

export type PermissionContext = {
  userWorkspaceId: string;
  roleIds: string[];
  canUpdateAllSettings: boolean;
  permissionFlags: string[];
  objectRecordsPermissions: ObjectRecordsPermissions[];
};
