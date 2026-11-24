# Production deployment

Deployed on 2026-11-16 to [twenty-crm-production.tabuxiangma.workers.dev](https://twenty-crm-production.tabuxiangma.workers.dev).

| Item | Value |
| --- | --- |
| Environment | `production` |
| Application source | `e79af13d40994f1644fb80187e9e57c4e493e2e7` |
| Cloudflare version | `3bdd9dbf-a9ff-41ec-a6ae-c915e24e6c91` |
| Worker | `twenty-crm-production` |
| D1 | `twenty-core-production`; migrations 0001–0004 applied |
| R2 | `twenty-files-production` |
| Queue | `twenty-jobs-production`; producer and consumer configured |
| Turnstile | Managed widget scoped to the deployed hostname |
| Cron | Every five minutes |
| MCP | `/mcp`; compact discovery at `/mcp?mode=meta` |

Node 26 production builds and direct frontend/Worker typechecks passed. The Worker bundle is 1,477.11 KiB compressed; Cloudflare reported an 80 ms startup time.

## Public verification

Twelve HTTP/API checks passed: health, homepage, JavaScript asset, SPA fallback, production client config, metadata authentication, registration requiring Turnstile, MCP authentication and Origin checks, REST authentication, hidden operator endpoint, and an empty production account/workspace database.

The application is ready for the owner to create the first administrator account. No test user or workspace was created in production. Authenticated CRM/MCP operations and the interactive Turnstile registration flow still need owner acceptance after account creation; the full CRM/MCP suite was previously validated locally. Transactional email and Google/Microsoft login remain disabled pending provider configuration.

## Recovery verification

The cloud recovery drill completed successfully on 2026-11-16 at 03:18 UTC. It restored an isolated Durable Object and a disposable D1 database from `after` to `before`, verified the readback, and removed both drill resources. It did not restore or modify the production D1 database or a business workspace.

Raw evidence is retained locally under `.wrangler/deployment-smoke-report.json` and `.wrangler/restore-drill-1794799096281.json`. Stable application/operator/Turnstile secrets are stored in the ignored `.wrangler/secrets.production.json` with mode 0600; they are not part of this repository.

Use [OPERATIONS.md](OPERATIONS.md) for redeployment and recovery. GitHub Actions execution, external alert delivery, custom domains and off-platform archival backups remain separate follow-up work.
