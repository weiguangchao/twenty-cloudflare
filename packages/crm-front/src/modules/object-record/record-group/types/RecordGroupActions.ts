import { type IconComponent } from 'crm-ui/icon';

export type RecordGroupAction = {
  id: string;
  label: string;
  icon: IconComponent;
  position: number;
  callback: () => void;
  condition?: boolean;
  closeOnClick?: boolean;
};
