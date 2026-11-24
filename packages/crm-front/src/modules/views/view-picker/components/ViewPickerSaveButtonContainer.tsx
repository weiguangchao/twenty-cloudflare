import { styled } from '@linaria/react';
import { themeCssVariables } from 'crm-ui/theme';

const StyledSaveButtonContainer = styled.div`
  display: flex;
  padding: ${themeCssVariables.spacing[1]};
  width: 100%;
`;

export { StyledSaveButtonContainer as ViewPickerSaveButtonContainer };
