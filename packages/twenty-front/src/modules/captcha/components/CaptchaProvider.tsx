import { styled } from '@linaria/react';
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { themeCssVariables } from 'twenty-ui/theme';

import { CaptchaProviderScriptLoaderEffect } from '@/captcha/components/CaptchaProviderScriptLoaderEffect';
import { RequestFreshCaptchaTokenEffect } from '@/captcha/components/RequestFreshCaptchaTokenEffect';
import { CaptchaWidgetContainerContext } from '@/captcha/contexts/CaptchaWidgetContainerContext';
import { isCaptchaRequiredForPath } from '@/captcha/utils/isCaptchaRequiredForPath';
import { captchaState } from '@/client-config/states/captchaState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLocation } from 'react-router-dom';
import { CaptchaDriverType } from '~/generated-metadata/graphql';

const StyledFloatingWidget = styled.div`
  bottom: ${themeCssVariables.spacing[4]};
  position: fixed;
  right: ${themeCssVariables.spacing[4]};
  z-index: 1;
`;

export const CaptchaProvider = React.memo(
  ({ children }: React.PropsWithChildren) => {
    const location = useLocation();
    const captcha = useAtomStateValue(captchaState);
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    const isCaptchaRequired = useMemo(
      () => isCaptchaRequiredForPath(location.pathname),
      [location.pathname],
    );

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
        {isCaptchaRequired && <CaptchaProviderScriptLoaderEffect />}
        {children}
        {isCaptchaRequired &&
          (container ? (
            createPortal(widget, container)
          ) : (
            <StyledFloatingWidget>{widget}</StyledFloatingWidget>
          ))}
      </CaptchaWidgetContainerContext.Provider>
    );
  },
);

CaptchaProvider.displayName = 'CaptchaProvider';
