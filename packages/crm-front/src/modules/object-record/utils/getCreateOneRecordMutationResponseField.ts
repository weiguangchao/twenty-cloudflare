import { capitalize } from 'crm-shared/utils';
export const getCreateOneRecordMutationResponseField = (
  objectNameSingular: string,
) => `create${capitalize(objectNameSingular)}`;
