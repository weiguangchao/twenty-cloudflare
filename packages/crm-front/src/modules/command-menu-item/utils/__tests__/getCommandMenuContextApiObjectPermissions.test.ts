import { getCommandMenuContextApiObjectPermissions } from '@/command-menu-item/utils/getCommandMenuContextApiObjectPermissions';

describe('getCommandMenuContextApiObjectPermissions', () => {
  it('should expose the reachable records permissions under the names read by availability expressions', () => {
    expect(
      getCommandMenuContextApiObjectPermissions({
        objectMetadataId: 'person-object-metadata-id',
        objectRecordsPermissions: {
          canCreateAllRecords: false,
          canReadAllRecords: true,
          canUpdateAllRecords: true,
          canSoftDeleteAllRecords: false,
          canDestroyAllRecords: false,
          unreadableFields: [],
          uneditableFields: [],
        },
      }),
    ).toEqual({
      objectMetadataId: 'person-object-metadata-id',
      canCreateObjectRecords: false,
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
      unreadableFields: [],
      uneditableFields: [],
    });
  });
});
