import { createRemoteJWKSet, customFetch, decodeJwt, jwtVerify } from 'jose';
import { isValidUuid } from 'twenty-shared/utils';

import { type oauthProvider } from '@/auth/oauth/oauth-provider.util';
import { apiError } from '@/shared/errors/api-error.util';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export const verifyProviderToken = async (
  token: string,
  provider: ReturnType<typeof oauthProvider>,
  nonce: string,
) => {
  if (token.length > 16_384)
    throw apiError('Invalid identity token', 'UNAUTHENTICATED');
  const decoded = decodeJwt(token);
  let issuers: string[];
  let keyUrl: string;
  if (provider.name === 'google') {
    issuers = ['https://accounts.google.com', 'accounts.google.com'];
    keyUrl = 'https://www.googleapis.com/oauth2/v3/certs';
  } else {
    const tenant = decoded.tid;
    if (
      typeof tenant !== 'string' ||
      !isValidUuid(tenant) ||
      (isValidUuid(provider.tenant) &&
        tenant.toLowerCase() !== provider.tenant.toLowerCase()) ||
      (provider.tenant === 'consumers' &&
        tenant !== '9188040d-6c67-4c5b-b112-36a304b66dad') ||
      (provider.tenant === 'organizations' &&
        tenant === '9188040d-6c67-4c5b-b112-36a304b66dad')
    )
      throw apiError('Microsoft tenant is not allowed', 'FORBIDDEN');
    issuers = [`https://login.microsoftonline.com/${tenant}/v2.0`];
    keyUrl = `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`;
  }
  let keySet = keySets.get(keyUrl);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(keyUrl), {
      [customFetch]: (...arguments_) => fetch(...arguments_),
      timeoutDuration: 5000,
    });
    keySets.set(keyUrl, keySet);
  }
  const { payload } = await jwtVerify(token, keySet, {
    algorithms: ['RS256'],
    audience: provider.clientId,
    issuer: issuers,
    requiredClaims: ['sub', 'exp', 'iat', 'nonce'],
    maxTokenAge: '10 minutes',
    clockTolerance: 5,
  });
  if (
    payload.nonce !== nonce ||
    (payload.azp && payload.azp !== provider.clientId)
  )
    throw apiError(
      'Invalid identity token nonce or audience',
      'UNAUTHENTICATED',
    );
  return payload;
};
