import { MAIN_CONTEXT_STORE_INSTANCE_ID } from '@/context-store/constants/MainContextStoreInstanceId';
import { contextStoreCurrentObjectMetadataItemIdComponentState } from '@/context-store/states/contextStoreCurrentObjectMetadataItemIdComponentState';
import { useIsSettingsDrawer } from '@/navigation/hooks/useIsSettingsDrawer';
import { useIsSettingsPage } from '@/navigation/hooks/useIsSettingsPage';
import { currentMobileNavigationDrawerState } from '@/navigation/states/currentMobileNavigationDrawerState';
import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { useOpenRecordsSearchPageInSidePanel } from '@/side-panel/hooks/useOpenRecordsSearchPageInSidePanel';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useLingui } from '@lingui/react/macro';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppPath } from 'crm-shared/types';
import { isDefined } from 'crm-shared/utils';
import { type IconComponent, IconHome, IconSearch } from 'crm-ui/icon';

type MobileNavigationBarItemName = 'home' | 'search';

type MobileNavigationBarItem = {
  name: MobileNavigationBarItemName;
  label: string;
  Icon: IconComponent;
  onClick: () => void;
};

export const useMobileNavigationBarItems = (): {
  items: MobileNavigationBarItem[];
  activeItemName: MobileNavigationBarItemName | '';
} => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { closeSidePanelMenu } = useSidePanelMenu();
  const { openRecordsSearchPage } = useOpenRecordsSearchPageInSidePanel();
  const isSettingsPage = useIsSettingsPage();
  const isSettingsDrawer = useIsSettingsDrawer();
  const { alphaSortedActiveNonSystemObjectMetadataItems } =
    useFilteredObjectMetadataItems();

  const setContextStoreCurrentObjectMetadataItemId = useSetAtomComponentState(
    contextStoreCurrentObjectMetadataItemIdComponentState,
    MAIN_CONTEXT_STORE_INSTANCE_ID,
  );
  const setCurrentMobileNavigationDrawer = useSetAtomState(
    currentMobileNavigationDrawerState,
  );
  const setIsNavigationDrawerExpanded = useSetAtomState(
    isNavigationDrawerExpandedState,
  );

  // Expansion state is shared with the desktop drawer, so a tap outside settings must not collapse it.
  const closeSettingsDrawer = () => {
    if (!isSettingsDrawer) {
      return;
    }

    setCurrentMobileNavigationDrawer('main');
    setIsNavigationDrawerExpanded(false);
  };

  return {
    activeItemName: pathname === AppPath.Home ? 'home' : '',
    items: [
      {
        name: 'home',
        label: t`Home`,
        Icon: IconHome,
        onClick: () => {
          closeSidePanelMenu();
          closeSettingsDrawer();
          // Replace like desktop so going back doesn't land in the settings just left.
          navigate(AppPath.Home, { replace: isSettingsDrawer });
        },
      },
      {
        name: 'search',
        label: t`Search`,
        Icon: IconSearch,
        onClick: () => {
          closeSidePanelMenu();
          closeSettingsDrawer();

          if (isSettingsPage) {
            const firstObjectMetadataItem =
              alphaSortedActiveNonSystemObjectMetadataItems[0];
            if (isDefined(firstObjectMetadataItem)) {
              setContextStoreCurrentObjectMetadataItemId(
                firstObjectMetadataItem.id,
              );
            }
          }

          openRecordsSearchPage();
        },
      },
    ],
  };
};
