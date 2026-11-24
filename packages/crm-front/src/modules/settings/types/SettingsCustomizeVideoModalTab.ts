import { type IconComponent } from 'crm-ui/icon';

export type SettingsCustomizeVideoModalTab = {
  id: string;
  title: string;
  Icon: IconComponent;
  vimeoId: string;
  hasSound?: boolean;
};
