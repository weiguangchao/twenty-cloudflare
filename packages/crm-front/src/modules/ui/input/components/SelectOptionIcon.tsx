import { isDefined } from 'crm-shared/utils';
import { TintedIconTile } from 'crm-ui/components/data-display';
import { type IconComponent } from 'crm-ui/icon';
import { type ThemeColor, useTheme } from 'crm-ui/theme';

type SelectOptionIconProps = {
  Icon?: IconComponent | null;
  color?: ThemeColor | null;
};

export const SelectOptionIcon = ({ Icon, color }: SelectOptionIconProps) => {
  const theme = useTheme();

  if (!isDefined(Icon)) {
    return null;
  }

  if (isDefined(color)) {
    return (
      <TintedIconTile
        icon={<Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />}
        color={color}
      />
    );
  }

  return <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />;
};
