import { useLingui } from '@lingui/react/macro';
import { WorkspaceActivationStatus } from 'crm-shared/workspace';
import { type IconComponent, IconHome, IconSettings } from 'crm-ui/icon';
import { NAVIGATION_DRAWER_MODE_ORDER } from '@/navigation/constants/NavigationDrawerModeOrder';
import {
  type NavigationDrawerActiveTab,
  NAVIGATION_DRAWER_TABS,
} from '@/ui/navigation/states/navigationDrawerTabs';
import { useIsWorkspaceActivationStatusEqualsTo } from '@/workspace/hooks/useIsWorkspaceActivationStatusEqualsTo';

export type NavigationDrawerMode = {
  Icon: IconComponent;
  label: string;
  mode: NavigationDrawerActiveTab;
};

export const useNavigationDrawerModes = (): NavigationDrawerMode[] => {
  const { t } = useLingui();

  const isWorkspaceSuspended = useIsWorkspaceActivationStatusEqualsTo(
    WorkspaceActivationStatus.SUSPENDED,
  );

  // The route guard holds a suspended workspace on billing settings, so other modes would bounce back.
  if (isWorkspaceSuspended) {
    return [];
  }

  const navigationDrawerModeDisplays: Partial<
    Record<NavigationDrawerActiveTab, Omit<NavigationDrawerMode, 'mode'>>
  > = {
    [NAVIGATION_DRAWER_TABS.NAVIGATION_MENU]: {
      Icon: IconHome,
      label: t`Home`,
    },
    [NAVIGATION_DRAWER_TABS.SETTINGS]: {
      Icon: IconSettings,
      label: t`Settings`,
    },
  };

  return NAVIGATION_DRAWER_MODE_ORDER.filter(
    (mode) => mode !== NAVIGATION_DRAWER_TABS.AI_CHAT_HISTORY,
  ).map((mode) => ({ ...navigationDrawerModeDisplays[mode]!, mode }));
};
