import { ApiPath } from 'twenty-shared/types';
import { describe, expect, it } from 'vitest';

import wranglerConfigSource from '../wrangler.jsonc?raw';

const parseJsonc = (source: string) =>
  JSON.parse(source.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));

describe('wrangler.jsonc', () => {
  it('runs the Worker first for exactly the ApiPath prefixes', () => {
    const wranglerConfig = parseJsonc(wranglerConfigSource);
    const expectedPatterns = Object.values(ApiPath).flatMap((apiPath) => [
      `/${apiPath}`,
      `/${apiPath}/*`,
    ]);

    expect([...wranglerConfig.assets.run_worker_first].sort()).toEqual(
      expectedPatterns.sort(),
    );
  });
});
