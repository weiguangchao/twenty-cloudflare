import { capitalize } from 'crm-shared/utils';

export const getUpdateManyRecordsMutationResponseField = (
  objectNamePlural: string,
) => `update${capitalize(objectNamePlural)}`;
