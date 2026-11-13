import { type FailedMetadataValidationError } from 'twenty-shared/metadata';

import { type FieldMetadataOption } from '@/workspace/metadata/types/field-metadata-row.type';
import { metadataValidationError } from '@/workspace/metadata/validation/metadata-validation-error.util';

const OPTION_VALUE_PATTERN = /^[A-Z0-9_]+$/;

export const validateFieldOptions = (
  options: FieldMetadataOption[] | null,
): FailedMetadataValidationError[] => {
  if (options === null || options.length === 0) {
    return [
      metadataValidationError(
        'INVALID_FIELD_INPUT',
        'Options are required for enum fields',
      ),
    ];
  }

  const errors: FailedMetadataValidationError[] = [];
  const values = new Set<string>();
  const ids = new Set<string>();

  for (const option of options) {
    if (typeof option.label !== 'string' || option.label.trim() === '') {
      errors.push(
        metadataValidationError(
          'INVALID_FIELD_INPUT',
          'Option label is required',
          option,
        ),
      );
    }
    if (
      typeof option.value !== 'string' ||
      !OPTION_VALUE_PATTERN.test(option.value)
    ) {
      errors.push(
        metadataValidationError(
          'INVALID_FIELD_INPUT',
          `Value must be in UPPER_CASE and follow snake_case "${String(option.value)}"`,
          option.value,
        ),
      );
    }
    if (values.has(option.value)) {
      errors.push(
        metadataValidationError(
          'INVALID_FIELD_INPUT',
          `Duplicated option value "${option.value}"`,
          option.value,
        ),
      );
    }
    if (ids.has(option.id)) {
      errors.push(
        metadataValidationError(
          'INVALID_FIELD_INPUT',
          `Duplicated option id "${option.id}"`,
          option.id,
        ),
      );
    }
    values.add(option.value);
    ids.add(option.id);
  }

  return errors;
};
