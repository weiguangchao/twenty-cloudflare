import { doNotTranslate } from 'crm-shared/i18n';

export const getFindDuplicateRecordsQueryResponseField = (
  objectNameSingular: string,
) => doNotTranslate(`${objectNameSingular}Duplicates`);
