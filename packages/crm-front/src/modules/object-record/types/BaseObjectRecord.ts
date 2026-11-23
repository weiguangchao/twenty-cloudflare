import { type ObjectRecord as SharedObjectRecord } from 'crm-shared/types';

export type BaseObjectRecord = SharedObjectRecord & {
  __typename: string;
};
