import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, fireEvent, render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { SidePanelForDesktop } from '@/side-panel/components/SidePanelForDesktop';
import { isSidePanelClosingState } from '@/side-panel/states/isSidePanelClosingState';
import { isSidePanelOpenedState } from '@/side-panel/states/isSidePanelOpenedState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const sidePanelCloseAnimationCompleteCleanupMock = jest.fn();

jest.mock('framer-motion', () => ({
  useReducedMotion: () => false,
}));

jest.mock('@/side-panel/components/SidePanelRouter', () => ({
  SidePanelRouter: () => <div data-testid="side-panel-content" />,
}));

jest.mock('@/side-panel/components/SidePanelWidthEffect', () => ({
  SidePanelWidthEffect: () => null,
}));

jest.mock('twenty-ui/primitives/layout', () => ({
  ...jest.requireActual('twenty-ui/primitives/layout'),
  ResizeHandle: () => null,
}));

jest.mock(
  '@/side-panel/hooks/useSidePanelCloseAnimationCompleteCleanup',
  () => ({
    useSidePanelCloseAnimationCompleteCleanup: () => ({
      sidePanelCloseAnimationCompleteCleanup:
        sidePanelCloseAnimationCompleteCleanupMock,
    }),
  }),
);

jest.mock('@/side-panel/hooks/useSidePanelMenu', () => ({
  useSidePanelMenu: () => ({ closeSidePanelMenu: jest.fn() }),
}));

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
  </I18nProvider>
);

describe('SidePanelForDesktop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetJotaiStore();
    sidePanelCloseAnimationCompleteCleanupMock.mockImplementation(() => {
      jotaiStore.set(isSidePanelClosingState.atom, false);
    });
  });

  it('keeps the content mounted while closing', () => {
    jotaiStore.set(isSidePanelOpenedState.atom, true);

    const { queryByTestId } = render(<SidePanelForDesktop />, {
      wrapper: Wrapper,
    });

    expect(queryByTestId('side-panel-content')).toBeInTheDocument();

    act(() => {
      jotaiStore.set(isSidePanelOpenedState.atom, false);
    });

    expect(queryByTestId('side-panel-content')).toBeInTheDocument();
  });

  it('completes the close lifecycle after the closing transition', () => {
    jotaiStore.set(isSidePanelOpenedState.atom, true);

    const { container, queryByTestId } = render(<SidePanelForDesktop />, {
      wrapper: Wrapper,
    });

    const wrapperElement = container.querySelector('[data-side-panel]');

    if (wrapperElement === null) {
      throw new Error('side panel wrapper not found');
    }

    act(() => {
      jotaiStore.set(isSidePanelOpenedState.atom, false);
      jotaiStore.set(isSidePanelClosingState.atom, true);
    });

    fireEvent.transitionEnd(wrapperElement);
    expect(sidePanelCloseAnimationCompleteCleanupMock).toHaveBeenCalled();
    expect(queryByTestId('side-panel-content')).not.toBeInTheDocument();
  });

  it('runs the close cleanup once when the transition ends', () => {
    jotaiStore.set(isSidePanelOpenedState.atom, true);

    const { container } = render(<SidePanelForDesktop />, { wrapper: Wrapper });

    const wrapperElement = container.querySelector('[data-side-panel]');

    if (wrapperElement === null) {
      throw new Error('side panel wrapper not found');
    }

    act(() => {
      jotaiStore.set(isSidePanelOpenedState.atom, false);
      jotaiStore.set(isSidePanelClosingState.atom, true);
    });

    fireEvent.transitionEnd(wrapperElement);

    expect(sidePanelCloseAnimationCompleteCleanupMock).toHaveBeenCalledTimes(1);
  });

  it('should not shrink from full width on a normal open', () => {
    jotaiStore.set(isSidePanelOpenedState.atom, true);

    const { container } = render(<SidePanelForDesktop />, { wrapper: Wrapper });

    expect(container.querySelector('[data-side-panel]')).not.toHaveAttribute(
      'data-shrink-from-full-width',
    );
  });
});
