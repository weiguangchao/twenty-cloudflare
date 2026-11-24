import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const MINUTES_IN_MS = 60 * 1000;

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: [
            'src/**/*.{test,spec}.{ts,tsx}',
            'design-tokens/**/*.{test,spec}.{ts,tsx}',
            'build-tools/**/*.{test,spec}.{ts,tsx}',
          ],
          exclude: ['src/**/*.reduced-motion.test.tsx'],
          setupFiles: ['./setupTests.ts'],
          css: { modules: { classNameStrategy: 'non-scoped' } },
        },
      },
      {
        extends: './vite.config.ts',
        test: {
          name: 'reduced-motion',
          include: ['src/**/*.reduced-motion.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              contextOptions: { reducedMotion: 'reduce' },
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: './vite.config.ts',
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
            ...(process.env.STORYBOOK_URL
              ? { storybookUrl: process.env.STORYBOOK_URL }
              : {
                  storybookScript: 'npx storybook dev -p 6008 --no-open',
                  storybookUrl: 'http://localhost:6008',
                }),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
          testTimeout: 5 * MINUTES_IN_MS,
        },
      },
    ],
  },
});
