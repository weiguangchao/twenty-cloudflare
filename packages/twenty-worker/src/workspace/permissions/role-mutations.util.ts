import { CORE_PERMISSION_FLAGS } from '@/workspace/permissions/core-permission-flags.constant';
import { isPlainObject, isValidUuid } from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { getWorkspaceMember } from '@/workspace/lifecycle/workspace-members.util';
import { createUiMetadataRow } from '@/workspace/metadata/operations/utils/create-ui-metadata-row.util';
import { type MetadataOperationContext } from '@/workspace/metadata/types/metadata-operation-context.type';
import { type MetadataRow } from '@/workspace/metadata/types/metadata-row.type';
import { type PermissionContext } from '@/workspace/permissions/types/permission-context.type';

export const ROLE_MUTATIONS = [
  'createOneRole',
  'updateOneRole',
  'deleteOneRole',
  'upsertObjectPermissions',
  'upsertFieldPermissions',
  'upsertPermissionFlags',
  'updateWorkspaceMemberRole',
];

const inputObject = (input: unknown): Record<string, unknown> => {
  if (!isPlainObject(input)) throw apiError('Invalid role input');
  return input;
};
const BOOLEAN_KEYS = [
  'canUpdateAllSettings',
  'canAccessAllTools',
  'canAccessAllAgentChatChannels',
  'canReadAllObjectRecords',
  'canUpdateAllObjectRecords',
  'canSoftDeleteAllObjectRecords',
  'canDestroyAllObjectRecords',
  'canBeAssignedToUsers',
  'canBeAssignedToAgents',
  'canBeAssignedToApiKeys',
];
const rolePatch = (input: Record<string, unknown>) => {
  const patch: Partial<MetadataRow<'role'>> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'id') continue;
    if (BOOLEAN_KEYS.includes(key)) {
      if (typeof value !== 'boolean') throw apiError(`Invalid ${key}`);
    } else if (['label', 'description', 'icon'].includes(key)) {
      if (
        value !== null &&
        (typeof value !== 'string' ||
          value.length > (key === 'description' ? 2000 : 255))
      )
        throw apiError(`Invalid ${key}`);
      if (key === 'label' && (typeof value !== 'string' || !value.trim()))
        throw apiError('Role label is required');
    } else throw apiError(`Unsupported role property: ${key}`);
    Object.assign(patch, {
      [key]: key === 'label' ? (value as string).trim() : value,
    });
  }
  if ('canUpdateAllObjectRecords' in patch)
    patch.canCreateAllObjectRecords = patch.canUpdateAllObjectRecords;
  return patch;
};

const validateRole = (
  context: MetadataOperationContext,
  role: MetadataRow<'role'>,
) => {
  if (
    context.store
      .findMany('role')
      .some(
        (existing) => existing.id !== role.id && existing.label === role.label,
      )
  )
    throw apiError('A role with this label already exists');
  if (
    !role.canReadAllObjectRecords &&
    (role.canUpdateAllObjectRecords ||
      role.canSoftDeleteAllObjectRecords ||
      role.canDestroyAllObjectRecords)
  )
    throw apiError('Write permissions require read access');
};

export const requireAnotherAdministrator = (
  context: MetadataOperationContext,
  userWorkspaceId: string,
) => {
  const targets = context.store.findMany('roleTarget');
  const adminRoles = context.store
    .findMany('role')
    .filter((role) => role.canUpdateAllSettings);
  if (
    !targets.some(
      (target) =>
        target.userWorkspaceId === userWorkspaceId &&
        adminRoles.some((role) => role.id === target.roleId),
    )
  )
    return;
  const otherAdmin = targets.some(
    (target) =>
      target.userWorkspaceId &&
      target.userWorkspaceId !== userWorkspaceId &&
      adminRoles.some((role) => role.id === target.roleId),
  );
  if (!otherAdmin)
    throw apiError('The workspace must retain an administrator', 'FORBIDDEN');
};

