import { render, waitFor } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';

import { CaptchaProvider } from '@/captcha/components/CaptchaProvider';
import { captchaTokenState } from '@/captcha/states/captchaTokenState';
import { isCaptchaScriptLoadedState } from '@/captcha/states/isCaptchaScriptLoadedState';
import { captchaState } from '@/client-config/states/captchaState';
import { CaptchaDriverType } from '~/generated-metadata/graphql';

jest.mock('@/captcha/components/CaptchaProviderScriptLoaderEffect', () => ({
  CaptchaProviderScriptLoaderEffect: () => null,
}));

describe('CaptchaProvider', () => {
  it('requests a Google reCAPTCHA token on a protected route', async () => {
    window.history.replaceState(null, '', '/welcome');
    window.grecaptcha = {
      execute: jest.fn().mockResolvedValue('google-token'),
    };
    const store = createStore();
    store.set(captchaState.atom, {
      provider: CaptchaDriverType.GOOGLE_RECAPTCHA,
      siteKey: 'test-site-key',
    });
    store.set(isCaptchaScriptLoadedState.atom, true);

    render(
      <JotaiProvider store={store}>
        <MemoryRouter initialEntries={['/welcome']}>
          <CaptchaProvider />
        </MemoryRouter>
      </JotaiProvider>,
    );

    await waitFor(() => {
      expect(store.get(captchaTokenState.atom)).toBe('google-token');
    });
  });
});
