import path from 'node:path';
import { readFileSync } from 'node:fs';

import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';
import { readRecordFixtures } from './test/config/read-record-fixtures.util';
import { readMetadataWriteFixtures } from './test/config/read-metadata-write-fixtures.util';

export default defineConfig({
  plugins: [
    {
      name: 'graphql-sdl',
      load: (id) =>
        id.endsWith('.graphql')
          ? `export default ${JSON.stringify(readFileSync(id, 'utf8'))}`
          : undefined,
    },
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          APP_SECRET: 'test-app-secret-for-worker-integration-tests',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@/': `${path.resolve(__dirname, 'src')}/`,
      'twenty-shared/composite-type-definitions': path.resolve(
        __dirname,
        '../twenty-shared/dist/types.mjs',
      ),
    },
  },
  test: {
    name: 'twenty-worker',
    deps: { optimizer: { ssr: { enabled: true, include: ['sanitize-html'] } } },
    include: ['test/**/*.spec.ts'],
    provide: {
      metadataWriteContracts: readMetadataWriteFixtures(
        path.resolve(__dirname, 'contract/fixtures'),
      ),
      recordReadContracts: readRecordFixtures(
        path.resolve(__dirname, 'contract/fixtures'),
      ),
    },
    reporters: [
      'default',
      {
        onTestCaseResult: (testCase) => {
          const timings = testCase.meta().recordQueryBenchmark;
          if (timings)
            process.stdout.write(
              `RECORD_QUERY_10000_BENCHMARK ${JSON.stringify(timings)}\n`,
            );
        },
      },
    ],
  },
});
