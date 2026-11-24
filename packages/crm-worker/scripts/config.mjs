import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const workerDirectory = fileURLToPath(new URL('../', import.meta.url));
export const readConfig = async () =>
  JSON.parse(
    (await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/,(\s*[}\]])/g, '$1'),
  );
