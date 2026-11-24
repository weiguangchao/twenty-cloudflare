import { capitalize } from 'crm-shared/utils';
export const getRestoreManyRecordsMutationResponseField = (
  objectNamePlural: string,
) => `restore${capitalize(objectNamePlural)}`;
