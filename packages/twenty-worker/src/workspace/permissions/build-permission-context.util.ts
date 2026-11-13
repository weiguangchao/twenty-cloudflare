import { isDefined } from 'twenty-shared/utils';

import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';

const MEMBER_PERMISSION_FLAGS = [
  'VIEWS',
  'IMPORT_CSV',
  'UPLOAD_FILE',
  'DOWNLOAD_FILE',
  'PROFILE_INFORMATION',
];
const ADMIN_PERMISSION_FLAGS = [
  'WORKSPACE',
  'WORKSPACE_MEMBERS',
  'ROLES',
  'DATA_MODEL',
  'LAYOUTS',
];

// Stage 10 replaces this role-wide policy with object and field permission evaluation.
export const buildPermissionContext = (
  store: MetadataStore,
  userWorkspaceId: string,
): PermissionContext => {
  const roles = store
    .findMany('roleTarget', { userWorkspaceId })
    .map((target) => store.findById('role', target.roleId))
    .filter(isDefined);
  const canAccessRecords = roles.length > 0;
  const canUpdateAllSettings = roles.some((role) => role.canUpdateAllSettings);
  const fields = store.findMany('fieldMetadata');

  return {
    userWorkspaceId,
    roleIds: roles.map((role) => role.id),
    canUpdateAllSettings,
    permissionFlags: canAccessRecords
      ? [
          ...MEMBER_PERMISSION_FLAGS,
          ...(canUpdateAllSettings ? ADMIN_PERMISSION_FLAGS : []),
        ]
      : [],
    objectRecordsPermissions: store.findMany('objectMetadata').map((object) => {
      const uneditableFields = fields
        .filter(
          (field) => field.objectMetadataId === object.id && field.isUIReadOnly,
        )
        .map((field) => field.id);

      return {
        objectMetadataId: object.id,
        canCreateAllRecords: canAccessRecords,
        canReadAllRecords: canAccessRecords,
        canUpdateAllRecords: canAccessRecords,
        canSoftDeleteAllRecords: canAccessRecords,
        canDestroyAllRecords: canAccessRecords,
        unreadableFields: [],
        uneditableFields,
        restrictedFields: Object.fromEntries(
          uneditableFields.map((fieldMetadataId) => [
            fieldMetadataId,
            { canRead: null, canUpdate: false as const },
          ]),
        ),
        rowLevelRecordsPermissions: null,
      };
    }),
  };
};
