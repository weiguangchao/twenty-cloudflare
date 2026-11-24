import { capitalize } from 'crm-shared/utils';
export const getDestroyOneRecordMutationResponseField = (
  objectNameSingular: string,
) => `destroy${capitalize(objectNameSingular)}`;
