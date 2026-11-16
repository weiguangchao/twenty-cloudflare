import { styled } from '@linaria/react';
import { useContext } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';
import { isDefined } from 'twenty-shared/utils';

import { CaptchaWidgetContainerContext } from '@/captcha/contexts/CaptchaWidgetContainerContext';
import { captchaTokenState } from '@/captcha/states/captchaTokenState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const StyledContainer = styled.div<{ isHidden: boolean }>`
  display: ${({ isHidden }) => (isHidden ? 'none' : 'flex')};
  justify-content: center;
  width: 100%;

  &:not(:empty) {
    margin-top: ${themeCssVariables.spacing[4]};
  }
`;

type CaptchaWidgetContainerProps = {
  hideWhenVerified?: boolean;
};

export const CaptchaWidgetContainer = ({
  hideWhenVerified = false,
}: CaptchaWidgetContainerProps) => {
  const setContainer = useContext(CaptchaWidgetContainerContext);
  const captchaToken = useAtomStateValue(captchaTokenState);

  return (
    <StyledContainer
      ref={setContainer}
      isHidden={hideWhenVerified && isDefined(captchaToken)}
    />
  );
};
