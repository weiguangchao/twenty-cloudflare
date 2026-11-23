import { type RecordGqlOperationFilter } from 'crm-shared/types';

export type FrontComponentRecordContext = {
  objectNameSingular?: string;
  selectedRecordIds?: string[];
  selectedRecordsFilter?: RecordGqlOperationFilter | null;
};