export const executeRoleMutation = (
  context: MetadataOperationContext,
  name: string,
  arguments_: Record<string, unknown>,
  permissions: PermissionContext,
) => {
  const { store } = context;
  if (!permissions.permissionFlags.includes('ROLES'))
    throw apiError('Permission denied', 'FORBIDDEN', 'PERMISSION_DENIED');
  if (name === 'createOneRole') {
    const input = inputObject(arguments_.createRoleInput);
    const patch = rolePatch(input);
    if (!patch.label) throw apiError('Role label is required');
    if (
      input.id !== undefined &&
      (typeof input.id !== 'string' || !isValidUuid(input.id))
    )
      throw apiError('Invalid role ID');
    const role = createUiMetadataRow('role', {
      ...patch,
      ...(typeof input.id === 'string' ? { id: input.id } : {}),
      isEditable: true,
      canBeAssignedToUsers: patch.canBeAssignedToUsers ?? true,
      canBeAssignedToAgents: patch.canBeAssignedToAgents ?? true,
      canBeAssignedToApiKeys: patch.canBeAssignedToApiKeys ?? true,
    });
    if (store.findById('role', role.id)) throw apiError('Role already exists');
    validateRole(context, role);
    store.insert('role', role);
    return role;
  }
  if (name === 'updateWorkspaceMemberRole') {
    const memberId = String(arguments_.workspaceMemberId);
    const membership = inputObject(arguments_.targetIdentity);
    const targetIdentity = {
      workspaceMemberId: memberId,
      userWorkspaceId: String(membership.userWorkspaceId),
    };
    const member = getWorkspaceMember(context.sql, targetIdentity);
    if (!member || member.userId !== membership.userId)
      throw apiError('Workspace member not found', 'NOT_FOUND');
    const role = store.findById('role', String(arguments_.roleId));
    if (!role?.canBeAssignedToUsers)
      throw apiError('Role cannot be assigned to users');
    if (!role.canUpdateAllSettings)
      requireAnotherAdministrator(context, targetIdentity.userWorkspaceId);
    store.delete(
      'roleTarget',
      store
        .findMany('roleTarget', {
          userWorkspaceId: targetIdentity.userWorkspaceId,
        })
        .map((target) => target.id),
    );
    store.insert(
      'roleTarget',
      createUiMetadataRow('roleTarget', {
        roleId: role.id,
        userWorkspaceId: targetIdentity.userWorkspaceId,
        applicationId: role.applicationId,
      }),
    );
    return { ...member, roles: [role] };
  }
  const input =
    name === 'updateOneRole'
      ? inputObject(arguments_.updateRoleInput)
      : name === 'deleteOneRole'
        ? arguments_
        : inputObject(
            arguments_[
              name === 'upsertObjectPermissions'
                ? 'upsertObjectPermissionsInput'
                : name === 'upsertFieldPermissions'
                  ? 'upsertFieldPermissionsInput'
                  : 'upsertPermissionFlagsInput'
            ],
          );
  const role = store.findById('role', String(input.roleId ?? input.id));
  if (!role) throw apiError('Role not found', 'NOT_FOUND');
  if (!role.isEditable) throw apiError('Role cannot be edited', 'FORBIDDEN');
  if (name === 'updateOneRole') {
    const patch = rolePatch(inputObject(input.update));
    if (
      patch.canBeAssignedToUsers === false &&
      store
        .findMany('roleTarget', { roleId: role.id })
        .some((target) => target.userWorkspaceId)
    )
      throw apiError('Role is assigned to users');
    if (
      patch.canBeAssignedToUsers === false &&
      context.sql
        .exec(
          'SELECT 1 FROM "sys_workspaceSettings" WHERE "defaultRoleId" = ?',
          role.id,
        )
        .toArray().length
    )
      throw apiError('The default role must be assignable to users');
    if (
      role.canUpdateAllSettings &&
      patch.canUpdateAllSettings === false &&
      store
        .findMany('roleTarget', { roleId: role.id })
        .some((target) => target.userWorkspaceId) &&
      !store
        .findMany('roleTarget')
        .some(
          (target) =>
            target.userWorkspaceId &&
            target.roleId !== role.id &&
            store.findById('role', target.roleId)?.canUpdateAllSettings,
        )
    )
      throw apiError('The workspace must retain an administrator', 'FORBIDDEN');
    validateRole(context, { ...role, ...patch });
    store.update('role', role.id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    return store.findById('role', role.id);
  }
  if (name === 'deleteOneRole') {
    if (
      store.findMany('roleTarget', { roleId: role.id }).length > 0 ||
      context.sql
        .exec(
          'SELECT 1 FROM "sys_workspaceSettings" WHERE "defaultRoleId" = ?',
          role.id,
        )
        .toArray().length > 0
    )
      throw apiError('Assigned or default roles cannot be deleted');
    store.delete('role', [role.id]);
    return role.id;
  }
  if (name === 'upsertPermissionFlags') {
    if (
      !Array.isArray(input.permissionFlagKeys) ||
      input.permissionFlagKeys.length > 100
    )
      throw apiError('Invalid permission flags');
    const flags = store.findMany('permissionFlag');
    const requested = new Set(input.permissionFlagKeys);
    if (
      [...requested].some(
        (key) =>
          typeof key !== 'string' || !flags.some((flag) => flag.key === key),
      )
    )
      throw apiError('Unknown permission flag');
    if (
      [...requested].some((key) => !CORE_PERMISSION_FLAGS.includes(String(key)))
    )
      throw apiError('Permission flag is not implemented', 'NOT_IMPLEMENTED');
    store.delete(
      'rolePermissionFlag',
      store
        .findMany('rolePermissionFlag', { roleId: role.id })
        .map((grant) => grant.id),
    );
    return flags
      .filter((flag) => requested.has(flag.key))
      .map((flag) => {
        const grant = createUiMetadataRow('rolePermissionFlag', {
          roleId: role.id,
          permissionFlagId: flag.id,
        });
        store.insert('rolePermissionFlag', grant);
        return { id: grant.id, roleId: role.id, flag: flag.key };
      });
  }
  const fieldMode = name === 'upsertFieldPermissions';
  const entries = input[fieldMode ? 'fieldPermissions' : 'objectPermissions'];
  if (!Array.isArray(entries) || entries.length > 500)
    throw apiError('Invalid permissions');
  const seen = new Set<string>();
  const result = entries.map((entry) => {
    const value = inputObject(entry);
    const object = store.findById(
      'objectMetadata',
      String(value.objectMetadataId),
    );
    if (!object) throw apiError('Object not found', 'NOT_FOUND');
    const keys = fieldMode
      ? ['canReadFieldValue', 'canUpdateFieldValue']
      : [
          'canReadObjectRecords',
          'canUpdateObjectRecords',
          'canSoftDeleteObjectRecords',
          'canDestroyObjectRecords',
        ];
    const patch = Object.fromEntries(
      keys
        .filter((key) => key in value)
        .map((key) => {
          if (value[key] !== null && typeof value[key] !== 'boolean')
            throw apiError(`Invalid ${key}`);
          return [key, value[key]];
        }),
    );
    if (fieldMode) {
      if (value.rowLevelPermissionPredicateGroupId)
        throw apiError(
          'Row-level permissions are not implemented',
          'NOT_IMPLEMENTED',
        );
      const field = store.findById(
        'fieldMetadata',
        String(value.fieldMetadataId),
      );
      if (!field || field.objectMetadataId !== object.id)
        throw apiError('Field does not belong to object');
      if (seen.has(field.id)) throw apiError('Duplicate field permission');
      seen.add(field.id);
      if (
        field.id === object.labelIdentifierFieldMetadataId &&
        patch.canReadFieldValue === false
      )
        throw apiError('The label identifier must remain readable');
      const existing = store
        .findMany('fieldPermission', {
          roleId: role.id,
          fieldMetadataId: field.id,
        })
        .find((permission) => !permission.rowLevelPermissionPredicateGroupId);
      const row = createUiMetadataRow('fieldPermission', {
        ...existing,
        ...patch,
        roleId: role.id,
        fieldMetadataId: field.id,
        objectMetadataId: object.id,
        rowLevelPermissionPredicateGroupId: null,
      });
      if (existing) store.update('fieldPermission', row.id, row);
      else store.insert('fieldPermission', row);
      return row;
    }
    if (seen.has(object.id)) throw apiError('Duplicate object permission');
    seen.add(object.id);
    const existing = store.findMany('objectPermission', {
      roleId: role.id,
      objectMetadataId: object.id,
    })[0];
    const row = createUiMetadataRow('objectPermission', {
      ...existing,
      ...patch,
      ...('canUpdateObjectRecords' in patch
        ? {
            canCreateObjectRecords: patch.canUpdateObjectRecords as
              | boolean
              | null,
          }
        : {}),
      roleId: role.id,
      objectMetadataId: object.id,
    });
    if (
      !(row.canReadObjectRecords ?? role.canReadAllObjectRecords) &&
      ((row.canUpdateObjectRecords ?? role.canUpdateAllObjectRecords) ||
        (row.canSoftDeleteObjectRecords ??
          role.canSoftDeleteAllObjectRecords) ||
        (row.canDestroyObjectRecords ?? role.canDestroyAllObjectRecords))
    )
      throw apiError('Write permissions require read access');
    if (existing) store.update('objectPermission', row.id, row);
    else store.insert('objectPermission', row);
    return row;
  });
  if (!fieldMode)
    store.delete(
      'objectPermission',
      store
        .findMany('objectPermission', { roleId: role.id })
        .filter((permission) => !seen.has(permission.objectMetadataId))
        .map((permission) => permission.id),
    );
  return result;
};
