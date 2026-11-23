import { styled } from '@linaria/react';
import { Separator } from 'crm-ui/primitives/layout';
import { themeCssVariables } from 'crm-ui/theme';

const StyledSeparatorContainer = styled.div`
  padding-inline: ${themeCssVariables.spacing[4]};
`;

export const SettingsCardSeparator = () => (
  <StyledSeparatorContainer>
    <Separator />
  </StyledSeparatorContainer>
);
