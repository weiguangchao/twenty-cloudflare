import {
  type FieldPermissionGrant,
  type ObjectPermissionGrant,
  type RolePermissionGrants,
} from '@/application/rolePermissionGrantsSchema';
import { type SyncableEntityOptions } from '@/application/syncableEntityOptionsType';

export type ObjectPermissionManifest = Partial<SyncableEntityOptions> &
  ObjectPermissionGrant;

export type FieldPermissionManifest = Partial<SyncableEntityOptions> &
  FieldPermissionGrant;

export type RoleManifest = SyncableEntityOptions &
  Omit<RolePermissionGrants, 'objectPermissions' | 'fieldPermissions'> & {
    label: string;
    description?: string;
    icon?: string;
    canBeAssignedToUsers?: boolean;
    canBeAssignedToAgents?: boolean;
    canBeAssignedToApiKeys?: boolean;
    objectPermissions?: ObjectPermissionManifest[];
    fieldPermissions?: FieldPermissionManifest[];
  };
