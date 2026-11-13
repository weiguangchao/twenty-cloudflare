import {
  getLinkFaviconUrl,
  isPlainObject,
  isValidUuid,
} from 'twenty-shared/utils';

import { apiError } from '@/shared/errors/api-error.util';
import { projectFileValues } from '@/files/project-file-values.util';
import { compileRecordFilter } from '@/workspace/record-api/sql/compile-record-filter.util';
import {
  executeRecordSql,
  quoteIdentifier,
  recordTable,
} from '@/workspace/record-api/sql/record-sql.util';
import {
  type RecordData,
  type RecordObject,
  type RecordQueryContext,
} from '@/workspace/record-api/types/record-query.type';
import {
  compileSearchMatch,
  fullTextQuery,
  readableSearchFields,
  searchTerms,
} from '@/workspace/search/search-match.util';
import { searchFields } from '@/workspace/search/search-field-text.util';
import { searchTable } from '@/workspace/search/synchronize-search-indexes.util';

export type SearchInput = {
  searchInput: string;
  limit: number;
  after?: string | null;
  includedObjectNameSingulars?: string[] | null;
  excludedObjectNameSingulars?: string[] | null;
  filter?: RecordData | null;
};

type SearchCursor = {
  lastRanks: { tsRankCD: number; tsRank: number };
  lastRecordIdsPerObject: Record<string, string>;
  lastObjectNameSingular?: string;
};
type SearchRow = {
  recordId: string;
  label: string;
  imageUrl: string;
  tsRankCD: number;
  tsRank: number;
  objectNameSingular: string;
  objectLabelSingular: string;
};
const OBJECT_PRIORITY: Record<string, number> = {
  person: 5,
  company: 4,
  opportunity: 3,
  note: 2,
  task: 1,
};
const objectOrder = (left: string, right: string) =>
  (OBJECT_PRIORITY[right] ?? 0) - (OBJECT_PRIORITY[left] ?? 0) ||
  (left < right ? -1 : left > right ? 1 : 0);

const decodeCursor = (after: string): SearchCursor => {
  try {
    const value: unknown = JSON.parse(
      Buffer.from(after, 'base64url').toString(),
    );
    if (
      !isPlainObject(value) ||
      !isPlainObject(value.lastRanks) ||
      !isPlainObject(value.lastRecordIdsPerObject)
    )
      throw new Error();
    const ranks = value.lastRanks;
    if (
      !['tsRankCD', 'tsRank'].every(
        (name) =>
          typeof ranks[name] === 'number' && Number.isFinite(ranks[name]),
      ) ||
      !Object.values(value.lastRecordIdsPerObject).every(
        (id) => typeof id === 'string' && isValidUuid(id),
      ) ||
      (value.lastObjectNameSingular !== undefined &&
        typeof value.lastObjectNameSingular !== 'string')
    )
      throw new Error();
    return value as SearchCursor;
  } catch {
    throw apiError('Invalid search cursor');
  }
};

const cursorCondition = (
  object: RecordObject,
  cursor: SearchCursor | undefined,
  bindings: SqlStorageValue[],
) => {
  if (!cursor) return '1';
  const { tsRankCD, tsRank } = cursor.lastRanks;
  bindings.push(tsRankCD, tsRankCD, tsRank, tsRankCD, tsRank);
  const id = cursor.lastRecordIdsPerObject[object.nameSingular];
  const order = cursor.lastObjectNameSingular
    ? objectOrder(object.nameSingular, cursor.lastObjectNameSingular)
    : 0;
  let tie = order < 0 ? '0' : '1';
  if (order === 0 && id) {
    bindings.push(id);
    tie = '"recordId" > ?';
  }
  return `("tsRankCD" < ? OR ("tsRankCD" = ? AND "tsRank" < ?) OR ("tsRankCD" = ? AND "tsRank" = ? AND ${tie}))`;
};

