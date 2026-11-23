import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { CreateGlobalRecordCommand } from '@/command-menu-item/engine-command/record/no-selection/components/CreateGlobalRecordCommand';
import { CreateNewIndexRecordNoSelectionRecordCommand } from '@/command-menu-item/engine-command/record/no-selection/components/CreateNewIndexRecordNoSelectionRecordCommand';
import { getRecordCreationCommandType } from '@/command-menu-item/engine-command/record/no-selection/utils/getRecordCreationCommandType';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'crm-shared/utils';
import { doNotTranslate } from 'crm-shared/i18n';

export const CreateNewRecordCommand = () => {
  const {
    objectMetadataItem: contextObjectMetadataItem,
    recordIndexId,
    hasAnySoftDeleteFilterOnView,
    creationTargetObjectMetadataId,
  } = useHeadlessCommandContextApi();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const objectMetadataItem = isDefined(creationTargetObjectMetadataId)
    ? objectMetadataItems.find(
        (item) => item.id === creationTargetObjectMetadataId,
      )
    : contextObjectMetadataItem;

  if (!isDefined(objectMetadataItem)) {
    throw new Error(
      doNotTranslate('Object metadata item is required to create a record'),
    );
  }

  const commandType = getRecordCreationCommandType({
    objectNameSingular: objectMetadataItem.nameSingular,
    contextObjectMetadataId: contextObjectMetadataItem?.id,
    recordIndexId,
    hasAnySoftDeleteFilterOnView,
    creationTargetObjectMetadataId,
  });

  return commandType === 'global' ? (
    <CreateGlobalRecordCommand objectMetadataItem={objectMetadataItem} />
  ) : (
    <CreateNewIndexRecordNoSelectionRecordCommand />
  );
};
