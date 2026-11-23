import { createStore } from 'jotai';

import {
  type CurrentUserWorkspace,
  currentUserWorkspaceState,
} from '@/auth/states/currentUserWorkspaceState';
import { objectPermissionsByObjectMetadataIdSelector } from '@/object-metadata/states/objectPermissionsByObjectMetadataIdSelector';
import { PermissionFlagType } from '~/generated-metadata/graphql';

const COMPANY_OBJECT_RECORDS_PERMISSIONS: CurrentUserWorkspace['objectRecordsPermissions'][number] =
  {
    objectMetadataId: 'company-object-metadata-id',
    canCreateAllRecords: false,
    canReadAllRecords: true,
    canUpdateAllRecords: false,
    canSoftDeleteAllRecords: false,
    canDestroyAllRecords: false,
    unreadableFields: [],
    uneditableFields: ['company-name-field-metadata-id'],
  };

const buildCurrentUserWorkspace = (
  objectRecordsPermissions: CurrentUserWorkspace['objectRecordsPermissions'],
): CurrentUserWorkspace => ({
  permissionFlags: [],
  twoFactorAuthenticationMethodSummary: [],
  objectRecordsPermissions,
  isImpersonating: false,
});

describe('objectPermissionsByObjectMetadataIdSelector', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should be empty while the current user workspace is not loaded', () => {
    const store = createStore();

    store.set(currentUserWorkspaceState.atom, null);

    expect(store.get(objectPermissionsByObjectMetadataIdSelector.atom)).toEqual(
      {},
    );
  });

  it('should index the permissions of the current user by object metadata id', () => {
    const store = createStore();

    store.set(
      currentUserWorkspaceState.atom,
      buildCurrentUserWorkspace([COMPANY_OBJECT_RECORDS_PERMISSIONS]),
    );

    expect(store.get(objectPermissionsByObjectMetadataIdSelector.atom)).toEqual(
      {
        'company-object-metadata-id': {
          canCreateAllRecords: false,
          canReadAllRecords: true,
          canUpdateAllRecords: false,
          canSoftDeleteAllRecords: false,
          canDestroyAllRecords: false,
          unreadableFields: [],
          uneditableFields: ['company-name-field-metadata-id'],
        },
      },
    );
  });

  it('should keep the same map when only the permission flags change', () => {
    const store = createStore();

    store.set(
      currentUserWorkspaceState.atom,
      buildCurrentUserWorkspace([COMPANY_OBJECT_RECORDS_PERMISSIONS]),
    );

    const initialObjectPermissionsByObjectMetadataId = store.get(
      objectPermissionsByObjectMetadataIdSelector.atom,
    );

    store.set(currentUserWorkspaceState.atom, {
      ...buildCurrentUserWorkspace([{ ...COMPANY_OBJECT_RECORDS_PERMISSIONS }]),
      permissionFlags: [PermissionFlagType.DATA_MODEL],
    });

    expect(store.get(objectPermissionsByObjectMetadataIdSelector.atom)).toBe(
      initialObjectPermissionsByObjectMetadataId,
    );
  });
});
