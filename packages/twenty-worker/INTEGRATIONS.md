# Optional integrations

Stage 12 adds transactional email, API keys, the core REST API, webhooks, and Google/Microsoft sign in. All storage and delivery run on Cloudflare. Email and social login stay disabled until their configuration is supplied. API key and webhook management require `API_KEYS_AND_WEBHOOKS`; assigned roles control record and field access.

Apply D1 migrations before starting the updated Worker:

```sh
cd packages/twenty-worker
npx wrangler d1 migrations apply twenty-core --local
npx wrangler dev
```

Use `--remote` for the production database during deployment. Workspace DO migration `0008-initialize-integrations` runs automatically when each workspace starts. Build `twenty-emails` before building or testing the Worker; Nx's dependency build already includes it.

## Email

The Worker has a native `send_email` binding named `EMAIL`. Set `EMAIL_FROM` to an address on your onboarded Cloudflare Email Sending domain. Set `EMAIL_VERIFICATION_REQUIRED=true` to require email verification for password registrations. Leave it unset to preserve the existing registration behavior. Email sending must be configured before enabling that requirement.

Cloudflare Email Sending is currently beta and requires Workers Paid for arbitrary recipients. Onboard the sending domain in **Compute → Email Service → Email Sending**, and verify its SPF, DKIM, DMARC and bounce MX records. Restrict the binding's `allowed_sender_addresses` to your configured sender in production.

Local values go in the ignored `.dev.vars` file:

```dotenv
APP_SECRET=replace-with-a-long-random-secret
EMAIL_FROM=twenty@your-domain.example
EMAIL_VERIFICATION_REQUIRED=true
```

`wrangler dev` simulates sending, saving HTML/text files beneath `.wrangler/tmp/email`. It does not deliver mail externally. Do not enable a remote email binding for local acceptance tests.

Supported flows:

- `sendInvitations`, `findWorkspaceInvitations`, `resendWorkspaceInvitation`, `deleteWorkspaceInvitation`: seven day invitations, scoped to the recipient email and workspace, with optional role assignment. Personal invitations work while public invitation links are disabled. Existing accounts must authenticate before joining.
- `emailPasswordResetLink`, `validatePasswordResetToken`, `updatePasswordViaResetToken`: one hour, single use links. Resetting a password revokes the user's sessions. Unknown emails receive the same success response.
- `resendEmailVerificationToken`, `verifyEmailAndGetLoginToken`, `verifyEmailAndGetWorkspaceAgnosticToken`: one hour links, checked against the recipient and request origin. Resending invalidates earlier verification links.

Templates and their translations come from `twenty-emails`. Subjects use the translated template heading. The prebuilt package loads inside the delivery handler because it evaluates UUID defaults during initialization.

D1 stores email jobs before Queue dispatch. Queue messages contain the job ID; a five minute scheduled dispatcher recovers jobs if initial Queue dispatch fails. Delivery uses leases and exponential retry, with at most ten sending attempts. Delivery can repeat if a process stops after sending but before recording success; `X-CRM-Delivery-Id` remains stable. Completed jobs erase their payload, and expired jobs are removed. Pending payloads contain the action link until delivery or expiry, so treat local email artifacts and database backups as sensitive.

## API keys and REST

Create a key in **Settings → Developers → API**, select an assignable role, then copy the generated token. `createApiKey` creates the configuration; `generateApiKeyToken` returns a token once and stores its hash. Generating another token rotates the old one. `assignRoleToApiKey`, `updateApiKey` and `revokeApiKey` apply immediately.

Use the token as a Bearer credential for `/graphql`, `/rest`, or the [MCP server](MCP.md) at `/mcp`. It is bound to its workspace origin and does not grant access to account or settings mutations on `/metadata`.

```sh
curl 'https://crm.example.com/rest/companies?limit=20&fields=id,name' \
  -H "Authorization: Bearer $TWENTY_API_KEY"

curl 'https://crm.example.com/rest/companies' \
  -H "Authorization: Bearer $TWENTY_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"name":"Example company"}'
```

REST endpoints use object plural names, including custom objects:

