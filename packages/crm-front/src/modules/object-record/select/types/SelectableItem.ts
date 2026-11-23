import { type AvatarShape } from 'crm-ui/primitives/data-display';
import { type IconComponent } from 'crm-ui/icon';

export type SelectableItem<T = object> = T & {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarShape?: AvatarShape;
  AvatarIcon?: IconComponent;
  isSelected: boolean;
  isIconInverted?: boolean;
};
