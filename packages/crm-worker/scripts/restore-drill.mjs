import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { workerDirectory } from './config.mjs';

const environment = process.argv[2] ?? 'production';
const origin = process.env.WORKER_URL;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const secrets = JSON.parse(
  await readFile(
    `${workerDirectory}/.wrangler/secrets.${environment}.json`,
    'utf8',
  ),
);
if (!origin || !accountId || !apiToken)
  throw new Error(
    'WORKER_URL, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required',
  );
const report = {
  startedAt: new Date().toISOString(),
  origin,
  durableObject: {},
  d1: {},
};
const workspaceId = `recovery-drill-${randomUUID()}`;
const operation = async (action, input = {}) => {
  const response = await fetch(`${origin}/cloudflare/operations`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secrets.OPERATIONS_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ action, workspaceId, ...input }),
  });
  if (!response.ok)
    throw new Error(`Operator action ${action} returned ${response.status}`);
  return response.json();
};
const api = async (path, method = 'GET', body) => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database${path}`,
    {
      method,
      headers: {
        authorization: `Bearer ${apiToken}`,
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error(`D1 ${method} ${path}: ${JSON.stringify(result.errors)}`);
  return result.result;
};
let databaseId;
try {
  const first = await operation('write-drill-marker', { marker: 'before' });
  await operation('write-drill-marker', { marker: 'after' });
  const restore = await operation('prepare-restore', {
    bookmark: first.bookmark,
  });
  // abort() closes the RPC connection while restarting the object.
  try {
    await operation('restart');
  } catch {
    // Readback below is authoritative.
  }
  const restored = await operation('snapshot');
  if (restored.marker !== 'before')
    throw new Error('Durable Object recovery readback failed');
  report.durableObject = {
    workspaceId,
    bookmark: first.bookmark,
    undoBookmark: restore.undoBookmark,
    restoredMarker: restored.marker,
    passed: true,
  };

  const database = await api('', 'POST', {
    name: `crm-restore-drill-${randomUUID()}`,
    primary_location_hint: 'apac',
  });
  databaseId = database.uuid;
  const query = (sql) => api(`/${databaseId}/query`, 'POST', { sql });
  await query(
    "CREATE TABLE marker (value TEXT); INSERT INTO marker VALUES ('before');",
  );
  const bookmark = await api(`/${databaseId}/time_travel/bookmark`);
  await query("UPDATE marker SET value = 'after';");
  const d1Restore = await api(
    `/${databaseId}/time_travel/restore?bookmark=${encodeURIComponent(bookmark.bookmark)}`,
    'POST',
  );
  const result = await query('SELECT value FROM marker;');
  if (result[0]?.results[0]?.value !== 'before')
    throw new Error('D1 recovery readback failed');
  report.d1 = {
    databaseId,
    bookmark: bookmark.bookmark,
    undoBookmark: d1Restore.previous_bookmark,
    restoredMarker: result[0].results[0].value,
    passed: true,
  };
  report.completedAt = new Date().toISOString();
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  const cleanup = await Promise.allSettled([
    databaseId ? api(`/${databaseId}`, 'DELETE') : Promise.resolve(),
    operation('delete-drill'),
  ]);
  report.cleanup = cleanup.map((result, index) => ({
    resource: index === 0 ? 'd1' : 'durableObject',
    status: result.status,
    ...(result.status === 'rejected' ? { error: String(result.reason) } : {}),
  }));
  const reportPath = `${workerDirectory}/.wrangler/restore-drill-${Date.now()}.json`;
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Recovery drill evidence: ${reportPath}`);
}
