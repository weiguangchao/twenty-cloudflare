import {
  type FailedMetadataValidationError,
  IDENTIFIER_MAX_CHAR_LENGTH,
  RESERVED_METADATA_NAME_KEYWORDS,
} from 'twenty-shared/metadata';

const METADATA_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

// Name rules shared by objects and fields, with the old server's codes and
// messages (validate-flat-field-metadata-name.util.ts).
export const validateMetadataName = (
  name: string,
  invalidInputCode: 'INVALID_FIELD_INPUT' | 'INVALID_OBJECT_INPUT',
): FailedMetadataValidationError[] => {
  const errors: FailedMetadataValidationError[] = [];
  const addError = (message: string) =>
    errors.push({
      code: invalidInputCode,
      message,
      userFriendlyMessage: message,
      value: name,
    });

  if (name.length > IDENTIFIER_MAX_CHAR_LENGTH) {
    addError('Name is too long');
  }
  if (name.length < 1) {
    addError('Name is too short');
  }
  if (!METADATA_NAME_PATTERN.test(name)) {
    addError(
      'Name is not valid: it must start with lowercase letter and contain only alphanumeric letters',
    );
  }
  if (RESERVED_METADATA_NAME_KEYWORDS.includes(name)) {
    addError(
      'This name is reserved. Use a different name or the system will add "Custom" suffix.',
    );
  }

  return errors;
};
