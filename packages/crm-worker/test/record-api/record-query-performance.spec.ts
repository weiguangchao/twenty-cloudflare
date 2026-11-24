import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it } from 'vitest';

import { type WorkspaceDurableObject } from '@/workspace/workspace.durable-object';

import { createRecordIdentity } from '../utils/record-query-test.util';

declare module '@vitest/runner' {
  export interface TaskMeta {
    recordQueryBenchmark?: {
      insideMilliseconds: number;
      roundTripMilliseconds: number;
    }[];
  }
}

it('measures first-page reads over 10,000 records', async ({ task }) => {
  const stub = env.WORKSPACE.get(env.WORKSPACE.newUniqueId());
  const identity = await runInDurableObject(
    stub,
    (instance: WorkspaceDurableObject, { storage: { sql } }) => {
      const identity = createRecordIdentity(instance);
      sql.exec(
        `WITH RECURSIVE sequence(value) AS (VALUES (1) UNION ALL SELECT value + 1 FROM sequence WHERE value < 10000) INSERT INTO "rec_company" ("id", "name", "position", "createdAt", "updatedAt", "domainName") SELECT printf('00000000-0000-4000-8000-%012d', value), 'Company ' || value, value, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', json_object('primaryLinkUrl', 'company-' || value || '.test') FROM sequence`,
      );
      return identity;
    },
  );
  const query =
    '{companies(first: 60, orderBy: [{position: AscNullsFirst}]) {totalCount edges {cursor node {id name position domainName {primaryLinkUrl}}} pageInfo {hasNextPage endCursor}}}';
  const timings: {
    insideMilliseconds: number;
    roundTripMilliseconds: number;
  }[] = [];
  for (let iteration = 0; iteration < 6; iteration++) {
    const start = performance.now();
    const measured = await runInDurableObject(
      stub,
      (instance: WorkspaceDurableObject) => {
        const start = performance.now();
        const result = instance.executeRecordQuery({ query }, identity);
        return { result, insideMilliseconds: performance.now() - start };
      },
    );
    timings.push({
      insideMilliseconds: measured.insideMilliseconds,
      roundTripMilliseconds: performance.now() - start,
    });
    const result = JSON.parse(measured.result);
    expect(result.errors).toBeUndefined();
    expect(result.data.companies.totalCount).toBe(10000);
    expect(result.data.companies.edges).toHaveLength(60);
    expect(result.data.companies.pageInfo.hasNextPage).toBe(true);
  }
  task.meta.recordQueryBenchmark = timings;
});
