import { type ObjectRecordsPermissions } from 'crm-shared/types';

export type ObjectPermissionsByObjectMetadataId = Record<
  string,
  ObjectRecordsPermissions
>;
