import { apiError } from '@/shared/errors/api-error.util';
import { type FieldMetadataRow } from '@/workspace/metadata/types/field-metadata-row.type';
import { quoteIdentifier } from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordObject,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';
import {
  searchColumn,
  searchFields,
} from '@/workspace/search/search-field-text.util';
import { searchTable } from '@/workspace/search/synchronize-search-indexes.util';

export const searchTerms = (input: string) => {
  if (input.length > 2048 || input.includes('\0'))
    throw apiError('Invalid search input');
  return [
    ...new Set(input.normalize('NFC').trim().split(/\s+/).filter(Boolean)),
  ];
};

export const readableSearchFields = (
  context: RecordQueryContext,
  object: RecordObject,
) => {
  const permissions = context.permissions.objectRecordsPermissions.find(
    (permission) => permission.objectMetadataId === object.id,
  );
  return permissions?.canReadAllRecords
    ? searchFields(object).filter(
        (field) => !permissions.unreadableFields.includes(field.id),
      )
    : [];
};

export const fullTextQuery = (
  fields: FieldMetadataRow[],
  terms: string[],
  mode: 'and' | 'or',
) => {
  const long = terms.filter((term) => Array.from(term).length >= 3);
  return fields.length && long.length
    ? `{${fields.map(searchColumn).join(' ')}} : (${long.map((term) => `"${term.replaceAll('"', '""')}"`).join(mode === 'and' ? ' AND ' : ' OR ')})`
    : null;
};

export const compileSearchMatch = (
  object: RecordObject,
  fields: FieldMetadataRow[],
  terms: string[],
  alias: string,
  bindings: SqlStorageValue[],
  mode: 'and' | 'or' = 'and',
) => {
  if (!terms.length) return '1';
  if (!fields.length) return '0';
  const conditions: string[] = [];
  const fullText = fullTextQuery(fields, terms, mode);
  const table = searchTable(object);
  const rowId = `${quoteIdentifier(alias)}."rowid"`;
  if (fullText) {
    bindings.push(fullText);
    conditions.push(
      `${rowId} IN (SELECT "rowid" FROM ${table} WHERE ${table} MATCH ?)`,
    );
  }
  const short = terms.filter((term) => Array.from(term).length < 3);
  if (short.length) {
    bindings.push(JSON.stringify(short));
    const contains = fields
      .map(
        (field) =>
          `instr(lower("searchIndex".${searchColumn(field)}), lower("term"."value")) > 0`,
      )
      .join(' OR ');
    const match =
      mode === 'and'
        ? `NOT EXISTS (SELECT 1 FROM json_each(?) AS "term" WHERE NOT (${contains}))`
        : `EXISTS (SELECT 1 FROM json_each(?) AS "term" WHERE ${contains})`;
    conditions.push(
      `EXISTS (SELECT 1 FROM ${table} AS "searchIndex" WHERE "searchIndex"."rowid" = ${rowId} AND ${match})`,
    );
  }
  return `(${conditions.join(mode === 'and' ? ' AND ' : ' OR ')})`;
};
