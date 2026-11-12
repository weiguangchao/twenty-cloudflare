// Receives captured HTTP exchanges from the Playwright listener in
// capture-listener.js and appends them to raw/<flow>.jsonl.
// Usage: node collector.mjs [port]
import { appendFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2] ?? 9477);
const RAW_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'raw',
);

mkdirSync(RAW_DIRECTORY, { recursive: true });

let currentFlow = 'unlabeled';

createServer((request, response) => {
  let body = '';

  request.on('data', (chunk) => (body += chunk));
  request.on('end', () => {
    if (request.url === '/flow') {
      currentFlow = body.trim();
      console.log(`flow -> ${currentFlow}`);
    } else if (request.url === '/exchange') {
      const exchange = JSON.parse(body);

      appendFileSync(
        join(RAW_DIRECTORY, `${currentFlow}.jsonl`),
        JSON.stringify({ flow: currentFlow, ...exchange }) + '\n',
      );
    }
    response.writeHead(204).end();
  });
}).listen(PORT, () => console.log(`collector listening on ${PORT}`));
