import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { Provider as JotaiProvider } from 'jotai';

import { useRequestFreshCaptchaToken } from '@/captcha/hooks/useRequestFreshCaptchaToken';
import { isRequestingCaptchaTokenState } from '@/captcha/states/isRequestingCaptchaTokenState';
import { isCaptchaRequiredForPath } from '@/captcha/utils/isCaptchaRequiredForPath';
import { captchaState } from '@/client-config/states/captchaState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { type Captcha, CaptchaDriverType } from '~/generated-metadata/graphql';

jest.mock('@/captcha/utils/isCaptchaRequiredForPath');

const createWrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
);

describe('useRequestFreshCaptchaToken', () => {
  const mockGrecaptchaExecute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/welcome');
    jotaiStore.set(captchaState.atom, null);

    window.grecaptcha = {
      execute: mockGrecaptchaExecute,
    };

    (isCaptchaRequiredForPath as jest.Mock).mockReturnValue(true);

    mockGrecaptchaExecute.mockImplementation((_siteKey, _options) => {
      return Promise.resolve('google-recaptcha-token');
    });
  });

  it('should not request a token if captcha is not required for the current path', async () => {
    (isCaptchaRequiredForPath as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useRequestFreshCaptchaToken(), {
      wrapper: createWrapper,
    });

    await act(async () => {
      await result.current.requestFreshCaptchaToken();
    });

    expect(mockGrecaptchaExecute).not.toHaveBeenCalled();
  });

  it('should not request a token if captcha provider is undefined', async () => {
    const { result } = renderHook(() => useRequestFreshCaptchaToken(), {
      wrapper: createWrapper,
    });

    await act(async () => {
      await result.current.requestFreshCaptchaToken();
    });

    expect(mockGrecaptchaExecute).not.toHaveBeenCalled();
  });

  it('should request a token from Google reCAPTCHA when provider is GOOGLE_RECAPTCHA', async () => {
    jotaiStore.set(isRequestingCaptchaTokenState.atom, false);
    jotaiStore.set(captchaState.atom, {
      provider: CaptchaDriverType.GOOGLE_RECAPTCHA,
      siteKey: 'google-site-key',
    } as Captcha);

    const { result } = renderHook(() => useRequestFreshCaptchaToken(), {
      wrapper: createWrapper,
    });

    await act(async () => {
      await result.current.requestFreshCaptchaToken();
    });

    expect(mockGrecaptchaExecute).toHaveBeenCalledWith('google-site-key', {
      action: 'submit',
    });

    await waitFor(() => {
      expect(mockGrecaptchaExecute).toHaveBeenCalled();
    });
  });
});
