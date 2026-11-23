import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { readConfig, workerDirectory } from './config.mjs';

const environment = process.argv[2] ?? 'production';
if (!['dev', 'production'].includes(environment))
  throw new Error('Expected dev or production');
const config = await readConfig();
if (config.env[environment].d1_databases[0].database_id.startsWith('00000000-'))
  throw new Error('Run scripts/provision.mjs first');
if (
  process.env.CI === 'true' &&
  (!process.env.APP_SECRET || !process.env.OPERATIONS_TOKEN)
)
  throw new Error('CI requires stable APP_SECRET and OPERATIONS_TOKEN secrets');
const secretsPath = `${workerDirectory}/.wrangler/secrets.${environment}.json`;
await mkdir(`${workerDirectory}/.wrangler`, { recursive: true });
let existingSecrets = {};
try {
  existingSecrets = JSON.parse(await readFile(secretsPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const secrets = {
  ...existingSecrets,
  APP_SECRET:
    process.env.APP_SECRET ||
    existingSecrets.APP_SECRET ||
    randomBytes(48).toString('base64url'),
  OPERATIONS_TOKEN:
    process.env.OPERATIONS_TOKEN ||
    existingSecrets.OPERATIONS_TOKEN ||
    randomBytes(48).toString('base64url'),
};
delete secrets.TURNSTILE_SECRET_KEY;
for (const key of ['GOOGLE_CLIENT_SECRET', 'MICROSOFT_CLIENT_SECRET'])
  if (process.env[key]) secrets[key] = process.env[key];
await writeFile(secretsPath, `${JSON.stringify(secrets)}\n`, { mode: 0o600 });
await chmod(secretsPath, 0o600);
const run = (args) => {
  const result = spawnSync(
    process.execPath,
    [
      '../../node_modules/wrangler/bin/wrangler.js',
      ...args,
      '--env',
      environment,
    ],
    {
      cwd: workerDirectory,
      stdio: 'inherit',
      env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
    },
  );
  if (result.status !== 0) throw new Error(`Wrangler ${args[0]} failed`);
};
run(['secret', 'bulk', secretsPath]);
run(['d1', 'migrations', 'apply', 'CORE_DB', '--remote']);
run(['deploy']);
console.log(
  `Secrets are retained in ${secretsPath}; keep an encrypted operator copy outside this repository.`,
);
