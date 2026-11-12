// Dumps every metadata row of one workspace from the old server's `core`
// schema, unfiltered, to contract/metadata-export/workspace-metadata.json.
// filter-standard-metadata.mjs derives the seed from this file.
// Usage: node export-workspace-metadata.mjs [workspaceId]
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const DATABASE_URL =
  process.env.PG_DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5432/default';
const OUTPUT_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'metadata-export',
);

const WORKSPACE_TABLES = [
  'objectMetadata',
  'fieldMetadata',
  'fieldMetadataOption',
  'indexMetadata',
  'indexFieldMetadata',
  'searchFieldMetadata',
  'view',
  'viewField',
  'viewFieldGroup',
  'viewFilter',
  'viewFilterGroup',
  'viewSort',
  'viewGroup',
  'pageLayout',
  'pageLayoutTab',
  'pageLayoutWidget',
  'navigationMenuItem',
  'commandMenuItem',
  'role',
  'permissionFlag',
  'rolePermissionFlag',
  'objectPermission',
  'fieldPermission',
  'roleTarget',
  'timelineActivityType',
  'relatedRecordPath',
  'featureFlag',
  'application',
];

const client = new Client({ connectionString: DATABASE_URL });

await client.connect();

const workspaceId =
  process.argv[2] ??
  (await client.query('SELECT id FROM core.workspace LIMIT 1')).rows[0].id;

const tables = {};

for (const table of WORKSPACE_TABLES) {
  const { rows } = await client.query(
    `SELECT * FROM core."${table}" WHERE "workspaceId" = $1 ORDER BY id`,
    [workspaceId],
  );

  tables[table] = rows;
}

const [{ inviteHash: _inviteHash, ...workspace }] = (
  await client.query('SELECT * FROM core.workspace WHERE id = $1', [
    workspaceId,
  ])
).rows;

await client.end();

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
writeFileSync(
  join(OUTPUT_DIRECTORY, 'workspace-metadata.json'),
  JSON.stringify(
    { exportedAt: new Date().toISOString(), workspace, tables },
    null,
    2,
  ) + '\n',
);

for (const [table, rows] of Object.entries(tables)) {
  console.log(`${table}: ${rows.length}`);
}
