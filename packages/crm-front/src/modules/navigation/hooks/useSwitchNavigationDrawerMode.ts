import { useIsMobile } from 'crm-ui/utilities';
import { useNavigate } from 'react-router-dom';
import { SettingsPath } from 'crm-shared/types';
import { useActiveNavigationDrawerMode } from '@/navigation/hooks/useActiveNavigationDrawerMode';
import { useDefaultHomePagePath } from '@/navigation/hooks/useDefaultHomePagePath';
import { useIsSettingsDrawer } from '@/navigation/hooks/useIsSettingsDrawer';
import { useIsSettingsPage } from '@/navigation/hooks/useIsSettingsPage';
import { currentMobileNavigationDrawerState } from '@/navigation/states/currentMobileNavigationDrawerState';
import { getNavigationDrawerHomeDestination } from '@/navigation/utils/getNavigationDrawerHomeDestination';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { navigationDrawerActiveTabState } from '@/ui/navigation/states/navigationDrawerActiveTabState';
import { navigationDrawerExpandedMemorizedState } from '@/ui/navigation/states/navigationDrawerExpandedMemorizedState';
import {
  type NavigationDrawerActiveTab,
  NAVIGATION_DRAWER_TABS,
} from '@/ui/navigation/states/navigationDrawerTabs';
import { navigationMemorizedUrlState } from '@/ui/navigation/states/navigationMemorizedUrlState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

export const useSwitchNavigationDrawerMode = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const navigateSettings = useNavigateSettings();

  const activeNavigationDrawerMode = useActiveNavigationDrawerMode();
  const isSettingsDrawer = useIsSettingsDrawer();
  const isSettingsPage = useIsSettingsPage();

  const navigationMemorizedUrl = useAtomStateValue(navigationMemorizedUrlState);
  const navigationDrawerExpandedMemorized = useAtomStateValue(
    navigationDrawerExpandedMemorizedState,
  );
  const setIsNavigationDrawerExpanded = useSetAtomState(
    isNavigationDrawerExpandedState,
  );
  const setCurrentMobileNavigationDrawer = useSetAtomState(
    currentMobileNavigationDrawerState,
  );
  const setNavigationDrawerActiveTab = useSetAtomState(
    navigationDrawerActiveTabState,
  );

  const { defaultHomePagePath } = useDefaultHomePagePath();
  const switchToNavigationMenu = () => {
    setNavigationDrawerActiveTab(NAVIGATION_DRAWER_TABS.NAVIGATION_MENU);

    if (isSettingsDrawer) {
      setCurrentMobileNavigationDrawer('main');
      if (isMobile) {
        setIsNavigationDrawerExpanded(navigationDrawerExpandedMemorized);
      }
      navigate(
        getNavigationDrawerHomeDestination({
          memorizedUrl: navigationMemorizedUrl,
          defaultHomePagePath,
        }),
        { replace: true },
      );
      return;
    }
  };

  const switchNavigationDrawerMode = (mode: NavigationDrawerActiveTab) => {
    switch (mode) {
      case NAVIGATION_DRAWER_TABS.NAVIGATION_MENU:
        if (
          activeNavigationDrawerMode === NAVIGATION_DRAWER_TABS.NAVIGATION_MENU
        ) {
          return;
        }
        switchToNavigationMenu();
        break;
      case NAVIGATION_DRAWER_TABS.SETTINGS:
        // The mobile settings drawer can outlive its route (browser back), so check the page, not the drawer.
        if (isSettingsPage) {
          return;
        }
        navigateSettings(SettingsPath.ProfilePage);
        break;
    }
  };

  return { switchNavigationDrawerMode };
};
