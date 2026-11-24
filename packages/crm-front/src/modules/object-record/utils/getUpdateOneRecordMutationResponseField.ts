import { capitalize } from 'crm-shared/utils';
export const getUpdateOneRecordMutationResponseField = (
  objectNameSingular: string,
) => `update${capitalize(objectNameSingular)}`;
