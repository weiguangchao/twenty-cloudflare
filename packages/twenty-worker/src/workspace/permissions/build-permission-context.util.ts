import { CORE_PERMISSION_FLAGS } from '@/workspace/permissions/core-permission-flags.constant';
import { resolveObjectPermissionValue } from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';

import { type MetadataStore } from '@/workspace/metadata/storage/metadata-store';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';

export const buildPermissionContext = (
  store: MetadataStore,
  userWorkspaceId: string,
): PermissionContext => {
  const roles = store
    .findMany('roleTarget', { userWorkspaceId })
    .map((target) => store.findById('role', target.roleId))
    .filter(isDefined);
  const fields = store.findMany('fieldMetadata');
  const objectPermissions = store.findMany('objectPermission');
  const fieldPermissions = store.findMany('fieldPermission');
  const flags = store
    .findMany('permissionFlag')
    .filter((flag) => CORE_PERMISSION_FLAGS.includes(flag.key));
  const grants = store.findMany('rolePermissionFlag');
  const roleFlags = new Map(
    roles.map((role) => [
      role.id,
      new Set(
        flags
          .filter(
            (flag) =>
              (flag.permissionType === 'tool'
                ? role.canAccessAllTools
                : role.canUpdateAllSettings) ||
              grants.some(
                (grant) =>
                  grant.roleId === role.id &&
                  grant.permissionFlagId === flag.id,
              ),
          )
          .map((flag) => flag.key),
      ),
    ]),
  );

  return {
    userWorkspaceId,
    roleIds: roles.map((role) => role.id),
    canUpdateAllSettings: roles.some((role) => role.canUpdateAllSettings),
    permissionFlags: [
      ...new Set([...roleFlags.values()].flatMap((keys) => [...keys])),
    ],
    objectRecordsPermissions: store.findMany('objectMetadata').map((object) => {
      const objectFields = fields.filter(
        (field) => field.objectMetadataId === object.id,
      );
      const perRole = roles.map((role) => {
        const overrides = objectPermissions.find(
          (permission) =>
            permission.roleId === role.id &&
            permission.objectMetadataId === object.id,
        );
        const resolve = (
          override: boolean | null | undefined,
          fallback: boolean,
        ) =>
          resolveObjectPermissionValue({
            objectValue: override,
            hasAllObjectsPermission: fallback,
            isSystemObject: object.isSystem,
          });
        const canManageMembers = roleFlags
          .get(role.id)!
          .has('WORKSPACE_MEMBERS');
        const unreadable = new Set<string>();
        const uneditable = new Set<string>();
        for (const permission of fieldPermissions.filter(
          (permission) =>
            permission.roleId === role.id &&
            permission.objectMetadataId === object.id &&
            !permission.rowLevelPermissionPredicateGroupId,
        )) {
          const field = objectFields.find(
            (field) => field.id === permission.fieldMetadataId,
          );
          if (!field) continue;
          const relatedFields = field.morphId
            ? objectFields.filter(
                (candidate) => candidate.morphId === field.morphId,
              )
            : [field];
          for (const relatedField of relatedFields) {
            const cannotRead =
              permission.canReadFieldValue === false &&
              relatedField.id !== object.labelIdentifierFieldMetadataId;
            if (cannotRead) unreadable.add(relatedField.id);
            if (cannotRead || permission.canUpdateFieldValue === false)
              uneditable.add(relatedField.id);
          }
        }
        return {
          canCreateAllRecords:
            object.nameSingular === 'workspaceMember'
              ? canManageMembers
              : resolve(
                  overrides?.canCreateObjectRecords ??
                    overrides?.canUpdateObjectRecords,
                  role.canCreateAllObjectRecords,
                ),
          canReadAllRecords:
            object.nameSingular === 'workspaceMember' ||
            resolve(
              overrides?.canReadObjectRecords,
              role.canReadAllObjectRecords,
            ),
          canUpdateAllRecords:
            object.nameSingular === 'workspaceMember'
              ? canManageMembers
              : resolve(
                  overrides?.canUpdateObjectRecords,
                  role.canUpdateAllObjectRecords,
                ),
          canSoftDeleteAllRecords:
            object.nameSingular === 'workspaceMember'
              ? canManageMembers
              : resolve(
                  overrides?.canSoftDeleteObjectRecords,
                  role.canSoftDeleteAllObjectRecords,
                ),
          canDestroyAllRecords:
            object.nameSingular === 'workspaceMember'
              ? canManageMembers
              : resolve(
                  overrides?.canDestroyObjectRecords,
                  role.canDestroyAllObjectRecords,
                ),
          unreadable,
          uneditable,
        };
      });
      const unreadableFields = objectFields
        .filter(
          (field) =>
            perRole.length > 0 &&
            perRole.every((permission) => permission.unreadable.has(field.id)),
        )
        .map((field) => field.id);
      const uneditableFields = objectFields
        .filter(
          (field) =>
            field.isUIReadOnly ||
            (perRole.length > 0 &&
              perRole.every((permission) =>
                permission.uneditable.has(field.id),
              )),
        )
        .map((field) => field.id);
      return {
        objectMetadataId: object.id,
        canCreateAllRecords: perRole.some(
          (permission) => permission.canCreateAllRecords,
        ),
        canReadAllRecords: perRole.some(
          (permission) => permission.canReadAllRecords,
        ),
        canUpdateAllRecords: perRole.some(
          (permission) => permission.canUpdateAllRecords,
        ),
        canSoftDeleteAllRecords: perRole.some(
          (permission) => permission.canSoftDeleteAllRecords,
        ),
        canDestroyAllRecords: perRole.some(
          (permission) => permission.canDestroyAllRecords,
        ),
        unreadableFields,
        uneditableFields,
        restrictedFields: Object.fromEntries(
          uneditableFields.map((id) => [
            id,
            {
              canRead: unreadableFields.includes(id) ? (false as const) : null,
              canUpdate: false as const,
            },
          ]),
        ),
        rowLevelRecordsPermissions: null,
      };
    }),
  };
};
