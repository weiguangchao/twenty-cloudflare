import { isIP } from 'node:net';

import { apiError } from '@/shared/errors/api-error.util';

export const validateWebhookUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw apiError('Invalid webhook URL');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (
    value.length > 2048 ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    !hostname.includes('.') ||
    isIP(hostname) ||
    /(^|\.)(localhost|local|internal|test|invalid|onion)$/.test(hostname) ||
    hostname === 'metadata.google.internal' ||
    (url.port && url.port !== '443')
  )
    throw apiError('Webhook URL must use a public HTTPS hostname');
  return url.href;
};
