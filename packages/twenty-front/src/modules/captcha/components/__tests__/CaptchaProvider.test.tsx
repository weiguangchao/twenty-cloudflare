import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { CaptchaProvider } from '@/captcha/components/CaptchaProvider';
import { CaptchaWidgetContainer } from '@/captcha/components/CaptchaWidgetContainer';
import { captchaTokenState } from '@/captcha/states/captchaTokenState';
import { captchaWidgetIdState } from '@/captcha/states/captchaWidgetIdState';
import { isCaptchaScriptLoadedState } from '@/captcha/states/isCaptchaScriptLoadedState';
import { captchaState } from '@/client-config/states/captchaState';
import { CaptchaDriverType } from '~/generated-metadata/graphql';

jest.mock('@/captcha/components/CaptchaProviderScriptLoaderEffect', () => ({
  CaptchaProviderScriptLoaderEffect: () => null,
}));

const AuthenticationForms = () => {
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  return (
    <>
      <button onClick={() => setIsCreatingWorkspace(true)}>
        Create workspace
      </button>
      {isCreatingWorkspace ? (
        <section key="workspace" aria-label="Workspace creation">
          <CaptchaWidgetContainer />
        </section>
      ) : (
        <section key="sign-in" aria-label="Sign in">
          <CaptchaWidgetContainer />
        </section>
      )}
    </>
  );
};

const renderAuthentication = ({
  pathname = '/welcome',
  provider = CaptchaDriverType.TURNSTILE,
  hasContainer = true,
}: {
  pathname?: string;
  provider?: CaptchaDriverType;
  hasContainer?: boolean;
} = {}) => {
  window.history.replaceState(null, '', pathname);
  const store = createStore();
  store.set(captchaState.atom, { provider, siteKey: 'test-site-key' });
  store.set(isCaptchaScriptLoadedState.atom, true);

  render(
    <JotaiProvider store={store}>
      <MemoryRouter initialEntries={[pathname]}>
        <CaptchaProvider>
          {hasContainer && <AuthenticationForms />}
        </CaptchaProvider>
      </MemoryRouter>
    </JotaiProvider>,
  );

  return store;
};

describe('CaptchaProvider', () => {
  beforeEach(() => {
    window.turnstile = {
      render: jest.fn((selector: string) => {
        const frame = document.createElement('iframe');
        frame.title = 'Cloudflare verification';
        document.querySelector(selector)?.appendChild(frame);
        return 'test-widget';
      }),
      execute: jest.fn(),
      remove: jest.fn(() => {
        screen.queryByTitle('Cloudflare verification')?.remove();
      }),
    };
  });

  it('keeps the challenge in the active authentication form when the form changes', async () => {
    const user = userEvent.setup();
    renderAuthentication();

    expect(screen.getByRole('region', { name: 'Sign in' })).toContainElement(
      screen.getByTitle('Cloudflare verification'),
    );

    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    expect(
      screen.getByRole('region', { name: 'Workspace creation' }),
    ).toContainElement(screen.getByTitle('Cloudflare verification'));
    expect(screen.getAllByTitle('Cloudflare verification')).toHaveLength(1);
  });

  it('does not render a challenge on an unprotected page', () => {
    renderAuthentication({ pathname: '/' });

    expect(
      screen.queryByTitle('Cloudflare verification'),
    ).not.toBeInTheDocument();
    expect(window.turnstile.execute).not.toHaveBeenCalled();
  });

  it('does not run or float a challenge when no form requests one', () => {
    renderAuthentication({
      pathname: '/settings/profile',
      hasContainer: false,
    });

    expect(
      screen.queryByTitle('Cloudflare verification'),
    ).not.toBeInTheDocument();
    expect(window.turnstile.execute).not.toHaveBeenCalled();
  });

  it('removes the challenge and its token when the form unmounts', () => {
    const store = renderAuthentication();
    store.set(captchaTokenState.atom, 'previous-token');
    cleanup();

    expect(window.turnstile.remove).toHaveBeenCalledWith('test-widget');
    expect(store.get(captchaTokenState.atom)).toBeUndefined();
    expect(store.get(captchaWidgetIdState.atom)).toBeUndefined();
  });

  it('continues requesting Google reCAPTCHA tokens without a Turnstile challenge', async () => {
    window.grecaptcha = {
      execute: jest.fn().mockResolvedValue('google-token'),
    };
    const store = renderAuthentication({
      provider: CaptchaDriverType.GOOGLE_RECAPTCHA,
    });

    await screen.findByRole('region', { name: 'Sign in' });

    expect(store.get(captchaTokenState.atom)).toBe('google-token');
    expect(
      screen.queryByTitle('Cloudflare verification'),
    ).not.toBeInTheDocument();
  });
});
