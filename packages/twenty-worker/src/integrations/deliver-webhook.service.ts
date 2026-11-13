import { createHmac, randomBytes } from 'node:crypto';

import { validateWebhookUrl } from '@/integrations/validate-webhook-url.util';

export const deliverWebhook = async (
  env: Env,
  durableObjectId: string,
  deliveryId: string,
) => {
  const stub = env.WORKSPACE.get(env.WORKSPACE.idFromString(durableObjectId));
  const delivery = await stub.prepareWebhookDelivery(deliveryId);
  if (!delivery) return;
  if (delivery.retry)
    throw new Error(
      'Webhook delivery is already leased or scheduled for retry',
    );
  try {
    const timestamp = Date.now().toString();
    const response = await fetch(validateWebhookUrl(delivery.targetUrl), {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: {
        'content-type': 'application/json',
        'X-Twenty-Webhook-Id': deliveryId,
        'X-Twenty-Webhook-Timestamp': timestamp,
        'X-Twenty-Webhook-Nonce': randomBytes(16).toString('hex'),
        'X-Twenty-Webhook-Signature': createHmac('sha256', delivery.secret)
          .update(`${timestamp}:${delivery.body}`)
          .digest('hex'),
      },
      body: delivery.body,
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error('Webhook endpoint rejected delivery');
    await stub.completeWebhookDelivery(deliveryId, delivery.attempt, true);
  } catch {
    await stub.completeWebhookDelivery(deliveryId, delivery.attempt, false);
    throw new Error('Webhook delivery failed');
  }
};
