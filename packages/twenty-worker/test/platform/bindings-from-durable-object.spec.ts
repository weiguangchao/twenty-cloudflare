import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';

describe('bindings used from inside the workspace Durable Object', () => {
  it('reads and writes D1', async () => {
    const rows = await runInNewWorkspace(async () => {
      await env.CORE_DB.exec(
        'CREATE TABLE IF NOT EXISTS "probe" ("id" TEXT PRIMARY KEY)',
      );
      await env.CORE_DB.prepare('INSERT INTO "probe" VALUES (?)')
        .bind('from-durable-object')
        .run();

      return (await env.CORE_DB.prepare('SELECT * FROM "probe"').all()).results;
    });

    expect(rows).toEqual([{ id: 'from-durable-object' }]);
  });

  it('reads and writes R2', async () => {
    const body = await runInNewWorkspace(async () => {
      await env.FILES.put('workspace-id/probe.txt', 'hello');

      return (await env.FILES.get('workspace-id/probe.txt'))?.text();
    });

    expect(body).toBe('hello');
  });
});
