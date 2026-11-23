# MCP server

完整中文接口、参数、错误码及工具名称目录见 [MCP 接口参考](MCP_API_REFERENCE.md)。

The Worker exposes the core CRM through `/mcp`, using stateless Streamable HTTP. It runs in the existing Worker and workspace Durable Object; no additional service, database migration or secret is required.

## Connect

Create an API key in **Settings → Developers → API** and assign a role with the record access the client needs. Configure a remote MCP client with:

```json
{
  "mcpServers": {
    "crm": {
      "url": "https://crm.example.com/mcp?mode=meta",
      "headers": {
        "Authorization": "Bearer <CRM_API_KEY>"
      }
    }
  }
}
```

Client configuration formats vary; select **Streamable HTTP** and supply the URL and Authorization header. The default `/mcp` lists CRM tools directly. `/mcp?mode=meta` lists a small discovery set, which is preferable for workspaces with many objects:

- `list_object_metadata_names`: readable object plural names, converted to snake case.
- `get_object_metadata`: readable object metadata; `includeFields: true` includes readable field definitions.
- `get_tool_catalog`: tool names and descriptions, optionally filtered by `DATABASE_CRUD` or `METADATA` categories.
- `learn_tools`: schemas for up to 20 `toolNames`; optional `aspects` selects `description` and/or `schema`.
- `execute_tool`: invokes a CRM tool using `{ "toolName": "find_many_people", "arguments": { ... } }`.

Use the key on the same origin as the workspace. Every request validates the key's hash, expiry, revocation and current role inside the workspace, including initialization, discovery and notifications. Tool schemas omit unreadable fields and uneditable write fields. Record operations use the same permissions, transactions, file signing, timeline, realtime events and webhook outbox as GraphQL. Writes use the `AGENT` actor source and the key's name.

Existing authenticated workspace sessions also work, with the same session-cookie marker and CSRF checks as the frontend. Requests with an Origin header must match the endpoint origin. Use `/mcp/v1` below for interactive user authorization.

## User-authorized connections

Add `https://crm.example.com/mcp/v1` (or `/mcp/v1?mode=meta`) as a remote Streamable HTTP server in an OAuth-capable MCP client. The client discovers authorization automatically, opens the CRM login/consent page, and exchanges an authorization code using PKCE S256. No API key is required. The tool schemas, arguments and results match `/mcp`.

Each consent grants the `crm` scope for one user, client and workspace. It permits the existing CRM tools within that user's **current** object and field permissions, including permanent deletion and merge where permitted. Row-level permissions are not implemented. Writes retain the user's member identity and use the `AGENT` source. User disablement, workspace suspension, membership removal and role changes affect subsequent requests.

The connection remains active after browser logout. Revoke it in **Settings → Profile → MCP connections**, or use the OAuth revocation endpoint. Access tokens expire after 30 minutes; refresh tokens rotate on every exchange and expire after 30 days without renewal. Reusing an exchanged refresh token revokes its entire grant. MCP tokens are opaque, stored only as hashes, and cannot authenticate ordinary CRM APIs or `/mcp`.

| Endpoint | Purpose |
| --- | --- |
| `GET /.well-known/oauth-protected-resource/mcp/v1` | Resource metadata; also available at the root well-known path |
| `GET /.well-known/oauth-authorization-server` | Authorization-server metadata |
| `POST /oauth/register` | RFC 7591 dynamic registration for public clients (`token_endpoint_auth_method: none`) |
| `GET /oauth/authorize` | Authorization-code flow; requires `resource`, `redirect_uri` and PKCE S256 |
| `POST /oauth/token` | Form-encoded authorization-code or refresh-token exchange |
| `POST /oauth/revoke` | Form-encoded `token` and `client_id`; revokes the connection |

HTTPS Client ID Metadata Documents are also supported. Their `client_id` must exactly match the document URL, and redirects must match the document's registered values. Redirects require HTTPS or loopback HTTP. Authorization and token requests use `resource=https://crm.example.com/mcp/v1`, including when the MCP URL has `?mode=meta`. Token requests include `client_id`; code exchanges also include the original `redirect_uri` and `code_verifier`.

For browser clients, CORS preflight is supported. Authenticated MCP requests carrying an Origin must match the CRM origin, a registered redirect origin, or the HTTPS client metadata origin. Browser consent and connection-management mutations require the signed-in workspace session and same-origin CSRF checks.

## Protocol

