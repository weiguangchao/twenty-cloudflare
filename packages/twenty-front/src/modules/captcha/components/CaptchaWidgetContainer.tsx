import { styled } from '@linaria/react';
import { useContext } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

import { CaptchaWidgetContainerContext } from '@/captcha/contexts/CaptchaWidgetContainerContext';

const StyledContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;

  &:not(:empty) {
    margin-top: ${themeCssVariables.spacing[4]};
  }
`;

export const CaptchaWidgetContainer = () => {
  const setContainer = useContext(CaptchaWidgetContainerContext);

  return <StyledContainer ref={setContainer} />;
};
