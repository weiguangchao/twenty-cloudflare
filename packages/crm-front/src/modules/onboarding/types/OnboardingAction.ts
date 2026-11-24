import { type IconComponent } from 'crm-ui/icon';

export type OnboardingAction = {
  label: string;
  Icon?: IconComponent;
  onClick: () => void;
};
