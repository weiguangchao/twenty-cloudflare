import { env, runInDurableObject } from 'cloudflare:test';
import { beforeAll, expect, inject, it } from 'vitest';

import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';
import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';

import { installCapturedRecords } from '../utils/install-captured-records.util';

const contracts = inject('recordReadContracts');
const workspace = env.WORKSPACE.get(env.WORKSPACE.newUniqueId());
let identity: RecordQueryIdentity;

beforeAll(async () => {
  identity = await runInDurableObject(
    workspace,
    (instance: WorkspaceDurableObject, state) =>
      installCapturedRecords(state.storage, instance, contracts),
  );
});

for (const fixture of contracts.searchFixtures)
  it(`replays ${fixture.path}`, async () => {
    const result = JSON.parse(
      await workspace.executeRecordQuery(
        { query: fixture.query, variables: fixture.variables },
        identity,
      ),
    ) as {
      data: {
        search: {
          __typename: string;
          edges: {
            __typename: string;
            node: {
              __typename: string;
              recordId: string;
              objectNameSingular: string;
              objectLabelSingular: string;
              label: string;
              imageUrl: string | null;
              tsRank: number;
              tsRankCD: number;
            };
            cursor: string;
          }[];
          pageInfo: {
            __typename: string;
            hasNextPage: boolean;
            endCursor: string | null;
          };
        };
      };
      errors?: unknown;
    };
    expect(result.errors).toBeUndefined();
    const search = result.data.search;
    expect(search.__typename).toBe('SearchResultConnection');
    expect(search.edges.length).toBeLessThanOrEqual(
      Number(fixture.variables.limit),
    );
    for (const edge of search.edges) {
      expect(edge.__typename).toBe('SearchResultEdge');
      expect(edge.node).toEqual({
        __typename: 'SearchRecord',
        recordId: expect.any(String),
        objectNameSingular: expect.any(String),
        objectLabelSingular: expect.any(String),
        label: expect.any(String),
        imageUrl: expect.any(String),
        tsRank: expect.any(Number),
        tsRankCD: expect.any(Number),
      });
      const cursor = JSON.parse(
        Buffer.from(edge.cursor, 'base64url').toString(),
      );
      expect(cursor.lastRecordIdsPerObject[edge.node.objectNameSingular]).toBe(
        edge.node.recordId,
      );
      expect(cursor.lastRanks).toEqual({
        tsRankCD: edge.node.tsRankCD,
        tsRank: edge.node.tsRank,
      });
    }
    expect(search.pageInfo).toEqual({
      __typename: 'SearchResultPageInfo',
      hasNextPage: expect.any(Boolean),
      endCursor: search.edges.at(-1)?.cursor ?? null,
    });
    if (
      fixture.path.startsWith('search/') &&
      fixture.variables.searchInput !== 'x"*('
    )
      expect(search.edges.length).toBeGreaterThan(0);
  });
