import { type FailedMetadataValidationError } from 'crm-shared/metadata';

export const metadataValidationError = (
  code: string,
  message: string,
  value?: unknown,
): FailedMetadataValidationError => ({
  code,
  message,
  userFriendlyMessage: message,
  ...(value === undefined ? {} : { value }),
});
