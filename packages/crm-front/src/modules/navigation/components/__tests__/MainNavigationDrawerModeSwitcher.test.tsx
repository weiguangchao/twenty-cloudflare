import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { IconHome, IconSettings } from 'crm-ui/icon';

import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { MainNavigationDrawerModeSwitcher } from '@/navigation/components/MainNavigationDrawerModeSwitcher';
import { useActiveNavigationDrawerMode } from '@/navigation/hooks/useActiveNavigationDrawerMode';
import { useNavigationDrawerModes } from '@/navigation/hooks/useNavigationDrawerModes';
import { useSwitchNavigationDrawerMode } from '@/navigation/hooks/useSwitchNavigationDrawerMode';
import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import { NAVIGATION_DRAWER_TABS } from '@/ui/navigation/states/navigationDrawerTabs';

jest.mock('@/navigation/hooks/useActiveNavigationDrawerMode');
jest.mock('@/navigation/hooks/useNavigationDrawerModes');
jest.mock('@/navigation/hooks/useSwitchNavigationDrawerMode');
jest.mock(
  '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded',
);

const switchMode = jest.fn();
const renderSwitcher = (editing = false) => {
  const store = createStore();
  store.set(isLayoutCustomizationModeEnabledState.atom, editing);
  return render(
    <I18nProvider i18n={i18n}>
      <Provider store={store}>
        <MainNavigationDrawerModeSwitcher />
      </Provider>
    </I18nProvider>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useActiveNavigationDrawerMode)
    .mockReturnValue(NAVIGATION_DRAWER_TABS.NAVIGATION_MENU);
  jest.mocked(useIsNavigationDrawerContentExpanded).mockReturnValue(true);
  jest
    .mocked(useSwitchNavigationDrawerMode)
    .mockReturnValue({ switchNavigationDrawerMode: switchMode });
  jest.mocked(useNavigationDrawerModes).mockReturnValue([
    {
      mode: NAVIGATION_DRAWER_TABS.NAVIGATION_MENU,
      label: 'Home',
      Icon: IconHome,
    },
    {
      mode: NAVIGATION_DRAWER_TABS.SETTINGS,
      label: 'Settings',
      Icon: IconSettings,
    },
  ]);
});

it('opens Settings from the workspace navigation', async () => {
  renderSwitcher();
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(switchMode).toHaveBeenCalledWith(NAVIGATION_DRAWER_TABS.SETTINGS);
});

it('keeps Settings disabled while a layout is being edited', async () => {
  renderSwitcher(true);
  const button = screen.getByRole('button', { name: 'Settings' });
  expect(button).toHaveAttribute('aria-disabled', 'true');
  await userEvent.click(button);
  expect(switchMode).not.toHaveBeenCalled();
});
