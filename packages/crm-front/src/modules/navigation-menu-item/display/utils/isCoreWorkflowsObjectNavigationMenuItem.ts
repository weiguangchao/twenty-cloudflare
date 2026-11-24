import {
  StandardObjectNameSingular,
  NavigationMenuItemType,
} from 'crm-shared/types';

export const isCoreWorkflowsObjectNavigationMenuItem = ({
  navigationMenuItemType,
  objectNameSingular,
}: {
  navigationMenuItemType?: NavigationMenuItemType;
  objectNameSingular?: string | null;
}) =>
  navigationMenuItemType === NavigationMenuItemType.OBJECT &&
  objectNameSingular === StandardObjectNameSingular.Workflow;
