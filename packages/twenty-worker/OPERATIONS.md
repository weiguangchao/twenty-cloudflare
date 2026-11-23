# Worker operations

Use Node 26 and run commands here unless a different directory is shown. Initial acceptance targets workers.dev; no custom domain or DNS changes are needed. `wrangler.jsonc` has isolated `dev` and `production` resources. D1, R2 and the first lookup of every workspace Durable Object request Asia-Pacific placement; placement hints are best effort.

The current production URL and verification record are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Provision and deploy

Provide `CLOUDFLARE_API_TOKEN` through a secret store and select `CLOUDFLARE_ACCOUNT_ID`. The token needs Workers Scripts, D1, R2, Queues and account read access. Never put the token in a tracked file or shell history.

```bash
node scripts/provision.mjs production
# From the repository root:
node .yarn/releases/yarn-4.18.1.cjs nx build twenty-worker
# Back in this directory:
node scripts/deploy.mjs production
```

Provisioning reuses resources with the configured names, creates missing ones, and updates the D1 binding ID. It does not enable paid services or change existing DNS. If the account has no workers.dev subdomain, configure one in the Cloudflare dashboard first.

Deployment creates stable random `APP_SECRET` and `OPERATIONS_TOKEN` values and stores them in the ignored, mode-0600 `.wrangler/secrets.production.json`. It uses Wrangler secret bulk, applies D1 migrations and deploys the Worker. Keep an encrypted operator copy outside this checkout before removing local state; rotating `APP_SECRET` invalidates session and file tokens. CI requires stable `APP_SECRET` and `OPERATIONS_TOKEN` secrets from its environment and refuses to generate replacements.

The email binding is disabled by default in remote environments. Configure native email delivery and Google/Microsoft credentials as described in INTEGRATIONS.md. External provider acceptance remains separate from core workers.dev acceptance.

To add a custom hostname later, add its Worker route/domain, redeploy, and use that origin for the single workspace. Do not change an existing workspace origin without a migration.

## Logs and capacity

Workers Logs are enabled with full sampling. HTTP responses carry `x-request-id`; request, metadata and record logs include the request ID, operation, workspace or Durable Object ID, duration and error code where available. No request bodies, query variables, credentials or URL query strings are logged. Queue failures emit `queue_delivery_failed`; delivery retries remain bounded by the queue/outbox policies.

Every workspace alarm logs `sql.databaseSize` at least daily. `workspace_capacity_alert` is emitted at 90% of a conservative 10,000,000,000-byte limit. Route this event and repeated `INTERNAL_SERVER_ERROR`, `GRAPHQL_ERROR`, or queue failure events to the account's log alert destination. Investigate growth and archive records before the object reaches its storage limit. Logs provide the alert signal; an external notification destination must be configured in the account.

## Maintenance and recovery

D1 Time Travel is always enabled: Workers Paid retains 30 days and Workers Free 7 days. SQLite Durable Objects support recovery bookmarks within 30 days. Recover D1 and the affected workspace objects to a coordinated point; restoring only one can leave memberships, files and jobs inconsistent.

1. Pause users and integrations. Set `MAINTENANCE_MODE` to `"true"` for the selected environment and redeploy. APIs return 503; queues retry and alarms defer. Allow in-flight requests to finish before taking recovery actions.
2. Record current D1 and DO bookmarks, workspace IDs and the intended timestamp. Preserve R2 objects; storage recovery does not recreate deleted file blobs or undo external emails/webhooks.
3. Get a D1 bookmark and restore using Wrangler:

   ```bash
   npx wrangler d1 time-travel info CORE_DB --env production --json
   npx wrangler d1 time-travel restore CORE_DB --env production --bookmark <bookmark> --json
   ```

4. Call `POST /cloudflare/operations` with `Authorization: Bearer <OPERATIONS_TOKEN>`. Use an operator script with the token in memory; do not paste it into command history. JSON requests use `workspaceId` and one action: `snapshot`, `prepare-restore` with `bookmark`, or `restart`. `prepare-restore` returns an `undoBookmark`; save it before restarting. Restart aborts its own RPC connection, so verify the subsequent snapshot/readback rather than treating the interrupted response as failure.
5. Check restored metadata, records, role membership, files and pending jobs. Resume only after readback is correct. For rollback, restore the saved undo bookmarks.
6. Set maintenance mode to `"false"`, redeploy, and validate a core read/write operation and queue delivery.

The operator endpoint is disabled without its separate token, accepts no session-cookie authentication, and never accepts arbitrary SQL. Mutating recovery operations require maintenance mode; only isolated `recovery-drill-<uuid>` objects are exempt.

## Recovery drill

Run the drill on the deployed Worker with its operator secret available locally:

```bash
WORKER_URL=https://<worker>.<subdomain>.workers.dev node scripts/restore-drill.mjs production
```

It writes `before`/`after` markers to an isolated DO and a newly created disposable D1 database, restores each to the saved bookmark, checks `before`, deletes the drill resources, and writes a report under `.wrangler/restore-drill-*.json`. Commit a redacted result to STAGE13_VALIDATION.md after a successful remote run. Local workerd tests validate the API guards; they do not prove remote point-in-time recovery.

For retention beyond 30 days, coordinated encrypted exports of D1, workspace SQL/metadata and R2 blobs are needed. CSV exports are not a full recovery backup. This deployment currently uses platform recovery; add off-platform archival exports when a longer retention or account-loss recovery requirement is established. R2 alone shares the same account failure boundary.

Sources: [DO storage/PITR](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [DO placement](https://developers.cloudflare.com/durable-objects/reference/data-location/).