| Method and path | Behavior |
| --- | --- |
| `GET /rest/:objects` | List records with `data[objects]`, `totalCount` and `pageInfo` |
| `GET /rest/:objects/:id` | Read one record |
| `POST /rest/:objects` | Create one record; `upsert=true` enables upsert |
| `POST /rest/batch/:objects` | Create an array of records atomically |
| `PATCH /rest/:objects/:id` | Update one record; `PUT` is an alias |
| `PATCH /rest/:objects?filter=...` | Update matching records |
| `DELETE /rest/:objects/:id` | Permanently destroy a record, matching the existing REST default |
| `DELETE /rest/:objects/:id?soft_delete=true` | Soft delete a record |
| `DELETE /rest/:objects?filter=...` | Delete/destroy matching records |
| `PATCH /rest/:objects/:id/restore` | Restore one record |
| `PATCH /rest/:objects/restore?filter=...` | Restore matching records |

List parameters are `limit` (1–500, default 60), `offset`, `starting_after`, `ending_before`, `fields`, and `depth` (0–2, default 1). Relations use arrays rather than GraphQL connection wrappers. `order_by=name.AscNullsLast` or a JSON array selects sorting. Filters accept JSON GraphQL filters or REST notation such as `name[eq]:Example`, `and(name[eq]:Example,employees[gte]:10)`, `or(...)`, and `not(...)`; URL encode the expression. Field permissions also apply to filters, sorting and relation expansion. For search, aggregation, grouping, duplicates, merge and richer selections, use the existing `/graphql` operations with the same API key.

## Webhooks

Create a webhook in **Settings → Developers → Webhooks**. Choose an assignable role, a public HTTPS endpoint, and operations such as `person.created`, `company.*`, `*.deleted` or `*.*`. A signing secret is generated when the secret field is empty. Literal IP addresses, credentials in URLs, local hostnames, nonstandard ports and redirects are rejected. `global_fetch_strictly_public` keeps outbound fetches on public routing, including requests to the Worker's own zone.

Record changes enqueue deliveries in the same DO transaction. The outbox sends delivery IDs to Queue; the Worker obtains the current endpoint, secret and role permissions, projects readable data, then sends the request. Deleting a webhook cancels pending deliveries. Hidden fields and their diffs are excluded, and inaccessible objects are not delivered. Metadata events remain on SSE; webhook operation patterns cover record changes.

The JSON body contains `deliveryId`, `webhookId`, `workspaceId` when available, `eventName`, `eventDate`, `objectMetadata`, `record`, and `updatedFields` when applicable. Receivers must deduplicate `deliveryId` because delivery is at least once. Failed requests use backoff, with at most ten attempts within 24 hours; DO alarms recover deliveries when Queue dispatch or consumer retries are exhausted.

Headers:

- `X-CRM-Webhook-Id`: stable delivery ID.
- `X-CRM-Webhook-Timestamp`: current Unix time in milliseconds.
- `X-CRM-Webhook-Nonce`: random nonce for this attempt.
- `X-CRM-Webhook-Signature`: hex HMAC-SHA256 of `timestamp + ':' + rawBody`, using the webhook secret.

Verify the signature using the exact request bytes and compare in constant time. Reject stale timestamps and deduplicate delivery IDs. Requests time out after five seconds. No webhook secret or record payload is put in Queue messages.

## Google and Microsoft login

Configure each provider separately. Supply the client ID as configuration and the client secret through `wrangler secret put GOOGLE_CLIENT_SECRET` or `wrangler secret put MICROSOFT_CLIENT_SECRET`; use `.dev.vars` locally.

| Configuration | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Web OAuth client |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Microsoft Web application registration |
| `MICROSOFT_TENANT_ID` | Tenant UUID, `organizations`, `consumers`, or default `common` |

Register these exact callback URLs for the deployed origin:

```text
https://crm.example.com/auth/google/redirect
https://crm.example.com/auth/microsoft/redirect
```

The existing frontend starts `/auth/google` or `/auth/microsoft`; callbacks return `/verify?loginToken=...`. Only `openid profile email` is requested. Provider access/refresh tokens are not retained, and no mail/calendar scope is requested.

The flow uses a ten minute, single use state record bound to an httpOnly browser cookie, PKCE S256, and a nonce. `jose` verifies RS256 signatures against provider JWKS, issuer, audience, expiry and token age; Microsoft tenant restrictions are also enforced. Accounts are identified by provider + issuer + subject after binding.

An authenticated account owner can bind a provider with the same email. Google Gmail and verified Workspace domain emails can establish ownership directly. Other Google email addresses and Microsoft email claims require a local email verification link before binding, unless a matching personal invitation proves ownership. Configure email sending for those flows. Unverified users cannot create or access a workspace. Existing identities keep their account even if a later provider email claim changes.

Real delivery and provider login require the external domain/application configuration above. Local tests use the native email simulator and signed test identity tokens with mocked provider endpoints; they do not send mail or authenticate against real provider accounts.
