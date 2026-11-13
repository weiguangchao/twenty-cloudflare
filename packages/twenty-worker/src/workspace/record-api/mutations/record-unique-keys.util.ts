import { type RecordObject } from '@/workspace/record-api/types/record-query.type';
import { computeFieldColumn } from '@/workspace/metadata/ddl/compute-field-column.util';

export const uniqueRecordKeys = (object: RecordObject) =>
  object.indexes
    .filter((index) => index.isUnique)
    .map((index) =>
      index.indexFields.flatMap((entry) => {
        const field = object.fields.find(
          (field) => field.id === entry.fieldMetadataId,
        );
        if (!field) return [];
        const column = computeFieldColumn(field);
        if (!column) return [];
        const compositeKeys: Record<string, string[]> = {
          EMAILS: ['primaryEmail'],
          LINKS: ['primaryLinkUrl'],
          PHONES: [
            'primaryPhoneNumber',
            'primaryPhoneCountryCode',
            'primaryPhoneCallingCode',
          ],
        };
        return (
          entry.subFieldName
            ? [entry.subFieldName]
            : (compositeKeys[field.type] ?? [undefined])
        ).map((subField) => ({ field, column: column.columnName, subField }));
      }),
    );
