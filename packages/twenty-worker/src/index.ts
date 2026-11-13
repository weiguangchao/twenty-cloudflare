import { Hono } from 'hono';

import { buildClientConfig } from '@/http/build-client-config.util';
import { cleanupExpiredCredentials } from '@/auth/session.service';
import { handleMetadataRequest } from '@/metadata-api/metadata-api';

export { WorkspaceDurableObject } from '@/workspace/workspace.durable-object';

const app = new Hono<{ Bindings: Env }>();

app.get('/healthz', (context) => context.json({ status: 'ok' }));

app.get('/client-config', (context) =>
  context.json(buildClientConfig(new URL(context.req.url))),
);

app.all('/metadata', (context) =>
  handleMetadataRequest(context.req.raw, context.env),
);

// Only API prefixes reach the Worker (assets.run_worker_first), so anything
// unmatched here is an API route that does not exist yet.
app.notFound((context) =>
  context.json({ statusCode: 404, error: 'NOT_FOUND' }, 404),
);

export default {
  fetch: app.fetch,
  scheduled: (
    _controller: ScheduledController,
    env: Env,
    context: ExecutionContext,
  ) => {
    context.waitUntil(cleanupExpiredCredentials(env.CORE_DB));
  },
} satisfies ExportedHandler<Env>;
