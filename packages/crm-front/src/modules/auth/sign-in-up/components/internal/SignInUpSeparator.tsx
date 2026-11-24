import { styled } from '@linaria/react';
import { themeCssVariables } from 'crm-ui/theme';

const StyledSignInUpSeparator = styled.div`
  margin-block: ${themeCssVariables.spacing[3]};
`;

export const SignInUpSeparator = () => {
  return <StyledSignInUpSeparator />;
};
