import { isSearchableFieldType } from 'twenty-shared/utils';

import { type ObjectMetadataSnapshot } from '@/workspace/metadata/snapshot/build-metadata-snapshot.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { quoteIdentifier } from '@/workspace/record-api/sql/record-sql.util';

export const searchFields = (
  object: Pick<ObjectMetadataSnapshot, 'fields' | 'searchFields'>,
) => {
  const included = new Set(
    object.searchFields.map((entry) => entry.fieldMetadataId),
  );
  return object.fields.filter(
    (field) =>
      field.isActive &&
      included.has(field.id) &&
      isSearchableFieldType(field.type),
  );
};

export const searchColumn = (field: FieldMetadataRow) =>
  quoteIdentifier(`field_${field.id.replaceAll('-', '')}`);

const concatenate = (expressions: string[]) =>
  expressions
    .map((expression) => `COALESCE(${expression}, '')`)
    .join(" || ' ' || ") || "''";

export const searchFieldText = (field: FieldMetadataRow, alias: string) => {
  const column = `${quoteIdentifier(alias)}.${quoteIdentifier(field.name)}`;
  const property = (name: string) => `(${column} ->> '$.${name}')`;
  const items = (name: string, expression: string) =>
    `(SELECT group_concat(${expression}, ' ') FROM json_each(${column}, '$.${name}'))`;
  const itemProperty = (name: string) => `json_extract(value, '$.${name}')`;
  const phone = (number: string, calling: string) =>
    concatenate([
      number,
      calling,
      `${calling} || ${number}`,
      `'0' || ${number}`,
    ]);
  switch (field.type) {
    case 'FULL_NAME':
      return concatenate(['firstName', 'lastName'].map(property));
    case 'ADDRESS':
      return concatenate(
        [
          'addressStreet1',
          'addressStreet2',
          'addressCity',
          'addressPostcode',
          'addressState',
          'addressCountry',
        ].map(property),
      );
    case 'EMAILS':
      return concatenate([
        property('primaryEmail'),
        `replace(${property('primaryEmail')}, '@', ' ')`,
        items('additionalEmails', `value || ' ' || replace(value, '@', ' ')`),
      ]);
    case 'LINKS':
      return concatenate([
        property('primaryLinkUrl'),
        property('primaryLinkLabel'),
        items(
          'secondaryLinks',
          concatenate([itemProperty('url'), itemProperty('label')]),
        ),
      ]);
    case 'PHONES':
      return concatenate([
        phone(
          property('primaryPhoneNumber'),
          property('primaryPhoneCallingCode'),
        ),
        items(
          'additionalPhones',
          phone(itemProperty('number'), itemProperty('callingCode')),
        ),
      ]);
    case 'RICH_TEXT':
      return concatenate([property('markdown')]);
    default:
      return concatenate([column]);
  }
};
