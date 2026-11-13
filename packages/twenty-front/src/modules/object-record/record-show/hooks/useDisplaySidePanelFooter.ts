import { type TargetRecordIdentifier } from '@/ui/layout/contexts/TargetRecordIdentifier';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
export const useDisplaySidePanelFooter = (_target: TargetRecordIdentifier) =>
  useWorkspaceSurface().type === 'side-panel';
