import { type FieldJsonValue } from '@/object-record/record-field/ui/types/FieldMetadata';

export const useFormattedJsonFieldValue = ({
  fieldValue,
}: {
  fieldValue: FieldJsonValue | undefined;
}): FieldJsonValue | undefined => {
  return fieldValue;
};
