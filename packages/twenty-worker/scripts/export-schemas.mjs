import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { workerDirectory } from './config.mjs';

await mkdir(`${workerDirectory}/.wrangler`, { recursive: true });
const output = `${workerDirectory}/.wrangler/export-schemas.mjs`;
await build({
  absWorkingDir: workerDirectory,
  entryPoints: ['scripts/export-schemas.ts'],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  loader: { '.graphql': 'text' },
});
const result = spawnSync(process.execPath, [output], {
  cwd: workerDirectory,
  stdio: 'inherit',
});
if (result.status !== 0) process.exit(result.status ?? 1);
