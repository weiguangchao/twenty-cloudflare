import { capitalize } from 'crm-shared/utils';
export const getDeleteManyRecordsMutationResponseField = (
  objectNamePlural: string,
) => `delete${capitalize(objectNamePlural)}`;
