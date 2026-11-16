import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { CaptchaProviderScriptLoaderEffect } from '@/captcha/components/CaptchaProviderScriptLoaderEffect';
import { RequestFreshCaptchaTokenEffect } from '@/captcha/components/RequestFreshCaptchaTokenEffect';
import { CaptchaWidgetContainerContext } from '@/captcha/contexts/CaptchaWidgetContainerContext';
import { isCaptchaRequiredForPath } from '@/captcha/utils/isCaptchaRequiredForPath';
import { captchaState } from '@/client-config/states/captchaState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLocation } from 'react-router-dom';
import { CaptchaDriverType } from '~/generated-metadata/graphql';

export const CaptchaProvider = React.memo(
  ({ children }: React.PropsWithChildren) => {
    const location = useLocation();
    const captcha = useAtomStateValue(captchaState);
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    const isCaptchaRequired = useMemo(
      () => isCaptchaRequiredForPath(location.pathname),
      [location.pathname],
    );
    const isCaptchaActive =
      isCaptchaRequired &&
      (captcha?.provider === CaptchaDriverType.GOOGLE_RECAPTCHA ||
        container !== null);

    const widget = (
      <>
        {captcha?.provider === CaptchaDriverType.TURNSTILE && (
          <div id="captcha-widget" />
        )}
        <RequestFreshCaptchaTokenEffect />
      </>
    );

    return (
      <CaptchaWidgetContainerContext.Provider value={setContainer}>
        {isCaptchaActive && <CaptchaProviderScriptLoaderEffect />}
        {children}
        {isCaptchaActive &&
          (container ? createPortal(widget, container) : widget)}
      </CaptchaWidgetContainerContext.Provider>
    );
  },
);

CaptchaProvider.displayName = 'CaptchaProvider';
