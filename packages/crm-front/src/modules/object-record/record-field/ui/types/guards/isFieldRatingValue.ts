import { RATING_VALUES } from 'crm-shared/constants';
import { type FieldRatingValue } from 'crm-shared/types';

export const isFieldRatingValue = (
  fieldValue: unknown,
): fieldValue is FieldRatingValue =>
  RATING_VALUES.includes(fieldValue as NonNullable<FieldRatingValue>);
