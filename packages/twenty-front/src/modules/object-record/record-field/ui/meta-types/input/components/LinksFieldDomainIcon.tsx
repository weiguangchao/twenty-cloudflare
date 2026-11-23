import { styled } from '@linaria/react';
import { IconWorld } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';

const StyledIconContainer = styled.span`
  align-items: center;
  align-self: stretch;
  border-right: 1px solid ${themeCssVariables.border.color.medium};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  width: ${themeCssVariables.spacing[8]};
`;

export const LinksFieldDomainIcon = () => {
  const theme = useTheme();

  return (
    <StyledIconContainer aria-hidden>
      <IconWorld size={theme.icon.size.md} />
    </StyledIconContainer>
  );
};
