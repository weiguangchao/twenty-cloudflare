import { useParams } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { WorkspaceRouteUnavailable } from '@/ui/layout/page/components/WorkspaceRouteUnavailable';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import {
  type RecordShowPageParameters,
  RecordShowPageContent,
} from '~/pages/object-record/RecordShowPageContent';

export const RecordShowPage = () => {
  const parameters = useParams<RecordShowPageParameters>();
  const workspaceSurface = useWorkspaceSurface();
  const { objectMetadataItems } = useObjectMetadataItems();

  const isInSidePanel = workspaceSurface.type === 'side-panel';
  const isRouteObjectMetadataAvailable =
    isDefined(parameters.objectNameSingular) &&
    objectMetadataItems.some(
      (objectMetadataItem) =>
        objectMetadataItem.nameSingular === parameters.objectNameSingular,
    );

  if (isInSidePanel && !isRouteObjectMetadataAvailable) {
    return <WorkspaceRouteUnavailable />;
  }

  return <RecordShowPageContent parameters={parameters} />;
};
