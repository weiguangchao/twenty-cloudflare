import { type IconComponent } from 'crm-ui/icon';
import { Tag } from 'crm-ui/primitives/data-display';
import { type ThemeColor } from 'crm-ui/theme';
import { isDefined } from 'crm-shared/utils';

type SelectDisplayProps = {
  color: ThemeColor | 'transparent';
  label: string;
  Icon?: IconComponent;
};

export const SelectDisplay = ({ color, label, Icon }: SelectDisplayProps) => (
  <Tag
    truncate={false}
    color={color}
    startIcon={isDefined(Icon) ? <Icon /> : undefined}
  >
    {label}
  </Tag>
);
