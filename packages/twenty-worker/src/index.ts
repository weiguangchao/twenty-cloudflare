import { Hono } from 'hono';

import { buildClientConfig } from '@/http/build-client-config.util';

export { WorkspaceDurableObject } from '@/workspace/workspace.durable-object';

const app = new Hono<{ Bindings: Env }>();

app.get('/healthz', (context) => context.json({ status: 'ok' }));

app.get('/client-config', (context) =>
  context.json(buildClientConfig(new URL(context.req.url))),
);

// Only API prefixes reach the Worker (assets.run_worker_first), so anything
// unmatched here is an API route that does not exist yet.
app.notFound((context) =>
  context.json({ statusCode: 404, error: 'NOT_FOUND' }, 404),
);

export default app;
