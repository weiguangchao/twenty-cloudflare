import { type ObjectRecord } from 'crm-shared/types';

export type ObjectRecordOperationUpdateInput = {
  recordId: string;
  updatedFields: Record<string, unknown>[];
  updatedRecord?: ObjectRecord;
};
