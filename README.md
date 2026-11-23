# CRM on Cloudflare

This fork runs the CRM on Cloudflare Workers. The React frontend and GraphQL APIs share one origin; workspace records and metadata live in a SQLite Durable Object, instance accounts and sessions in D1, and uploaded files in R2. Queues deliver background file cleanup, email and webhook jobs.

Core CRM includes people, companies, opportunities, tasks, notes, custom objects and fields, table and Kanban views, record layouts, search, CSV import/export, files, roles and permissions, invitations and realtime updates. Optional email delivery, REST/API keys, webhooks and Google/Microsoft login are implemented; provider setup is described in [INTEGRATIONS.md](packages/twenty-worker/INTEGRATIONS.md).

The [MCP server](packages/twenty-worker/MCP.md) exposes permission-aware CRM tools over stateless Streamable HTTP. `/mcp/v1` supports user OAuth authorization, token renewal and revocation; `/mcp` accepts existing API keys and sessions. Add `?mode=meta` for compact tool discovery.

The application platform, SDK/CLI, workflow/AI, billing, email/calendar synchronization and old container backend have been removed from this fork. The independent documentation and marketing website remain as upstream reference material.

## Local development

Use Node 26 and the repository's Yarn 4 release:

```bash
node .yarn/releases/yarn-4.18.1.cjs install --immutable
bash packages/twenty-utils/setup-dev-env.sh
node .yarn/releases/yarn-4.18.1.cjs start
```

Open http://localhost:3000 and create the first account and workspace. Development uses local D1, R2, Queues and Durable Objects through Wrangler; PostgreSQL, Redis and Docker are unnecessary. For frontend hot reload, run `node .yarn/releases/yarn-4.18.1.cjs start:front` in another terminal and open http://localhost:3001.

## Packages

| Package | Purpose |
| --- | --- |
| `twenty-worker` | Worker APIs, D1 migrations, workspace Durable Objects and operations |
| `twenty-front` | CRM interface |
| `twenty-shared` / `twenty-ui` | Shared domain utilities and UI components |
| `twenty-emails` | Email templates |
| `twenty-e2e-testing` | Playwright tests against an isolated local Worker |
| `twenty-utils` / `twenty-oxlint-rules` | Development and repository tooling |
| `twenty-website` / `twenty-docs` | Independent website and reference documentation |

## Verification

```bash
node .yarn/releases/yarn-4.18.1.cjs nx build twenty-shared --skip-nx-cache
node .yarn/releases/yarn-4.18.1.cjs nx build twenty-emails
node .yarn/releases/yarn-4.18.1.cjs nx build twenty-front
cd packages/twenty-worker
npx tsgo -p tsconfig.json --noEmit
npx vitest run --maxWorkers=2 --testTimeout=30000 --hookTimeout=60000
node scripts/export-schemas.mjs
cd ../twenty-front
npx tsgo -p tsconfig.json --noEmit
npx graphql-codegen --config codegen.cjs
npx graphql-codegen --config codegen-metadata.cjs
cd ../twenty-e2e-testing
npx playwright install chromium
npx playwright test
```

Playwright creates temporary local storage and starts its own Worker on port 3030. It creates a workspace through the UI and removes the temporary storage when it exits.

## Deployment and recovery

Start with workers.dev. Resource provisioning, secrets, deployment, logs and recovery are documented in [OPERATIONS.md](packages/twenty-worker/OPERATIONS.md). The migration scope and evidence are in [CLOUDFLARE_MIGRATION.md](CLOUDFLARE_MIGRATION.md).

CRM is licensed under [AGPL-3.0](LICENSE).
