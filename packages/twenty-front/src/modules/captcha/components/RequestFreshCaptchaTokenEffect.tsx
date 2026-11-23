import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from 'jotai';

import { useRequestFreshCaptchaToken } from '@/captcha/hooks/useRequestFreshCaptchaToken';
import { isCaptchaScriptLoadedState } from '@/captcha/states/isCaptchaScriptLoadedState';
import { captchaTokenState } from '@/captcha/states/captchaTokenState';
import { isRequestingCaptchaTokenState } from '@/captcha/states/isRequestingCaptchaTokenState';
import { isCaptchaRequiredForPath } from '@/captcha/utils/isCaptchaRequiredForPath';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const RequestFreshCaptchaTokenEffect = () => {
  const location = useLocation();
  const store = useStore();
  const { requestFreshCaptchaToken } = useRequestFreshCaptchaToken();
  const isCaptchaScriptLoaded = useAtomStateValue(isCaptchaScriptLoadedState);

  useEffect(() => {
    if (isCaptchaScriptLoaded && isCaptchaRequiredForPath(location.pathname)) {
      requestFreshCaptchaToken();
    }

    return () => {
      store.set(captchaTokenState.atom, undefined);
      store.set(isRequestingCaptchaTokenState.atom, false);
    };
  }, [
    isCaptchaScriptLoaded,
    location.pathname,
    requestFreshCaptchaToken,
    store,
  ]);

  return null;
};
