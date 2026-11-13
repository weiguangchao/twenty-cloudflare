import { captchaTokenState } from '@/captcha/states/captchaTokenState';
import { captchaWidgetIdState } from '@/captcha/states/captchaWidgetIdState';
import { isRequestingCaptchaTokenState } from '@/captcha/states/isRequestingCaptchaTokenState';
import { isCaptchaRequiredForPath } from '@/captcha/utils/isCaptchaRequiredForPath';
import { captchaState } from '@/client-config/states/captchaState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useCallback } from 'react';
import { assertIsDefinedOrThrow, isDefined } from 'twenty-shared/utils';
import { CaptchaDriverType } from '~/generated-metadata/graphql';
import { useStore } from 'jotai';

export const useRequestFreshCaptchaToken = () => {
  const store = useStore();
  const setCaptchaToken = useSetAtomState(captchaTokenState);
  const setIsRequestingCaptchaToken = useSetAtomState(
    isRequestingCaptchaTokenState,
  );

  const requestFreshCaptchaToken = useCallback(async () => {
    if (!isCaptchaRequiredForPath(window.location.pathname)) {
      return;
    }

    const captcha = store.get(captchaState.atom);

    if (!isDefined(captcha)) {
      return;
    }

    assertIsDefinedOrThrow(captcha);

    setIsRequestingCaptchaToken(true);

    switch (captcha.provider) {
      case CaptchaDriverType.GOOGLE_RECAPTCHA:
        window.grecaptcha
          .execute(captcha.siteKey, {
            action: 'submit',
          })
          .then((token: string) => {
            setCaptchaToken(token);
            setIsRequestingCaptchaToken(false);
          });
        break;
      case CaptchaDriverType.TURNSTILE: {
        const previousWidgetId = store.get(captchaWidgetIdState.atom);
        if (isDefined(previousWidgetId)) {
          window.turnstile.remove(previousWidgetId);
        }
        setCaptchaToken(undefined);
        const widgetId: string = window.turnstile.render('#captcha-widget', {
          sitekey: captcha.siteKey,
          execution: 'execute',
          callback: (token: string) => {
            setCaptchaToken(token);
            setIsRequestingCaptchaToken(false);
          },
          'expired-callback': () => setCaptchaToken(undefined),
          'error-callback': () => {
            setCaptchaToken(undefined);
            setIsRequestingCaptchaToken(false);
          },
        });
        store.set(captchaWidgetIdState.atom, widgetId);
        window.turnstile.execute(widgetId);
        break;
      }
    }
  }, [setCaptchaToken, setIsRequestingCaptchaToken, store]);

  return { requestFreshCaptchaToken };
};
