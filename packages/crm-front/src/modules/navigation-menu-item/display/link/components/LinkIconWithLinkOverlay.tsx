import { ColoredIcon } from '@/ui/icon/components/ColoredIcon';
import { styled } from '@linaria/react';
import { type IconComponent } from 'crm-ui/icon';
import { useTheme, themeCssVariables } from 'crm-ui/theme';

import { DEFAULT_NAVIGATION_MENU_ITEM_COLOR_LINK } from '@/navigation-menu-item/common/constants/NavigationMenuItemDefaultColorLink';

const StyledCompositeContainer = styled.div`
  align-items: center;
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  height: calc(${themeCssVariables.icon.size.md} * 1px);
  justify-content: center;
  position: relative;
  width: calc(${themeCssVariables.icon.size.md} * 1px);
`;

const StyledLinkOverlay = styled.div<{ $backgroundColor: string }>`
  align-items: center;
  background-color: ${({ $backgroundColor }) => $backgroundColor};
  border-radius: ${themeCssVariables.border.radius.xs};
  bottom: -5px;
  display: flex;
  height: 14px;
  justify-content: center;
  position: absolute;
  right: -6px;
  width: 14px;
`;

export type LinkIconWithLinkOverlayProps = {
  LinkIcon: IconComponent;
  DefaultIcon: IconComponent;
  color?: string | null;
};

export const LinkIconWithLinkOverlay = ({
  LinkIcon,
  DefaultIcon,
  color: navItemColor,
}: LinkIconWithLinkOverlayProps) => {
  const theme = useTheme();

  return (
    <StyledCompositeContainer>
      <ColoredIcon
        Icon={DefaultIcon}
        color={navItemColor ?? DEFAULT_NAVIGATION_MENU_ITEM_COLOR_LINK}
      />
      <StyledLinkOverlay $backgroundColor={themeCssVariables.grayScale.gray4}>
        <LinkIcon
          size="14px"
          stroke={theme.icon.stroke.md}
          color={themeCssVariables.grayScale.gray10}
        />
      </StyledLinkOverlay>
    </StyledCompositeContainer>
  );
};
