import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import capturedClientConfig from '../contract/fixtures/auth-signup-onboarding/001-GET-client-config.json';

const describeShape = (value: unknown): unknown => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map((key) => [
          key,
          describeShape((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return typeof value;
};

describe('GET /healthz', () => {
  it('reports ok', async () => {
    const response = await SELF.fetch('http://localhost/healthz');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});

describe('GET /client-config', () => {
  it('returns every top-level field the old server returned', async () => {
    const response = await SELF.fetch('http://localhost/client-config?v=v1');
    const clientConfig = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(Object.keys(clientConfig)).toEqual(
      expect.arrayContaining(Object.keys(capturedClientConfig.response)),
    );
    expect(describeShape(clientConfig.authProviders)).toEqual(
      describeShape(capturedClientConfig.response.authProviders),
    );
  });

  it('turns optional features off and derives URLs from the request', async () => {
    const response = await SELF.fetch(
      'https://crm.example.com/client-config?v=v1',
    );
    const clientConfig = (await response.json()) as Record<string, unknown>;

    expect(clientConfig).toMatchObject({
      authProviders: {
        password: true,
        google: false,
        microsoft: false,
        magicLink: false,
        sso: [],
      },
      billing: { isBillingEnabled: false },
      isMultiWorkspaceEnabled: false,
      isCookieSessionEnabled: true,
      isGoogleMessagingEnabled: false,
      isGoogleCalendarEnabled: false,
      isMicrosoftMessagingEnabled: false,
      isMicrosoftCalendarEnabled: false,
      isImapSmtpCaldavEnabled: false,
      aiModels: [],
      serverUrl: 'https://crm.example.com',
      frontDomain: 'crm.example.com',
    });
  });
});

describe('unknown API routes', () => {
  it('returns a JSON 404', async () => {
    const response = await SELF.fetch('http://localhost/rest/companies');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      statusCode: 404,
      error: 'NOT_FOUND',
    });
  });
});
