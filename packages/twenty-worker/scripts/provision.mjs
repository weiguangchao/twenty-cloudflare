import { writeFile } from 'node:fs/promises';
import { readConfig, workerDirectory } from './config.mjs';

const environment = process.argv[2] ?? 'production';
if (!['dev', 'production'].includes(environment))
  throw new Error('Expected dev or production');
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !apiToken)
  throw new Error(
    'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required',
  );
const request = async (path, method = 'GET', body) => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/${path}`,
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
    throw new Error(`${method} ${path}: ${JSON.stringify(result.errors)}`);
  return result.result;
};
const config = await readConfig();
const target = config.env[environment];
const database = target.d1_databases[0];
const databases = await request('d1/database?per_page=100');
const buckets = await request('r2/buckets?per_page=1000');
const queues = await request('queues?per_page=100');
const existingDatabase = databases.find(
  (candidate) => candidate.name === database.database_name,
);
const createdDatabase =
  existingDatabase ??
  (await request('d1/database', 'POST', {
    name: database.database_name,
    primary_location_hint: 'apac',
  }));
database.database_id = createdDatabase.uuid;

if (
  !buckets.buckets.some(
    (bucket) => bucket.name === target.r2_buckets[0].bucket_name,
  )
)
  await request('r2/buckets', 'POST', {
    name: target.r2_buckets[0].bucket_name,
    locationHint: 'apac',
  });
const queueName = target.queues.producers[0].queue;

if (!queues.some((queue) => queue.queue_name === queueName))
  await request('queues', 'POST', { queue_name: queueName });

await writeFile(
  `${workerDirectory}/wrangler.jsonc`,
  `${JSON.stringify(config, null, 2)}\n`,
);
console.log(
  `Provisioned ${environment}: D1 ${database.database_name}, R2 ${target.r2_buckets[0].bucket_name}, Queue ${queueName} in account ${accountId}`,
);
