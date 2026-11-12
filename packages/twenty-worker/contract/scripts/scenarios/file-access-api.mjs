// File download token checks and Range support, using URLs the frontend
// fetched during the files flow.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FLOW = 'file-access-api';

const RAW_FILES_FLOW = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'raw',
  'files.jsonl',
);

const findFileUrl = (folder) =>
  readFileSync(RAW_FILES_FLOW, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => new URL(JSON.parse(line).url))
    .find(
      (url) =>
        url.pathname.startsWith(`/file/${folder}/`) &&
        url.searchParams.has('token'),
    );

export const run = async (client) => {
  const picture = findFileUrl('core-picture');
  const document = findFileUrl('files-field');

  await client.get(`${document.pathname}${document.search}`);
  await client.get(`${document.pathname}${document.search}`, {
    range: 'bytes=0-99',
  });
  await client.get(document.pathname);
  await client.get(
    `${document.pathname}?token=${picture.searchParams.get('token')}`,
  );
  await client.get(
    `/file/files-field/00000000-0000-0000-0000-000000000000${document.search}`,
  );
  await client.get(`${picture.pathname}${picture.search}`);
  await client.get(picture.pathname);
};
