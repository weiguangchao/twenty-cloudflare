import { apiError } from '@/shared/errors/api-error.util';

export type OAuthProvider = 'google' | 'microsoft';
export type OAuthBinding = {
  provider: OAuthProvider;
  issuer: string;
  subject: string;
};

export const oauthProviders = (env?: Env) => ({
  google: Boolean(env?.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  microsoft: Boolean(env?.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET),
  password: true,
  magicLink: false,
  sso: [],
});

export const oauthProvider = (env: Env, provider: string) => {
  if (provider !== 'google' && provider !== 'microsoft')
    throw apiError('Unknown login provider', 'NOT_FOUND');
  if (!oauthProviders(env)[provider])
    throw apiError('Login provider is not configured', 'NOT_IMPLEMENTED');
  const tenant = env.MICROSOFT_TENANT_ID || 'common';
  if (!/^(common|organizations|consumers|[0-9a-fA-F-]{36})$/.test(tenant))
    throw apiError('Invalid Microsoft tenant configuration');
  return {
    name: provider as OAuthProvider,
    clientId: (provider === 'google'
      ? env.GOOGLE_CLIENT_ID
      : env.MICROSOFT_CLIENT_ID)!,
    clientSecret: (provider === 'google'
      ? env.GOOGLE_CLIENT_SECRET
      : env.MICROSOFT_CLIENT_SECRET)!,
    authorizationUrl:
      provider === 'google'
        ? 'https://accounts.google.com/o/oauth2/v2/auth'
        : `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl:
      provider === 'google'
        ? 'https://oauth2.googleapis.com/token'
        : `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    tenant,
  };
};
