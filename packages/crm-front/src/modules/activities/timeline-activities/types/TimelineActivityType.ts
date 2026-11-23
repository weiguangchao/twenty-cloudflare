import { type TimelineActivityTypeSnapshot } from 'crm-shared/timeline';

export type TimelineActivityType = TimelineActivityTypeSnapshot & {
  isActive?: boolean;
};
