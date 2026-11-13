import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateRegistrationCaptcha } from '@/auth/validate-registration-captcha.util';
import { createMetadataContext } from '@/metadata-api/create-metadata-context.util';

const context = (settings: Partial<Env> = {}) =>
  createMetadataContext(
    {
      ...env,
      TURNSTILE_SITE_KEY: 'site-key',
      TURNSTILE_SECRET_KEY: 'secret-key',
      ...settings,
    },
    new Request('https://crm.example.test/metadata', {
      headers: { 'cf-connecting-ip': '192.0.2.1' },
    }),
    new Headers(),
  );

afterEach(() => vi.restoreAllMocks());

describe('registration Turnstile verification', () => {
  it('requires a token and fails closed when configuration is incomplete', async () => {
    await expect(validateRegistrationCaptcha(context())).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(
      validateRegistrationCaptcha(
        context({ TURNSTILE_SECRET_KEY: undefined }),
        'token',
      ),
    ).rejects.toThrow('Captcha verification required');
  });

  it('accepts a successful token for this hostname and submits the remote address', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ success: true, hostname: 'crm.example.test' }),
      );
    await validateRegistrationCaptcha(context(), 'captcha-token');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(options?.method).toBe('POST');
    expect(String(options?.body)).toContain('response=captcha-token');
    expect(String(options?.body)).toContain('remoteip=192.0.2.1');
  });

  it.each([
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, hostname: 'another.example.test' },
  ])(
    'rejects invalid, expired, reused or foreign-host tokens: %j',
    async (result) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(result));
      await expect(
        validateRegistrationCaptcha(context(), 'token'),
      ).rejects.toThrow('Captcha verification failed');
    },
  );

  it('fails closed if Siteverify is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('Network failed'),
    );
    await expect(
      validateRegistrationCaptcha(context(), 'token'),
    ).rejects.toThrow('Captcha verification unavailable');
  });
});
