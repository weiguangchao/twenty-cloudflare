import { FieldMetadataType } from 'twenty-shared/types';

import {
  type FieldMetadataOption,
  type FieldMetadataOptionInput,
} from '@/workspace/metadata/types/field-metadata-row.type';

const RATING_OPTION_COUNT = 5;

// Gives every option an id and a position; ratings default to the five
// RATING_n options the old server generated.
export const normalizeFieldOptions = (
  type: FieldMetadataType,
  options: FieldMetadataOptionInput[] | null,
): FieldMetadataOption[] | null => {
  if (
    type === FieldMetadataType.RATING &&
    (options === null || options.length === 0)
  ) {
    return Array.from({ length: RATING_OPTION_COUNT }, (_, index) => ({
      id: crypto.randomUUID(),
      label: String(index + 1),
      value: `RATING_${index + 1}`,
      position: index,
    }));
  }

  return (
    options?.map((option, index) => ({
      ...option,
      id: option.id ?? crypto.randomUUID(),
      position: option.position ?? index,
    })) ?? null
  );
};
