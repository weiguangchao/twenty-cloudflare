import { StandardObjectNameSingular } from 'crm-shared/types';
import { isDefined } from 'crm-shared/utils';

export const getRecordCreationCommandType = ({
  objectNameSingular,
  creationTargetObjectMetadataId,
  contextObjectMetadataId,
  recordIndexId,
  hasAnySoftDeleteFilterOnView = false,
}: {
  objectNameSingular: string;
  hasAnySoftDeleteFilterOnView?: boolean;
  contextObjectMetadataId?: string | null;
  recordIndexId?: string | null;
  creationTargetObjectMetadataId?: string | null;
}): 'workflow' | 'global' | 'index' => {
  if (objectNameSingular === StandardObjectNameSingular.Workflow) {
    return 'workflow';
  }

  if (!isDefined(creationTargetObjectMetadataId)) {
    return 'index';
  }

  return creationTargetObjectMetadataId === contextObjectMetadataId &&
    isDefined(recordIndexId) &&
    !hasAnySoftDeleteFilterOnView
    ? 'index'
    : 'global';
};
