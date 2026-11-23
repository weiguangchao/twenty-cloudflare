import { type Nullable } from 'crm-shared/types';

export type RecordAggregateValueByRecordGroupValue = {
  recordGroupValue: Nullable<string>;
  recordAggregateValue: Nullable<string | number>;
};