POST one JSON-RPC 2.0 message to `/mcp`, with `Content-Type: application/json`. Clients should send `Accept: application/json, text/event-stream`. The server accepts JSON-only clients too. When SSE is accepted, the POST response contains a finite `event: message` stream with the JSON-RPC response; otherwise it returns JSON.

Supported protocol versions are `2025-11-25`, `2025-06-18` (the upstream baseline) and `2025-03-26`. Initialization returns the requested supported version or `2025-11-25`; subsequent requests may send `MCP-Protocol-Version`. Unsupported version headers return HTTP 400.

Implemented methods: `initialize`, `ping`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list` and `prompts/list`. Resource and prompt lists are empty. Notifications return HTTP 202 with no body and never execute tools. The server does not issue session IDs or keep per-client MCP state; GET and DELETE return HTTP 405. It does not offer the legacy GET/SSE transport, progress notifications, resumability or background tasks. A request body is limited to 2,000,000 bytes. Unknown methods/tools produce JSON-RPC errors; tool input and execution failures produce `isError: true` tool results.

Initialize, then send `notifications/initialized` before normal calls:

```sh
curl 'https://crm.example.com/mcp' \
  -H "Authorization: Bearer $CRM_API_KEY" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"crm-client","version":"1.0.0"}}}'

curl 'https://crm.example.com/mcp' \
  -H "Authorization: Bearer $CRM_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"notifications/initialized"}'

curl 'https://crm.example.com/mcp' \
  -H "Authorization: Bearer $CRM_API_KEY" \
  -H 'Content-Type: application/json' \
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"find_many_people","arguments":{"name":{"firstName":{"ilike":"%Ada%"}},"limit":10,"select":["id","name","emails"]}}}'
```

## CRM tools

Tools are generated from the active workspace metadata and current permissions on each request. Standard and custom objects use the upstream naming grammar: singular for `one`, plural for `many`, both converted to snake case. Object/field changes appear on the next discovery request. Re-list tools or call `learn_tools` after changing metadata or permissions; the server does not push list-change notifications.

| Tool pattern | Arguments and behavior |
| --- | --- |
| `find_many_people` | Top-level field filters and `and`/`or`/`not`, `orderBy`, `limit` (1–100, default 10), `offset`, optional `select`. Returns `records`, total `count`, `hasNextPage` and `endCursor`. Continue with offset when more matches exist. |
| `find_one_person` | `id`, optional `select`; returns `record`. Missing/deleted records produce a tool error. |
| `create_one_person` | Record fields as top-level arguments; returns `record`. |
| `create_many_people` / `upsert_many_people` | `records` array; upsert matches existing unique fields. Returns `records`. |
| `update_one_person` | `id` and changed record fields as top-level arguments. |
| `update_many_people` | `filter` and `data`; applies the same values to all matches. |
| `delete_one_person` / `delete_many_people` | `id` / `filter`; soft delete. |
| `restore_one_person` / `restore_many_people` | `id` / `filter`; restore soft-deleted records. |
| `destroy_one_person` / `destroy_many_people` | `id` / `filter`; permanently delete. |
| `merge_many_people` | `ids`, `conflictPriorityIndex`, optional `dryRun`; preserves relations and permanently removes losing records. |
| `aggregate_people` | Optional `filter` and `aggregates` (default `["totalCount"]`); available names are in the schema description. |
| `group_by_people` | GraphQL-shaped `groupBy`, optional `filter`, `orderBy` and `aggregates`; returns `groups` with dimension values and aggregate results. |
| `search` | `searchInput`, optional `limit` (default 20, maximum 100), `after`, object inclusions/exclusions and common record filters. |

`select: ["*"]` or omitting `select` returns readable fields, including at most one level of relations. Batch mutations affect at most 200 records, including nested writes and merge relation rewrites. Permission failures or invalid records roll back the entire mutation. System-owned workspace members and timeline activities have read tools only. Merge is offered only for non-system objects with the required permissions.

This migrates the upstream MCP protocol, core record tool naming, top-level find filters, and direct/meta discovery modes. Grouping/aggregation inputs are generated from the Worker's GraphQL contract rather than copying the old AI tool schema; clients should discover schemas rather than reuse cached upstream arguments. Metadata tools expose readable objects/fields; configuration writes remain on the existing member-authenticated metadata API. Upstream workflow, AI/skills, app, function, external MCP connector and account/settings tools remain outside the Cloudflare CRM scope.

Protocol references: [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports), [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle), [tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).
