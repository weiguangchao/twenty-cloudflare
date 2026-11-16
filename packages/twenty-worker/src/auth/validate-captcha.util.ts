import { isPlainObject } from 'twenty-shared/utils';

import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';

export const validateCaptcha = async (
  context: MetadataContext,
  token?: string | null,
) => {
  if (!context.env.TURNSTILE_SITE_KEY && !context.env.TURNSTILE_SECRET_KEY)
    return;
  if (
    !context.env.TURNSTILE_SITE_KEY ||
    !context.env.TURNSTILE_SECRET_KEY ||
    !token ||
    token.length > 2048
  )
    throw apiError('Captcha verification required', 'FORBIDDEN');

  const body = new URLSearchParams({
    secret: context.env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  const remoteAddress = context.request.headers.get('cf-connecting-ip');
  if (remoteAddress) body.set('remoteip', remoteAddress);

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body, signal: AbortSignal.timeout(10_000) },
    );
    const result: unknown = await response.json();
    if (
      response.ok &&
      isPlainObject(result) &&
      result.success === true &&
      result.hostname === new URL(context.request.url).hostname
    )
      return;
  } catch {
    throw apiError('Captcha verification unavailable', 'FORBIDDEN');
  }
  throw apiError('Captcha verification failed', 'FORBIDDEN');
};
