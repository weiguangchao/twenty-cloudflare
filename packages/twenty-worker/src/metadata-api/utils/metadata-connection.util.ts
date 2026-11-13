import { apiError } from '@/shared/errors/api-error.util';

export type MetadataPaging = {
  first?: number | null;
  last?: number | null;
  before?: string | null;
  after?: string | null;
};

const cursorIndex = (cursor: string): number => {
  try {
    const decoded = atob(cursor);
    if (!/^arrayconnection:\d+$/.test(decoded))
      throw apiError('Invalid metadata cursor');
    const index = Number(decoded.slice('arrayconnection:'.length));
    if (!Number.isSafeInteger(index)) throw apiError('Invalid metadata cursor');
    return index;
  } catch {
    throw apiError('Invalid metadata cursor');
  }
};

export const metadataConnection = <TRow>(
  rows: TRow[],
  paging: MetadataPaging = {},
) => {
  const limit = paging.first ?? paging.last ?? 10;
  if (
    !Number.isInteger(limit) ||
    limit < 0 ||
    limit > 1000 ||
    (paging.first !== null &&
      paging.first !== undefined &&
      paging.last !== null &&
      paging.last !== undefined)
  )
    throw apiError('Invalid metadata page size');
  const start = Math.min(
    rows.length,
    paging.after ? cursorIndex(paging.after) + 1 : 0,
  );
  const end = Math.max(
    start,
    Math.min(
      rows.length,
      paging.before ? cursorIndex(paging.before) : rows.length,
    ),
  );
  const firstIndex =
    paging.last !== null && paging.last !== undefined
      ? Math.max(start, end - limit)
      : start;
  const lastIndex =
    paging.last !== null && paging.last !== undefined
      ? end
      : Math.min(end, firstIndex + limit);
  const edges = rows.slice(firstIndex, lastIndex).map((node, offset) => ({
    node,
    cursor: btoa(`arrayconnection:${firstIndex + offset}`),
  }));

  return {
    edges,
    totalCount: rows.length,
    pageInfo: {
      hasNextPage: lastIndex < rows.length,
      hasPreviousPage: firstIndex > 0,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  };
};