export const searchRecords = (
  context: RecordQueryContext,
  input: SearchInput,
) => {
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100)
    throw apiError('Search limit must be between 1 and 100');
  const terms = searchTerms(input.searchInput);
  const cursor = input.after ? decodeCursor(input.after) : undefined;
  const included = input.includedObjectNameSingulars ?? [];
  const excluded = input.excludedObjectNameSingulars ?? [];
  const results: SearchRow[] = [];
  for (const object of context.catalog.objects) {
    if (
      (included.length
        ? !included.includes(object.nameSingular)
        : !object.isSearchable) ||
      excluded.includes(object.nameSingular)
    )
      continue;
    const permission = context.permissions.objectRecordsPermissions.find(
      (permission) => permission.objectMetadataId === object.id,
    );
    const label = object.fields.find(
      (field) => field.id === object.labelIdentifierFieldMetadataId,
    );
    if (
      !permission?.canReadAllRecords ||
      (label && permission.unreadableFields.includes(label.id))
    )
      continue;
    const fields = readableSearchFields(context, object);
    if (terms.length && !fields.length) continue;
    const bindings: SqlStorageValue[] = [];
    const table = searchTable(object);
    const match = fullTextQuery(fields, terms, 'or');
    const weights = searchFields(object).map((field) =>
      fields.some((readable) => readable.id === field.id) ? 1 : 0,
    );
    let matched = '';
    if (match) {
      bindings.push(match);
      matched = `"matches" AS MATERIALIZED (SELECT "rowid", -bm25(${table}, 0, ${weights.join(', ')}) AS "rank" FROM ${table} WHERE ${table} MATCH ?),`;
    }
    const rank = match ? 'COALESCE("matches"."rank", 0)' : '0';
    const allTerms = compileSearchMatch(
      object,
      fields,
      terms,
      'record',
      bindings,
    );
    const anyTerms = compileSearchMatch(
      object,
      fields,
      terms,
      'record',
      bindings,
      'or',
    );
    const filter = compileRecordFilter(context, object, input.filter ?? {});
    bindings.push(...filter.bindings);
    const labelColumn = label
      ? `"record".${quoteIdentifier(label.name)}`
      : '"record"."id"';
    const labelValue =
      label?.type === 'FULL_NAME'
        ? `trim(COALESCE(${labelColumn} ->> '$.firstName', '') || ' ' || COALESCE(${labelColumn} ->> '$.lastName', ''))`
        : `COALESCE(CAST(${labelColumn} AS TEXT), '')`;
    const image = object.fields.find(
      (field) => field.id === object.imageIdentifierFieldMetadataId,
    );
    const imageColumn =
      image && !permission.unreadableFields.includes(image.id)
        ? `"record".${quoteIdentifier(image.name)}`
        : "''";
    const imageValue =
      imageColumn !== "''" && image?.type === 'LINKS'
        ? `${imageColumn} ->> '$.primaryLinkUrl'`
        : imageColumn !== "''" && image?.type === 'FILES'
          ? imageColumn
          : image?.type === 'TEXT'
            ? imageColumn
            : "''";
    const after = cursorCondition(object, cursor, bindings);
    bindings.push(input.limit + 1);
    const rows = executeRecordSql(
      context.sql,
      `WITH ${matched} "ranked" AS MATERIALIZED (SELECT "record"."id" AS "recordId", ${labelValue} AS "label", COALESCE(${imageValue}, '') AS "imageUrl", CASE WHEN ${allTerms} THEN ${rank} ELSE 0 END AS "tsRankCD", ${rank} AS "tsRank" FROM ${recordTable(object)} AS "record" ${match ? 'LEFT JOIN "matches" ON "matches"."rowid" = "record"."rowid"' : ''} WHERE (${anyTerms}) AND (${filter.expression}) AND "record"."deletedAt" IS NULL) SELECT * FROM "ranked" WHERE ${after} ORDER BY "tsRankCD" DESC, "tsRank" DESC, "recordId" ASC LIMIT ?`,
      bindings,
    );
    results.push(
      ...rows.map(
        (row) =>
          ({
            ...row,
            imageUrl:
              image?.type === 'LINKS'
                ? (getLinkFaviconUrl(String(row.imageUrl ?? '')) ?? '')
                : image?.type === 'FILES' && imageColumn !== "''"
                  ? ((
                      projectFileValues(
                        context.sql,
                        JSON.parse(String(row.imageUrl || '[]')),
                        context.fileUrl,
                      ) as { url?: string }[] | null
                    )?.[0]?.url ?? '')
                  : row.imageUrl,
            objectNameSingular: object.nameSingular,
            objectLabelSingular: object.labelSingular,
          }) as SearchRow,
      ),
    );
  }
  results.sort(
    (left, right) =>
      right.tsRankCD - left.tsRankCD ||
      right.tsRank - left.tsRank ||
      objectOrder(left.objectNameSingular, right.objectNameSingular) ||
      (left.recordId < right.recordId
        ? -1
        : left.recordId > right.recordId
          ? 1
          : 0),
  );
  const ids = { ...cursor?.lastRecordIdsPerObject };
  const edges = results.slice(0, input.limit).map((node) => {
    ids[node.objectNameSingular] = node.recordId;
    const data: SearchCursor = {
      lastRanks: { tsRankCD: node.tsRankCD, tsRank: node.tsRank },
      lastRecordIdsPerObject: { ...ids },
      lastObjectNameSingular: node.objectNameSingular,
    };
    return {
      node,
      cursor: Buffer.from(JSON.stringify(data)).toString('base64url'),
    };
  });
  return {
    edges,
    pageInfo: {
      hasNextPage: results.length > input.limit,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  };
};
