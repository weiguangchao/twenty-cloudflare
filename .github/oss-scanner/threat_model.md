# Cloudflare CRM threat model

The CRM runs in `packages/twenty-worker`: Hono routes and GraphQL Yoga dispatch to D1 for account/session/membership data, one SQLite Durable Object per workspace for metadata and records, R2 for files, and Queues for asynchronous delivery. `packages/twenty-front` supplies the React client. Website and documentation are independent of the CRM runtime.

Trust boundaries are browser-to-Worker, Worker-to-workspace object, native email and OAuth providers, webhook destinations, and the separate operator recovery endpoint. Browser state and workspace IDs are untrusted. Resolve sessions and membership from D1, pass an authenticated principal into workspace operations, and enforce role/object/field permissions for every read and mutation. File access uses signed, scoped tokens. API keys are hashed, expire and inherit their assigned role.

Security checks should cover cross-workspace isolation, role changes, CSRF/origin checks, login limits, single-use registration Turnstile tokens, OAuth state/nonce/PKCE and account binding, signed file grants, webhook SSRF/signatures, metadata validation and SQL identifier/value handling. Operator requests use a separate secret and permit only fixed recovery actions; actual workspace recovery requires maintenance mode. Logs must exclude credentials, request bodies and query variables.

Use Node 26, Yarn 4 and the commands in README.md. Build shared dependencies before direct type checking. Worker regression tests execute in workerd with local D1, Durable Objects and R2; Playwright starts an isolated Wrangler instance and creates its own workspace. No PostgreSQL, Redis or Docker services are required.

```bash
npx nx build twenty-shared --skip-nx-cache
npx nx build twenty-worker
cd packages/twenty-worker
npx tsgo -p tsconfig.json --noEmit
npx vitest run --maxWorkers=2 --testTimeout=30000 --hookTimeout=60000
```

Review operational recovery boundaries and the deferred remote acceptance checks in `packages/twenty-worker/OPERATIONS.md` and `STAGE13_VALIDATION.md`. Report a concrete exploit with the affected principal, workspace, request sequence and observed unauthorized behavior. Do not use production credentials or customer data for verification.
