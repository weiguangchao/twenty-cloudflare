import { type IconComponent } from 'crm-ui/icon';
import {
  type AvatarProps,
  type AvatarShape,
} from 'crm-ui/primitives/data-display';
import { type Nullable } from 'crm-shared/types';

export type AvatarOrIconProps = Pick<
  AvatarProps,
  'src' | 'name' | 'colorSeed'
> & {
  shape?: Nullable<AvatarShape>;
  Icon?: IconComponent;
  IconColor?: string;
  IconBackgroundColor?: string;
  isIconInverted?: boolean;
  onClick?: () => void;
};
