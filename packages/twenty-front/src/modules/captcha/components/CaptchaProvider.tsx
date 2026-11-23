import React from 'react';
import { useLocation } from 'react-router-dom';

import { CaptchaProviderScriptLoaderEffect } from '@/captcha/components/CaptchaProviderScriptLoaderEffect';
import { RequestFreshCaptchaTokenEffect } from '@/captcha/components/RequestFreshCaptchaTokenEffect';
import { isCaptchaRequiredForPath } from '@/captcha/utils/isCaptchaRequiredForPath';
import { captchaState } from '@/client-config/states/captchaState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { CaptchaDriverType } from '~/generated-metadata/graphql';

export const CaptchaProvider = React.memo(
  ({ children }: React.PropsWithChildren) => {
    const { pathname } = useLocation();
    const captcha = useAtomStateValue(captchaState);
    const isCaptchaActive =
      captcha?.provider === CaptchaDriverType.GOOGLE_RECAPTCHA &&
      isCaptchaRequiredForPath(pathname);

    return (
      <>
        {isCaptchaActive && <CaptchaProviderScriptLoaderEffect />}
        {children}
        {isCaptchaActive && <RequestFreshCaptchaTokenEffect />}
      </>
    );
  },
);

CaptchaProvider.displayName = 'CaptchaProvider';
