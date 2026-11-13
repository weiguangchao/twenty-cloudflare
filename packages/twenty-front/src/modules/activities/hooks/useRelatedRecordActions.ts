import { useAttachFileRelatedRecordAction } from '@/activities/files/hooks/useAttachFileRelatedRecordAction';
import { useCreateActivityRelatedRecordAction } from '@/activities/hooks/useCreateActivityRelatedRecordAction';
import { type ActivityTargetableObject } from '@/activities/types/ActivityTargetableEntity';
import { type RelatedRecordActionBinding } from '@/activities/types/RelatedRecordAction';
import { StandardObjectNameSingular } from 'twenty-shared/types';

type UseRelatedRecordActionsParams = {
  targetRecord: ActivityTargetableObject;
  onFileUploadComplete?: () => void;
};

export const useRelatedRecordActions = ({
  targetRecord,
  onFileUploadComplete,
}: UseRelatedRecordActionsParams): RelatedRecordActionBinding[] => {
  const taskAction = useCreateActivityRelatedRecordAction({
    targetRecord,
    activityObjectNameSingular: StandardObjectNameSingular.Task,
  });
  const noteAction = useCreateActivityRelatedRecordAction({
    targetRecord,
    activityObjectNameSingular: StandardObjectNameSingular.Note,
  });
  const fileAction = useAttachFileRelatedRecordAction({
    targetRecord,
    onUploadComplete: onFileUploadComplete,
  });

  return [taskAction, noteAction, fileAction];
};
