import { handleOAuthRequest } from '@/auth/oauth/oauth-login.service';
import { deliverWebhook } from '@/integrations/deliver-webhook.service';
import { handleRestRequest } from '@/http/handle-rest-request.util';
import {
  deliverEmail,
  dispatchPendingEmails,
} from '@/emails/email-delivery.service';
import { Hono } from 'hono';

import { buildClientConfig } from '@/http/build-client-config.util';
import { cleanupExpiredCredentials } from '@/auth/session.service';
import { handleMetadataRequest } from '@/metadata-api/metadata-api';
import { handleRecordRequest } from '@/http/handle-record-request.util';
import {
  handleFileDownloadRequest,
  handleFileUploadRequest,
} from '@/http/handle-file-request.util';
import { isPlainObject } from 'twenty-shared/utils';

export { WorkspaceDurableObject } from '@/workspace/workspace.durable-object';

const app = new Hono<{ Bindings: Env }>();

app.get('/healthz', (context) => context.json({ status: 'ok' }));

app.get('/client-config', (context) =>
  context.json(buildClientConfig(new URL(context.req.url), context.env)),
);

app.all('/metadata', (context) =>
  handleMetadataRequest(context.req.raw, context.env),
);

app.get('/auth/:provider', (context) =>
  handleOAuthRequest(
    context.req.raw,
    context.env,
    context.req.param('provider'),
    false,
  ),
);
app.get('/auth/:provider/redirect', (context) =>
  handleOAuthRequest(
    context.req.raw,
    context.env,
    context.req.param('provider'),
    true,
  ),
);

app.all('/rest/*', (context) =>
  handleRestRequest(context.req.raw, context.env),
);

app.post('/graphql', (context) =>
  handleRecordRequest(context.req.raw, context.env),
);

app.put('/file-upload/:id', (context) =>
  handleFileUploadRequest(
    context.req.raw,
    context.env,
    context.req.param('id'),
  ),
);
app.on(['GET', 'HEAD'], '/file/:folder/:id', (context) =>
  handleFileDownloadRequest(
    context.req.raw,
    context.env,
    context.req.param('folder'),
    context.req.param('id'),
  ),
);

// Only API prefixes reach the Worker (assets.run_worker_first), so anything
// unmatched here is an API route that does not exist yet.
app.notFound((context) =>
  context.json({ statusCode: 404, error: 'NOT_FOUND' }, 404),
);

export default {
  fetch: app.fetch,
  queue: async (batch: MessageBatch<unknown>, env: Env) => {
    for (const message of batch.messages) {
      try {
        const body = message.body;
        if (
          isPlainObject(body) &&
          body.kind === 'webhook-send' &&
          typeof body.durableObjectId === 'string' &&
          typeof body.deliveryId === 'string'
        ) {
          await deliverWebhook(env, body.durableObjectId, body.deliveryId);
          message.ack();
          continue;
        }
        if (
          isPlainObject(body) &&
          body.kind === 'email-send' &&
          typeof body.jobId === 'string'
        ) {
          await deliverEmail(env, body.jobId);
          message.ack();
          continue;
        }
        if (
          !isPlainObject(body) ||
          body.kind !== 'file-delete' ||
          typeof body.workspaceId !== 'string' ||
          !Array.isArray(body.fileIds) ||
          body.fileIds.some((id) => typeof id !== 'string')
        )
          throw new Error('Invalid file deletion job');
        await env.WORKSPACE.get(
          env.WORKSPACE.idFromName(body.workspaceId),
        ).deleteFiles(body.fileIds as string[]);
        message.ack();
      } catch {
        message.retry();
      }
    }
  },
  scheduled: (
    _controller: ScheduledController,
    env: Env,
    context: ExecutionContext,
  ) => {
    context.waitUntil(cleanupExpiredCredentials(env.CORE_DB));
    context.waitUntil(dispatchPendingEmails(env));
  },
} satisfies ExportedHandler<Env>;
