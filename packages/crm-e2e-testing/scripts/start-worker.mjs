import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const workerDirectory = fileURLToPath(
  new URL('../../crm-worker/', import.meta.url),
);
const wrangler = fileURLToPath(
  new URL('../../../node_modules/wrangler/bin/wrangler.js', import.meta.url),
);
const storage = await mkdtemp(join(tmpdir(), 'crm-worker-e2e-'));
let processHandle;

let stopping;
const stop = () => {
  stopping ??= (async () => {
    if (
      processHandle &&
      processHandle.exitCode === null &&
      processHandle.signalCode === null
    ) {
      const exited = once(processHandle, 'exit');
      processHandle.kill('SIGTERM');
      await exited;
    }
    await rm(storage, { recursive: true, force: true });
  })();
  return stopping;
};
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await stop();
    process.exit(0);
  });

const run = (argumentsList) =>
  new Promise((resolve, reject) => {
    processHandle = spawn(process.execPath, [wrangler, ...argumentsList], {
      cwd: workerDirectory,
      stdio: 'inherit',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    processHandle.once('error', reject);
    processHandle.once('exit', (code) =>
      code === 0 || stopping
        ? resolve()
        : reject(new Error(`Wrangler exited with ${code}`)),
    );
  });

try {
  await run([
    'd1',
    'migrations',
    'apply',
    'CORE_DB',
    '--local',
    '--persist-to',
    storage,
  ]);
  await run([
    'dev',
    '--local',
    '--ip',
    '127.0.0.1',
    '--port',
    '3030',
    '--persist-to',
    storage,
    '--var',
    'APP_SECRET:isolated-e2e-app-secret-for-tests',
    '--var',
    'EMAIL_FROM:',
    '--var',
    'EMAIL_VERIFICATION_REQUIRED:false',
  ]);
} finally {
  await stop();
}
