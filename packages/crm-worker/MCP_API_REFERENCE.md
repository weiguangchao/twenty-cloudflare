# CRM Cloudflare MCP 完整接口参考

更新日期：2026-11-16。工具接口基线：`5da5cb82afc`；用户授权入口为 `/mcp/v1`。本文件依据 Worker 源码和本地运行服务的实际工具清单编写。

本文包含 HTTP 入口、全部 JSON-RPC 方法、6 个通用工具、16 类对象工具的参数与响应，以及标准对象和当前验收工作区的完整工具名称目录。动态字段以调用者当次获取的 `inputSchema` 为准。

## 1. 连接、认证与模式

### 1.1 HTTP 入口

| 项目 | 取值 |
| --- | --- |
| 本地服务 | `http://localhost:3000` |
| 直接模式 | `POST /mcp` |
| Meta 模式 | `POST /mcp?mode=meta` |
| 传输 | 无状态 Streamable HTTP |
| 请求编码 | UTF-8 JSON；每个 POST 只能包含一个 JSON-RPC 消息 |
| 请求体上限 | 2,000,000 字节，固定长度与流式请求均检查 |
| 会话 | 不签发 `Mcp-Session-Id`，不需要维护 MCP 会话 ID |

已认证的 `GET`、`DELETE` 及其他非 POST 请求返回 `405`，并包含 `Allow: POST`。匿名请求可能先返回 `401`。这里不提供旧版 GET/SSE 长连接入口。

部署后将本地地址替换为实际 Worker 或域名的 origin，路径及请求格式不变。

### 1.2 请求头

| 请求头 | 说明 |
| --- | --- |
| `Authorization: Bearer <API_KEY>` | 推荐的外部客户端认证方式。在 Settings → Developers → API 创建密钥并分配角色。 |
| `Content-Type: application/json` | POST 必须提供，允许带 charset。 |
| `Accept: application/json, text/event-stream` | 推荐。仅接受 JSON 的客户端也可用；省略时按 JSON 处理。 |
| `MCP-Protocol-Version` | 初始化后的请求建议携带协商版本；不支持的值返回 HTTP 400。 |
| `Origin` | 可以省略；提供时必须与 MCP 地址的 origin 完全相同，包含协议、主机及端口。 |

API key 与 workspace origin 绑定，例如为 `http://localhost:3000` 创建的 key 不能改用 `http://127.0.0.1:3000`。每次请求都会检查密钥 hash、有效期、撤销状态和当前角色，初始化、发现及通知也不例外。

也支持现有 workspace 登录会话。Cookie 请求需要 `Cookie`、`x-crm-session-cookie: 1` 和匹配的 `Origin`；Cookie 名称沿用应用的 `crm-session` / `__Host-crm-session` 规则。外部客户端通常直接使用 API key。

`/mcp` 保留上述凭证方式。面向用户的 OAuth 入口为 `/mcp/v1`，支持 `/mcp/v1?mode=meta`，工具参数和返回值与本文一致。

用户在客户端添加该地址后，通过标准授权发现、CRM 登录和授权确认，获得绑定本人、客户端和工作区的 MCP 专用 token。授权范围为 `crm`，使用用户当前对象与字段权限，包含其有权限执行的永久删除及合并。当前没有行级权限。

授权独立于网页会话；可在 Settings → Profile → MCP connections 撤销。Access token 有效期 30 分钟，refresh token 每次使用后轮换，30 天未续期失效；复用旧 refresh token 会撤销整个连接。MCP 专用 token 不能用于普通 CRM API 或旧 `/mcp`。

授权发现、动态客户端注册、Client ID Metadata Documents 和标准端点参数见 [用户授权说明](MCP.md#user-authorized-connections)。

### 1.3 客户端配置示例

```json
{
  "mcpServers": {
    "crm": {
      "url": "http://localhost:3000/mcp?mode=meta",
      "headers": {
        "Authorization": "Bearer <API_KEY>"
      }
    }
  }
}
```

客户端配置字段可能不同；需要填写的是 Streamable HTTP 地址和 Authorization 请求头。文中的 `<API_KEY>` 和示例 UUID 均需替换为实际值。

### 1.4 两种工具发现模式

| 模式 | `tools/list` 返回的内容 |
| --- | --- |
| `/mcp` | 当前可用的对象工具，加上 `search`、`list_object_metadata_names`、`get_object_metadata`。 |
| `/mcp?mode=meta` | 固定列出 `list_object_metadata_names`、`get_object_metadata`、`get_tool_catalog`、`learn_tools`、`execute_tool` 五个工具。 |

模式只影响发现列表，具名调用仍使用同一工具目录和权限检查。Meta 模式适合对象较多的工作区：先获取目录和少量 schema，再通过 `execute_tool` 调用。

## 2. JSON-RPC 与返回格式

### 2.1 请求

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "find_many_people",
    "arguments": {
      "limit": 10,
      "select": ["id", "name", "emails"]
    }
  }
}
```

`id` 使用字符串或有限数值，不能为 `null`。`params` 提供时必须是对象。JSON-RPC 批量请求数组不受支持；批量记录操作应使用 `create_many_*` 等工具。

无 `id` 的合法消息按通知处理，返回 `202` 空响应，且不会执行工具。因此写操作必须包含 `id`。

### 2.2 工具成功响应

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"records\":[],\"count\":0,\"hasNextPage\":false,\"endCursor\":null}"
      }
    ],
    "structuredContent": {
      "records": [],
      "count": 0,
      "hasNextPage": false,
      "endCursor": null
    },
    "isError": false
  }
}
```

`structuredContent` 是结构化结果；`content[0].text` 是同一结果的 JSON 字符串。下文各工具的“返回”均指 `structuredContent`，响应示例省略了其他可读记录字段。

工具输入或执行失败时，返回 `result.isError: true` 和文本错误说明，通常仍为 HTTP 200。协议、认证及 HTTP 错误见第 9 节。

### 2.3 SSE 响应

Accept 中包含 `text/event-stream` 时，POST 返回一个有限 SSE 响应流：

```text
event: message
data: {"jsonrpc":"2.0","id":1,"result":{}}

```

发送 JSON-RPC 结果后结束响应。不支持进度通知、后台任务、事件重放或断线续传。

## 3. 全部协议方法

| method | params | 返回/行为 |
| --- | --- | --- |
| `initialize` | 见 3.1 | 协商协议版本，返回能力、服务信息和工具使用说明。 |
| `ping` | 可省略 | `{}`。 |
| `tools/list` | 可省略或 `{}` | `{ "tools": [...] }`；当前一次返回全部，不支持 cursor。 |
| `tools/call` | `name: string`；`arguments?: object` | 调用工具，返回第 2 节的工具结果。 |
| `resources/list` | 可省略 | `{ "resources": [] }`。 |
| `resources/templates/list` | 可省略 | `{ "resourceTemplates": [] }`。 |
| `prompts/list` | 可省略 | `{ "prompts": [] }`。 |

### 3.1 initialize

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `protocolVersion` | 是 | 支持 `2025-11-25`、`2025-06-18`、`2025-03-26`。 |
| `capabilities` | 是 | 客户端能力对象，无特殊能力时使用 `{}`。 |
| `clientInfo` | 是 | 必须包含字符串 `name` 和 `version`。 |

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {},
    "clientInfo": { "name": "crm-client", "version": "1.0.0" }
  }
}
```

返回所请求的受支持版本；请求未知版本时返回 `2025-11-25`。服务能力为：

```json
{
  "tools": { "listChanged": false },
  "resources": { "listChanged": false },
  "prompts": { "listChanged": false }
}
```

`serverInfo` 为 `{ "name": "CRM on Cloudflare", "version": "1.0.0" }`。随后客户端发送：

```json
{ "jsonrpc": "2.0", "method": "notifications/initialized" }
```

再调用 `tools/list` 或 `tools/call`。服务端不保存 MCP 初始化会话状态。

通知只被接受后忽略，不实现取消正在执行工具的机制。

### 3.2 tools/list 的工具描述

```json
{ "jsonrpc": "2.0", "id": 2, "method": "tools/list" }
```

每个工具包含：

| 字段 | 说明 |
| --- | --- |
| `name` | `tools/call.params.name` 使用的精确名称。 |
| `description` | 工具用途及部分约束说明。 |
| `inputSchema` | JSON Schema；包含 `properties`、`required`、`additionalProperties: false`，以及按需生成的 `definitions`。 |
| `annotations` | `readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint`。当前只读工具标记为只读/幂等；写工具保守标记为 destructive；openWorld 均为 false。 |

对象、字段和角色变化会在下次发现时生效。服务端不推送列表变化通知，客户端需主动重新发现。传入 `cursor` 返回 `-32602`。

客户端校验 arguments 时，应使用完整 inputSchema，保留其中的 definitions 和 $ref 引用。

## 4. 六个通用工具

### 4.1 list_object_metadata_names

参数：`{}`。

返回可读对象的复数名称，转换为 snake_case 并排序，供拼接工具名称使用：

```json
{ "objectNames": ["companies", "people", "opportunities"] }
```

### 4.2 get_object_metadata

| 参数 | 类型 | 必填 | 默认值/说明 |
| --- | --- | --- | --- |
| `id` | string | 否 | 对象元数据 ID，不是记录 ID。 |
| `objectName` | string | 否 | 精确匹配单数或复数名称，如 `person`、`people`。 |
| `includeFields` | boolean | 否 | `false`；为 true 时返回可读字段定义。 |
| `limit` | integer | 否 | `100`，范围 1–100。 |

同时提供 id 与 objectName 时，两者都要匹配。未找到或对象不可读时返回空数组。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_object_metadata",
    "arguments": { "objectName": "person", "includeFields": true }
  }
}
```

返回 `{ "objects": [...] }`。每个对象含 `id`、`nameSingular`、`namePlural`、`labelSingular`、`labelPlural`。字段含 `id`、`name`、`type`、`label`、`isNullable`、`options`。被隐藏的字段不会返回。

### 4.3 get_tool_catalog

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `categories` | string[] | 否 | `DATABASE_CRUD`、`METADATA`；省略时包含两类，空数组或不匹配的类别得到空目录。 |

返回 `{ "catalog": { "DATABASE_CRUD": [...], "METADATA": [...] } }`，每项包含 `name` 和 `description`。目录不包含三个 DISCOVERY 工具本身。

### 4.4 learn_tools

| 参数 | 类型 | 必填 | 默认值/说明 |
| --- | --- | --- | --- |
| `toolNames` | string[] | 是 | 一次最多 20 个，允许空数组。 |
| `aspects` | string[] | 否 | 默认 `["description", "schema"]`；元素只能是 `description`、`schema`。空数组仅返回名称。 |

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "learn_tools",
    "arguments": {
      "toolNames": ["find_many_people", "create_one_person"],
      "aspects": ["description", "schema"]
    }
  }
}
```

返回 `{ "tools": [...], "notFound": [...] }`。tools 中每项有 name，并按 aspects 包含 description 和/或 inputSchema。不可用名称进入 notFound。

### 4.5 execute_tool

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `toolName` | string | 是 | 目标工具的精确名称。 |
| `arguments` | object | 否 | 省略时按 `{}`；必须匹配目标工具 schema。 |

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "execute_tool",
    "arguments": {
      "toolName": "find_many_people",
      "arguments": { "limit": 10, "select": ["id", "name"] }
    }
  }
}
```

返回目标工具的结构化结果，不额外嵌套工具结果信封。它不能嵌套执行 `execute_tool`、`learn_tools` 或 `get_tool_catalog`，这些发现工具应直接调用。

### 4.6 search

| 参数 | 类型 | 必填 | 默认值/说明 |
| --- | --- | --- | --- |
| `searchInput` | string | 是 | 最长 2048 个字符，不能包含 NUL。支持中文，少于 3 个字符的词有短词匹配回退。 |
| `limit` | integer | 否 | `20`，范围 1–100。 |
| `after` | string | 否 | 上页返回的 endCursor。 |
| `includedObjectNameSingulars` | string[] | 否 | 使用原始单数名称，如 `person`、`company`，不是工具名或复数名。 |
| `excludedObjectNameSingulars` | string[] | 否 | 排除的原始单数名称。 |
| `filter` | object | 否 | 公共记录筛选：id、createdAt、updatedAt、deletedAt 及 and/or/not。 |

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "searchInput": "张三",
      "limit": 20,
      "includedObjectNameSingulars": ["person", "company"]
    }
  }
}
```

返回 `{ "search": { "edges": [...], "pageInfo": { "hasNextPage": false, "endCursor": null } } }`。edge 包含 cursor 和 node；node 包含 `recordId`、`objectNameSingular`、`objectLabelSingular`、`label`、`imageUrl`。只搜索当前有权限读取的对象与字段。

## 5. 十六类对象工具

下列 `{singular}`、`{plural}` 为对象单数、复数名称转成 snake_case 后的结果，例如 person/people、company/companies、note_target/note_targets。每个对象实际开放的工具取决于权限及是否为系统对象，完整名称见附录 A、B。

| 参数习惯 | 对应工具 |
| --- | --- |
| 筛选字段直接放 arguments 顶层 | `find_many_*`。例如 `{ "jobTitle": { "eq": "CTO" } }`。 |
| 记录字段直接放 arguments 顶层 | `create_one_*`、`update_one_*`；后者还需要 id。 |
| 使用 filter/data/records 容器 | aggregate、group_by 及批量写入；按各工具定义填写。 |

### 5.1 find_many_{plural}

参数：对象的可读字段筛选、`and`/`or`/`not`，以及：

| 参数 | 类型 | 默认值/说明 |
| --- | --- | --- |
| `limit` | integer | `10`；1–100。 |
| `offset` | integer | `0`；非负整数。 |
| `orderBy` | object[] | 见第 6 节。 |
| `select` | string[] | 省略或 `["*"]` 返回全部可读字段；提供时不能为空数组。 |

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "find_many_people",
    "arguments": {
      "name": { "firstName": { "ilike": "%Ada%" } },
      "orderBy": [{ "name": { "lastName": "AscNullsLast" } }],
      "limit": 10,
      "offset": 0,
      "select": ["id", "name", "emails", "companyId"]
    }
  }
}
```

返回 `{ "records": [...], "count": 123, "hasNextPage": true, "endCursor": "..." }`。count 是完整筛选结果总数。对象列表工具使用 offset 翻页；当前不接受 after/before 参数，不能把 endCursor 直接传回本工具。

默认排除软删除记录。查询回收站时可传 `deletedAt: { "is": "NOT_NULL" }`。

### 5.2 find_one_{singular}

参数：`id: string` 必填，`select?: string[]`。

返回 `{ "record": {...} }`。记录不存在或已软删除时返回工具错误。

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "find_one_person",
    "arguments": {
      "id": "11111111-1111-4111-8111-111111111111",
      "select": ["name", "emails"]
    }
  }
}
```

当 id 可读时，即使 select 未列出 id，也会附带 id。多对一关联返回对象；一对多关联保留 `{ "edges": [{ "node": {...} }] }` 连接结构。默认关系展开最多一层，每个关联默认最多 60 条。

### 5.3 create_one_{singular}

参数：该对象可创建的字段，直接放在 arguments 顶层。省略字段采用默认值或空值，非空等约束由记录引擎检查。不要填写 createdAt、updatedAt、deletedAt、createdBy、updatedBy、searchVector 等受保护字段。

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "create_one_person",
    "arguments": {
      "name": { "firstName": "Ada", "lastName": "Lovelace" },
      "emails": { "primaryEmail": "ada@example.com" },
      "jobTitle": "CTO"
    }
  }
}
```

返回 `{ "record": {...} }`。createdBy/updatedBy 中的 source 为 `AGENT`，名称使用 key 或当前成员名称。

### 5.4 create_many_{plural}

参数：`records: object[]` 必填。单次最多影响 200 条记录，包括嵌套写入。records 必须是数组，不能传单个对象。

```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "create_many_companies",
    "arguments": { "records": [{ "name": "Acme" }, { "name": "Example" }] }
  }
}
```

返回 `{ "records": [...] }`，不是带 count/pageInfo 的查询连接。整批是一个事务，一条失败会回滚整批。

### 5.5 upsert_many_{plural}

参数：`records: object[]` 必填，与 create_many 的记录形状相同。要求同时具备创建和更新权限。

已有记录按 id 或元数据唯一索引匹配后更新，没有匹配则创建。返回 `{ "records": [...] }`。

```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "tools/call",
  "params": {
    "name": "upsert_many_companies",
    "arguments": {
      "records": [
        { "id": "11111111-1111-4111-8111-111111111111", "name": "Updated Acme" },
        { "name": "New company" }
      ]
    }
  }
}
```

### 5.6 update_one_{singular}

参数：`id: string` 必填，加上待修改字段。字段仍放顶层，不使用 data 容器。未提供的字段保持原值。

```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "tools/call",
  "params": {
    "name": "update_one_person",
    "arguments": { "id": "11111111-1111-4111-8111-111111111111", "jobTitle": "CEO" }
  }
}
```

返回 `{ "record": {...} }`。不能修改记录 id。

### 5.7 update_many_{plural}

参数：`filter: object`、`data: object` 均必填。把同一组字段值应用于全部匹配记录；每条记录需要不同数据时使用 upsert_many。

```json
{
  "jsonrpc": "2.0",
  "id": 16,
  "method": "tools/call",
  "params": {
    "name": "update_many_people",
    "arguments": { "filter": { "jobTitle": { "eq": "CTO" } }, "data": { "jobTitle": "Technical Director" } }
  }
}
```

返回 `{ "records": [...] }`。filter 为 `{}` 时可能匹配全部记录，仍受 200 条受影响记录上限限制。

### 5.8–5.13 删除、恢复与永久删除

| 工具 | 必填参数 | 行为 | 返回 |
| --- | --- | --- | --- |
| `delete_one_{singular}` | `id: string` | 软删除，可恢复。 | `{ "record": {...} }` |
| `delete_many_{plural}` | `filter: object` | 批量软删除。 | `{ "records": [...] }` |
| `restore_one_{singular}` | `id: string` | 恢复软删除记录。 | `{ "record": {...} }` |
| `restore_many_{plural}` | `filter: object` | 批量恢复软删除记录。 | `{ "records": [...] }` |
| `destroy_one_{singular}` | `id: string` | 永久删除，不可通过 restore 恢复。 | `{ "record": {...} }` |
| `destroy_many_{plural}` | `filter: object` | 批量永久删除。 | `{ "records": [...] }` |

单条示例：

```json
{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "tools/call",
  "params": {
    "name": "delete_one_person",
    "arguments": { "id": "11111111-1111-4111-8111-111111111111" }
  }
}
```

批量恢复示例：

```json
{
  "jsonrpc": "2.0",
  "id": 18,
  "method": "tools/call",
  "params": {
    "name": "restore_many_people",
    "arguments": {
      "filter": { "id": { "in": ["11111111-1111-4111-8111-111111111111"] } }
    }
  }
}
```

恢复要求更新权限；软删除和永久删除分别要求对应权限。关联约束及级联行为仍由记录引擎执行。

### 5.14 merge_many_{plural}

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `ids` | string[] | 是 | 2–9 个互不重复的记录 UUID。 |
| `conflictPriorityIndex` | integer | 是 | 保留记录在 ids 中的下标，从 0 开始，小于 ids 长度。 |
| `dryRun` | boolean | 否 | 为 true 时仅预览，省略时实际合并。 |

```json
{
  "jsonrpc": "2.0",
  "id": 19,
  "method": "tools/call",
  "params": {
    "name": "merge_many_people",
    "arguments": {
      "ids": ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
      "conflictPriorityIndex": 0,
      "dryRun": true
    }
  }
}
```

返回 `{ "record": {...} }`。实际合并保留关联并永久删除其他记录。仅非系统对象提供，要求读取、更新、软删除、永久删除权限。关联改写同样计入受影响记录上限。

### 5.15 aggregate_{plural}

| 参数 | 类型 | 必填 | 默认值/说明 |
| --- | --- | --- | --- |
| `filter` | object | 否 | 对象筛选，放在 filter 容器内。 |
| `aggregates` | string[] | 否 | `["totalCount"]`；提供时不能为空。可用名称列于 schema 中 aggregates 的 description。 |

```json
{
  "jsonrpc": "2.0",
  "id": 20,
  "method": "tools/call",
  "params": {
    "name": "aggregate_opportunities",
    "arguments": {
      "filter": { "stage": { "eq": "NEW" } },
      "aggregates": ["totalCount", "sumAmountAmountMicros"]
    }
  }
}
```

返回 `{ "aggregates": { "totalCount": 5, "sumAmountAmountMicros": 1000000 } }`。聚合基于完整筛选结果，与记录列表的分页无关。

### 5.16 group_by_{plural}

| 参数 | 类型 | 必填 | 默认值/说明 |
| --- | --- | --- | --- |
| `groupBy` | object[] | 是 | 1–5 个维度，每个对象只能有一个字段键。 |
| `filter` | object | 否 | 对分组前的记录筛选。 |
| `orderBy` | object[] | 否 | 按分组字段或 aggregate 排序，形状由 schema 给出。 |
| `aggregates` | string[] | 否 | `["totalCount"]`，与 aggregate 工具共用名称规则。 |

```json
{
  "jsonrpc": "2.0",
  "id": 21,
  "method": "tools/call",
  "params": {
    "name": "group_by_opportunities",
    "arguments": {
      "groupBy": [{ "stage": true }],
      "aggregates": ["totalCount", "sumAmountAmountMicros"],
      "orderBy": [{ "aggregate": { "totalCount": "DescNullsLast" } }]
    }
  }
}
```

返回：

```json
{
  "groups": [
    { "groupByDimensionValues": ["NEW"], "totalCount": 5, "sumAmountAmountMicros": 1000000 }
  ]
}
```

groupByDimensionValues 与 groupBy 维度顺序一致。该工具返回分组聚合，不返回每组的记录列表。

日期分组示例参数：

```json
{
  "jsonrpc": "2.0",
  "id": 22,
  "method": "tools/call",
  "params": {
    "name": "group_by_opportunities",
    "arguments": {
      "groupBy": [{ "createdAt": { "granularity": "MONTH", "timeZone": "Asia/Taipei" } }]
    }
  }
}
```

支持 `NONE`、`DAY`、`WEEK`、`MONTH`、`QUARTER`、`YEAR`、`DAY_OF_THE_WEEK`、`MONTH_OF_THE_YEAR`、`QUARTER_OF_THE_YEAR`。DATE_TIME 的 DAY/WEEK/MONTH/QUARTER/YEAR 分组需提供 IANA timeZone。WEEK 可设置 `weekStartDay` 为 MONDAY、SUNDAY 或 SATURDAY。其他维度示例为 `{ "amount": { "currencyCode": true } }` 或按实际 schema 选择关联字段的子字段。

## 6. 筛选、排序、字段与关联

### 6.1 筛选

实际操作符随字段类型而变，以该工具 schema 为准：

| 操作符 | 含义 |
| --- | --- |
| `eq`、`neq` | 相等、不等。 |
| `gt`、`gte`、`lt`、`lte` | 大于、大于等于、小于、小于等于。 |
| `in` | 在给定值数组中。 |
| `is: "NULL"` / `is: "NOT_NULL"` | 空值 / 非空检查。 |
| `like`、`ilike` | 文本模式，`%` 匹配任意长度、`_` 匹配单个字符；ilike 的大小写折叠主要覆盖 ASCII。 |
| `startsWith`、`endsWith` | 字面前缀、后缀匹配。 |
| `containsAny`、`isEmptyArray` | 适用数组/多选字段，具体可用项见 schema。 |
| `gtField`、`gteField`、`ltField`、`lteField` | 适用字段间比较，字段名形状见 schema。 |
| `searchVector: { "search": "..." }` | 对象内的搜索筛选。 |

同一级多个字段按 AND 组合；`and`、`or` 接对象数组，`not` 接对象。复合字段筛选需使用子字段，例如 `name.firstName` 对应 `{ "name": { "firstName": { "eq": "Ada" } } }`。

regex/iregex 不支持，也不会出现在 MCP 输入 schema 中。

### 6.2 排序

orderBy 必须是数组，例如：

```json
[
  { "name": { "lastName": "AscNullsLast" } },
  { "createdAt": "DescNullsLast" }
]
```

支持 `AscNullsFirst`、`AscNullsLast`、`DescNullsFirst`、`DescNullsLast`。分组按聚合值排序时使用 `{ "aggregate": { "totalCount": "DescNullsLast" } }`。

### 6.3 常用字段写入形状

| 类型/场景 | 参数值示例 |
| --- | --- |
| FULL_NAME | `{ "firstName": "Ada", "lastName": "Lovelace" }` |
| EMAILS | `{ "primaryEmail": "ada@example.com", "additionalEmails": ["ada2@example.com"] }` |
| LINKS | `{ "primaryLinkUrl": "https://example.com", "primaryLinkLabel": "Website" }` |
| CURRENCY | `{ "amountMicros": 1000000, "currencyCode": "USD" }`；金额用百万分之一单位。 |
| DATE_TIME | `"2026-11-16T09:00:00.000Z"` |
| DATE | `"2026-11-16"` |
| SELECT | 使用 options 中的 value，如 `"NEW"`。 |
| MULTI_SELECT / ARRAY | JSON 数组，元素形状见 schema。 |
| RAW_JSON | JSON 值，受字段自身校验约束。 |
| FILES | `[{ "fileId": "11111111-1111-4111-8111-111111111111", "label": "Proposal" }]`。 |

PHONES、ADDRESS、RICH_TEXT 等复合类型的完整子字段由 learn_tools 返回的 definitions 描述。数组参数必须传数组；不接受将单个对象隐式转换为数组。

FILES 中的 fileId 必须对应已上传、适用于该字段的文件。MCP 读取后返回签名下载 URL；文件本体上传仍走应用现有文件 API，没有独立的 MCP 上传工具。

### 6.4 关联

多对一关联可以传外键字段（如 companyId），或使用关系输入。以下均为 create/update 的记录字段片段：

```json
{ "company": { "connect": { "where": { "id": "11111111-1111-4111-8111-111111111111" } } } }
```

```json
{ "company": { "create": { "name": "New company" } } }
```

```json
{ "company": { "disconnect": true } }
```

关联目标和嵌套创建同样受权限约束。workspaceMember 等受保护对象不能通过嵌套 create 绕过限制。

备注/任务关联使用 noteTarget、taskTarget，例如 noteId + targetCompanyId，或 taskId + targetPersonId。同一备注/任务与同一目标存在组合唯一约束，重复关联会返回工具错误。

### 6.5 聚合名称

| 场景 | 名称规则 |
| --- | --- |
| 记录总数 | `totalCount` |
| 字段通用聚合 | `countUniqueValues{Field}`、`countEmpty{Field}`、`countNotEmpty{Field}`、`percentageEmpty{Field}`、`percentageNotEmpty{Field}` |
| 数值字段 | 按类型提供 min/max/avg/sum；RATING 不提供 sum。 |
| 日期字段 | `min{Field}`、`max{Field}`。 |
| 布尔字段 | `countTrue{Field}`、`countFalse{Field}`。 |
| 货币字段 | 后缀为 AmountMicros，如 `sumAnnualRevenueAmountMicros`、`sumAmountAmountMicros`。 |

`{Field}` 为字段名首字母大写后的形式。百分比返回 0–1。关联字段不提供这些字段聚合；隐藏字段的聚合名不会公布。

## 7. 权限与事务

- 对象不可读时，相应对象工具不会公布；隐藏字段从 schema、元数据及输出中移除。
- 创建、更新、软删除、永久删除工具分别按当前角色对应权限开放；恢复按更新权限开放；upsert 要求创建和更新权限。
- select、筛选、排序、聚合、分组、嵌套关联及实际写入都会校验权限。execute_tool 使用相同检查。
- workspaceMember、timelineActivity 只提供查询、单条读取、聚合、分组四类工具。attachment、noteTarget、taskTarget 不提供 merge。
- 单次记录写工具是一个事务，记录、时间线和异步副作用待办保持原子性。多个独立 MCP 请求之间不构成一个事务。
- 单次最多影响 200 条记录，包含嵌套创建及合并关联改写；单字段值上限约 2 MB、单行约 8 MB。每对象字段上限为 90。
- 写操作沿用文件签名、时间线、实时更新与 webhook 副作用，actor source 为 AGENT。

工具数量不是固定值。新建自定义对象会增加工具，停用对象、修改字段或变更权限会改变工具及参数。

## 8. 最小调用流程

```sh
export CRM_MCP_URL='http://localhost:3000/mcp?mode=meta'

curl "$CRM_MCP_URL" \
  -H "Authorization: Bearer $CRM_API_KEY" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"crm-client","version":"1.0.0"}}}'

curl "$CRM_MCP_URL" \
  -H "Authorization: Bearer $CRM_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"notifications/initialized"}'

curl "$CRM_MCP_URL" \
  -H "Authorization: Bearer $CRM_API_KEY" \
  -H 'Content-Type: application/json' \
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"learn_tools","arguments":{"toolNames":["find_many_people"]}}}'

curl "$CRM_MCP_URL" \
  -H "Authorization: Bearer $CRM_API_KEY" \
  -H 'Content-Type: application/json' \
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"execute_tool","arguments":{"toolName":"find_many_people","arguments":{"limit":10,"select":["id","name"]}}}}'
```

CRM_API_KEY 使用自己创建的 key；不要把真实密钥提交到仓库。直接模式可省略 execute_tool 包装，将目标工具放在 tools/call.params.name。

## 9. 错误与 HTTP 状态

### 9.1 协议错误

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": { "code": -32602, "message": "Tool is unavailable" }
}
```

| JSON-RPC code | 场景 |
| --- | --- |
| `-32700` | JSON 无法解析。 |
| `-32600` | 请求结构、协议头、媒体类型或请求大小不符合要求。 |
| `-32601` | 未实现的 method，包括未提供的 resources/read、prompts/get 等。 |
| `-32602` | initialize 必填参数缺失、无效工具 cursor、tools/call 参数形状不符或工具不可用。 |
| `-32000` | 认证、Origin 或不支持的 HTTP 方法等服务错误。 |
| `-32603` | 未预期的服务内部错误。 |

无法确定请求 id 的传输/解析错误通常返回 `id: null`。

### 9.2 HTTP 状态

| 状态 | 场景 |
| --- | --- |
| `200` | 成功响应；也可能是 JSON-RPC 错误或 isError 为 true 的工具结果，必须检查响应体。 |
| `202` | 通知已接受，无响应体。 |
| `400` | JSON/JSON-RPC 不合法或协议版本头不支持。 |
| `401` | 无凭据、凭据无效、密钥过期/撤销或 origin 不匹配；MCP 认证失败带 `WWW-Authenticate: Bearer realm="crm-mcp"`。 |
| `403` | Origin/CSRF 或 workspace/角色访问被拒绝。 |
| `405` | 已认证但 HTTP 方法不是 POST。 |
| `406` | Accept 不含支持的媒体类型。 |
| `413` | 请求体超过 2,000,000 字节。 |
| `415` | Content-Type 不是 application/json。 |
| `500` | 未预期内部错误。 |
| `503` | Worker 处于维护模式，由通用入口返回。 |

Cookie CSRF 拒绝可能沿用通用 HTTP 错误结构，而非 JSON-RPC 信封。字段值、唯一约束、关联约束、批量上限等业务错误通常以 HTTP 200 + 工具 isError 返回。

## 10. 当前能力边界与本地验收说明

当前只开放核心 CRM 记录操作与只读元数据发现。不提供工作流、AI/skills、应用/函数、外部 MCP 连接器管理，以及账户、角色、数据模型等设置写入工具。资源与提示词目录当前为空。

分组和聚合的参数来自 Worker GraphQL 契约；客户端迁移自原版 CRM 时应重新获取 schema。

2026-11-16 的本地验收覆盖 200 个直接工具、3 个新增 meta 工具，以及协议、权限、密钥生命周期、真实 R2 附件和重启持久化，共 113 项检查通过。工具数包含 4 个验收自定义对象，并非全新 workspace 的固定数量。

Wrangler 开发代理在连接复用时曾出现断连。验收客户端完整读取响应并显式使用 `Connection: close` 后，全套复验通过；这是一项本地开发环境验收条件，不是要求生产客户端始终关闭连接复用。

## 11. 标准对象完整工具目录

以下名称由当前管理员会话的实时目录提取。标准对象部分合计 133 个对象工具；再加 search、list_object_metadata_names、get_object_metadata，为 136 个直接工具。get_tool_catalog、learn_tools、execute_tool 是另外 3 个通用发现/执行工具。

### 11.1 company / companies（16 个）

```text
find_many_companies
find_one_company
aggregate_companies
group_by_companies
create_one_company
update_one_company
delete_one_company
restore_one_company
destroy_one_company
create_many_companies
update_many_companies
delete_many_companies
restore_many_companies
destroy_many_companies
upsert_many_companies
merge_many_companies
```

### 11.2 person / people（16 个）

```text
find_many_people
find_one_person
aggregate_people
group_by_people
create_one_person
update_one_person
delete_one_person
restore_one_person
destroy_one_person
create_many_people
update_many_people
delete_many_people
restore_many_people
destroy_many_people
upsert_many_people
merge_many_people
```

### 11.3 opportunity / opportunities（16 个）

```text
find_many_opportunities
find_one_opportunity
aggregate_opportunities
group_by_opportunities
create_one_opportunity
update_one_opportunity
delete_one_opportunity
restore_one_opportunity
destroy_one_opportunity
create_many_opportunities
update_many_opportunities
delete_many_opportunities
restore_many_opportunities
destroy_many_opportunities
upsert_many_opportunities
merge_many_opportunities
```

### 11.4 note / notes（16 个）

```text
find_many_notes
find_one_note
aggregate_notes
group_by_notes
create_one_note
update_one_note
delete_one_note
restore_one_note
destroy_one_note
create_many_notes
update_many_notes
delete_many_notes
restore_many_notes
destroy_many_notes
upsert_many_notes
merge_many_notes
```

### 11.5 noteTarget / noteTargets（15 个）

```text
find_many_note_targets
find_one_note_target
aggregate_note_targets
group_by_note_targets
create_one_note_target
update_one_note_target
delete_one_note_target
restore_one_note_target
destroy_one_note_target
create_many_note_targets
update_many_note_targets
delete_many_note_targets
restore_many_note_targets
destroy_many_note_targets
upsert_many_note_targets
```

### 11.6 task / tasks（16 个）

```text
find_many_tasks
find_one_task
aggregate_tasks
group_by_tasks
create_one_task
update_one_task
delete_one_task
restore_one_task
destroy_one_task
create_many_tasks
update_many_tasks
delete_many_tasks
restore_many_tasks
destroy_many_tasks
upsert_many_tasks
merge_many_tasks
```

### 11.7 taskTarget / taskTargets（15 个）

```text
find_many_task_targets
find_one_task_target
aggregate_task_targets
group_by_task_targets
create_one_task_target
update_one_task_target
delete_one_task_target
restore_one_task_target
destroy_one_task_target
create_many_task_targets
update_many_task_targets
delete_many_task_targets
restore_many_task_targets
destroy_many_task_targets
upsert_many_task_targets
```

### 11.8 attachment / attachments（15 个）

```text
find_many_attachments
find_one_attachment
aggregate_attachments
group_by_attachments
create_one_attachment
update_one_attachment
delete_one_attachment
restore_one_attachment
destroy_one_attachment
create_many_attachments
update_many_attachments
delete_many_attachments
restore_many_attachments
destroy_many_attachments
upsert_many_attachments
```

### 11.9 workspaceMember / workspaceMembers（4 个）

```text
find_many_workspace_members
find_one_workspace_member
aggregate_workspace_members
group_by_workspace_members
```

### 11.10 timelineActivity / timelineActivities（4 个）

```text
find_many_timeline_activities
find_one_timeline_activity
aggregate_timeline_activities
group_by_timeline_activities
```


## 12. 当前验收工作区的自定义对象工具快照

以下 4 个对象为本地验收创建的测试对象，不是系统内置对象。每个对象当前有 16 个工具，共 64 个；与标准目录相加，直接模式共 200 个。Meta 列表共 5 个，其中 2 个与直接模式重合，所有可调用名称去重后为 203 个。

### 12.1 mcpAcceptance1794793609211 / mcpAcceptance1794793609211s（16 个）

```text
find_many_mcp_acceptance1794793609211s
find_one_mcp_acceptance1794793609211
aggregate_mcp_acceptance1794793609211s
group_by_mcp_acceptance1794793609211s
create_one_mcp_acceptance1794793609211
update_one_mcp_acceptance1794793609211
delete_one_mcp_acceptance1794793609211
restore_one_mcp_acceptance1794793609211
destroy_one_mcp_acceptance1794793609211
create_many_mcp_acceptance1794793609211s
update_many_mcp_acceptance1794793609211s
delete_many_mcp_acceptance1794793609211s
restore_many_mcp_acceptance1794793609211s
destroy_many_mcp_acceptance1794793609211s
upsert_many_mcp_acceptance1794793609211s
merge_many_mcp_acceptance1794793609211s
```

### 12.2 mcpAcceptance1794793738429 / mcpAcceptance1794793738429s（16 个）

```text
find_many_mcp_acceptance1794793738429s
find_one_mcp_acceptance1794793738429
aggregate_mcp_acceptance1794793738429s
group_by_mcp_acceptance1794793738429s
create_one_mcp_acceptance1794793738429
update_one_mcp_acceptance1794793738429
delete_one_mcp_acceptance1794793738429
restore_one_mcp_acceptance1794793738429
destroy_one_mcp_acceptance1794793738429
create_many_mcp_acceptance1794793738429s
update_many_mcp_acceptance1794793738429s
delete_many_mcp_acceptance1794793738429s
restore_many_mcp_acceptance1794793738429s
destroy_many_mcp_acceptance1794793738429s
upsert_many_mcp_acceptance1794793738429s
merge_many_mcp_acceptance1794793738429s
```

### 12.3 mcpAcceptance1794793959329 / mcpAcceptance1794793959329s（16 个）

```text
find_many_mcp_acceptance1794793959329s
find_one_mcp_acceptance1794793959329
aggregate_mcp_acceptance1794793959329s
group_by_mcp_acceptance1794793959329s
create_one_mcp_acceptance1794793959329
update_one_mcp_acceptance1794793959329
delete_one_mcp_acceptance1794793959329
restore_one_mcp_acceptance1794793959329
destroy_one_mcp_acceptance1794793959329
create_many_mcp_acceptance1794793959329s
update_many_mcp_acceptance1794793959329s
delete_many_mcp_acceptance1794793959329s
restore_many_mcp_acceptance1794793959329s
destroy_many_mcp_acceptance1794793959329s
upsert_many_mcp_acceptance1794793959329s
merge_many_mcp_acceptance1794793959329s
```

### 12.4 mcpAcceptance1794794138593 / mcpAcceptance1794794138593s（16 个）

```text
find_many_mcp_acceptance1794794138593s
find_one_mcp_acceptance1794794138593
aggregate_mcp_acceptance1794794138593s
group_by_mcp_acceptance1794794138593s
create_one_mcp_acceptance1794794138593
update_one_mcp_acceptance1794794138593
delete_one_mcp_acceptance1794794138593
restore_one_mcp_acceptance1794794138593
destroy_one_mcp_acceptance1794794138593
create_many_mcp_acceptance1794794138593s
update_many_mcp_acceptance1794794138593s
delete_many_mcp_acceptance1794794138593s
restore_many_mcp_acceptance1794794138593s
destroy_many_mcp_acceptance1794794138593s
upsert_many_mcp_acceptance1794794138593s
merge_many_mcp_acceptance1794794138593s
```


## 13. 标准对象字段与写入键参考

下面列出当前管理员视角下的字段，以及 create_one/update_one 接受的顶层键。关联字段的外键键名（如 companyId）可能只出现在工具 schema 中，不是独立的字段元数据行。只读对象没有写入键。

这是当前工作区快照，可能包含创建自定义对象后自动增加的关联字段。实际 nullable/default、复合子字段、枚举和关系输入结构请通过 learn_tools 的 inputSchema/definitions 获取。

### 13.1 company

create_one 接受的键：`id`、`name`、`address`、`accountOwnerId`、`accountOwner`、`position`、`domainName`、`linkedinLink`、`annualRevenue`。

update_one 接受的键：`name`、`address`、`accountOwnerId`、`accountOwner`、`position`、`domainName`、`linkedinLink`、`annualRevenue`、`id`。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `deletedAt` | DATE_TIME | 是 |
| `updatedBy` | ACTOR | 否 |
| `people` | RELATION | 是 |
| `id` | UUID | 否 |
| `name` | TEXT | 是 |
| `updatedAt` | DATE_TIME | 否 |
| `opportunities` | RELATION | 是 |
| `address` | ADDRESS | 是 |
| `taskTargets` | RELATION | 是 |
| `accountOwner` | RELATION | 是 |
| `createdAt` | DATE_TIME | 否 |
| `searchVector` | TS_VECTOR | 是 |
| `position` | POSITION | 否 |
| `domainName` | LINKS | 是 |
| `attachments` | RELATION | 是 |
| `linkedinLink` | LINKS | 是 |
| `noteTargets` | RELATION | 是 |
| `timelineActivities` | RELATION | 是 |
| `annualRevenue` | CURRENCY | 是 |
| `createdBy` | ACTOR | 否 |

### 13.2 person

create_one 接受的键：`jobTitle`、`id`、`emails`、`avatarUrl`、`phones`、`avatarFile`、`name`、`linkedinLink`、`position`、`companyId`、`company`。

update_one 接受的键：`jobTitle`、`emails`、`avatarUrl`、`phones`、`avatarFile`、`name`、`linkedinLink`、`position`、`companyId`、`company`、`id`。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `jobTitle` | TEXT | 是 |
| `updatedBy` | ACTOR | 否 |
| `createdAt` | DATE_TIME | 否 |
| `id` | UUID | 否 |
| `deletedAt` | DATE_TIME | 是 |
| `emails` | EMAILS | 是 |
| `avatarUrl` | TEXT | 是 |
| `phones` | PHONES | 是 |
| `avatarFile` | FILES | 是 |
| `name` | FULL_NAME | 是 |
| `linkedinLink` | LINKS | 是 |
| `createdBy` | ACTOR | 否 |
| `timelineActivities` | RELATION | 是 |
| `updatedAt` | DATE_TIME | 否 |
| `noteTargets` | RELATION | 是 |
| `attachments` | RELATION | 是 |
| `searchVector` | TS_VECTOR | 是 |
| `taskTargets` | RELATION | 是 |
| `position` | POSITION | 否 |
| `pointOfContactForOpportunities` | RELATION | 是 |
| `company` | RELATION | 是 |

### 13.3 opportunity

create_one 接受的键：`ownerId`、`owner`、`amount`、`id`、`companyId`、`company`、`name`、`closeDate`、`position`、`stage`、`pointOfContactId`、`pointOfContact`。

update_one 接受的键：`ownerId`、`owner`、`amount`、`companyId`、`company`、`name`、`closeDate`、`position`、`stage`、`pointOfContactId`、`pointOfContact`、`id`。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `owner` | RELATION | 是 |
| `amount` | CURRENCY | 是 |
| `id` | UUID | 否 |
| `searchVector` | TS_VECTOR | 是 |
| `timelineActivities` | RELATION | 是 |
| `updatedAt` | DATE_TIME | 否 |
| `company` | RELATION | 是 |
| `noteTargets` | RELATION | 是 |
| `updatedBy` | ACTOR | 否 |
| `name` | TEXT | 是 |
| `closeDate` | DATE_TIME | 是 |
| `createdBy` | ACTOR | 否 |
| `taskTargets` | RELATION | 是 |
| `createdAt` | DATE_TIME | 否 |
| `position` | POSITION | 否 |
| `stage` | SELECT | 否 |
| `deletedAt` | DATE_TIME | 是 |
| `pointOfContact` | RELATION | 是 |
| `attachments` | RELATION | 是 |

枚举值：

- `stage`：`NEW`、`SCREENING`、`MEETING`、`PROPOSAL`、`CUSTOMER`。

### 13.4 note

create_one 接受的键：`id`、`title`、`position`、`bodyV2`。

update_one 接受的键：`title`、`position`、`bodyV2`、`id`。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `searchVector` | TS_VECTOR | 是 |
| `createdAt` | DATE_TIME | 否 |
| `updatedBy` | ACTOR | 否 |
| `updatedAt` | DATE_TIME | 否 |
| `id` | UUID | 否 |
| `attachments` | RELATION | 是 |
| `timelineActivities` | RELATION | 是 |
| `title` | TEXT | 是 |
| `position` | POSITION | 否 |
| `noteTargets` | RELATION | 是 |
| `createdBy` | ACTOR | 否 |
| `bodyV2` | RICH_TEXT | 是 |
| `deletedAt` | DATE_TIME | 是 |

### 13.5 noteTarget

create_one 接受的键：`targetCompanyId`、`targetCompany`、`noteId`、`note`、`targetOpportunityId`、`targetOpportunity`、`targetPersonId`、`targetPerson`、`id`、`position`、`targetMcpAcceptance1794793609211Id`、`targetMcpAcceptance1794793609211`、`targetMcpAcceptance1794793738429Id`、`targetMcpAcceptance1794793738429`、`targetMcpAcceptance1794793959329Id`、`targetMcpAcceptance1794793959329`、`targetMcpAcceptance1794794138593Id`、`targetMcpAcceptance1794794138593`。

update_one 接受的键：`targetCompanyId`、`targetCompany`、`noteId`、`note`、`targetOpportunityId`、`targetOpportunity`、`targetPersonId`、`targetPerson`、`position`、`targetMcpAcceptance1794793609211Id`、`targetMcpAcceptance1794793609211`、`targetMcpAcceptance1794793738429Id`、`targetMcpAcceptance1794793738429`、`targetMcpAcceptance1794793959329Id`、`targetMcpAcceptance1794793959329`、`targetMcpAcceptance1794794138593Id`、`targetMcpAcceptance1794794138593`、`id`。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `updatedAt` | DATE_TIME | 否 |
| `targetCompany` | MORPH_RELATION | 是 |
| `note` | RELATION | 是 |
| `createdBy` | ACTOR | 否 |
| `targetOpportunity` | MORPH_RELATION | 是 |
| `updatedBy` | ACTOR | 否 |
| `searchVector` | TS_VECTOR | 是 |
| `deletedAt` | DATE_TIME | 是 |
| `createdAt` | DATE_TIME | 否 |
| `targetPerson` | MORPH_RELATION | 是 |
| `id` | UUID | 否 |
| `position` | POSITION | 否 |
| `targetMcpAcceptance1794793609211` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794793738429` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794793959329` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794794138593` | MORPH_RELATION | 是 |

### 13.6 task

create_one 接受的键：`assigneeId`、`assignee`、`bodyV2`、`title`、`dueAt`、`position`、`id`、`status`。

update_one 接受的键：`assigneeId`、`assignee`、`bodyV2`、`title`、`dueAt`、`position`、`status`、`id`。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `createdAt` | DATE_TIME | 否 |
| `updatedBy` | ACTOR | 否 |
| `createdBy` | ACTOR | 否 |
| `assignee` | RELATION | 是 |
| `bodyV2` | RICH_TEXT | 是 |
| `taskTargets` | RELATION | 是 |
| `timelineActivities` | RELATION | 是 |
| `title` | TEXT | 是 |
| `attachments` | RELATION | 是 |
| `deletedAt` | DATE_TIME | 是 |
| `dueAt` | DATE_TIME | 是 |
| `searchVector` | TS_VECTOR | 是 |
| `position` | POSITION | 否 |
| `id` | UUID | 否 |
| `updatedAt` | DATE_TIME | 否 |
| `status` | SELECT | 是 |

枚举值：

- `status`：`TODO`、`IN_PROGRESS`、`DONE`。

### 13.7 taskTarget

create_one 接受的键：`targetCompanyId`、`targetCompany`、`id`、`targetOpportunityId`、`targetOpportunity`、`position`、`targetPersonId`、`targetPerson`、`taskId`、`task`、`targetMcpAcceptance1794793609211Id`、`targetMcpAcceptance1794793609211`、`targetMcpAcceptance1794793738429Id`、`targetMcpAcceptance1794793738429`、`targetMcpAcceptance1794793959329Id`、`targetMcpAcceptance1794793959329`、`targetMcpAcceptance1794794138593Id`、`targetMcpAcceptance1794794138593`。

update_one 接受的键：`targetCompanyId`、`targetCompany`、`targetOpportunityId`、`targetOpportunity`、`position`、`targetPersonId`、`targetPerson`、`taskId`、`task`、`targetMcpAcceptance1794793609211Id`、`targetMcpAcceptance1794793609211`、`targetMcpAcceptance1794793738429Id`、`targetMcpAcceptance1794793738429`、`targetMcpAcceptance1794793959329Id`、`targetMcpAcceptance1794793959329`、`targetMcpAcceptance1794794138593Id`、`targetMcpAcceptance1794794138593`、`id`。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `targetCompany` | MORPH_RELATION | 是 |
| `createdAt` | DATE_TIME | 否 |
| `createdBy` | ACTOR | 否 |
| `id` | UUID | 否 |
| `searchVector` | TS_VECTOR | 是 |
| `targetOpportunity` | MORPH_RELATION | 是 |
| `updatedAt` | DATE_TIME | 否 |
| `deletedAt` | DATE_TIME | 是 |
| `updatedBy` | ACTOR | 否 |
| `position` | POSITION | 否 |
| `targetPerson` | MORPH_RELATION | 是 |
| `task` | RELATION | 是 |
| `targetMcpAcceptance1794793609211` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794793738429` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794793959329` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794794138593` | MORPH_RELATION | 是 |

### 13.8 attachment

create_one 接受的键：`file`、`targetTaskId`、`targetTask`、`targetPersonId`、`targetPerson`、`name`、`targetCompanyId`、`targetCompany`、`id`、`position`、`targetOpportunityId`、`targetOpportunity`、`fullPath`、`targetNoteId`、`targetNote`、`fileCategory`、`targetMcpAcceptance1794793609211Id`、`targetMcpAcceptance1794793609211`、`targetMcpAcceptance1794793738429Id`、`targetMcpAcceptance1794793738429`、`targetMcpAcceptance1794793959329Id`、`targetMcpAcceptance1794793959329`、`targetMcpAcceptance1794794138593Id`、`targetMcpAcceptance1794794138593`。

update_one 接受的键：`file`、`targetTaskId`、`targetTask`、`targetPersonId`、`targetPerson`、`name`、`targetCompanyId`、`targetCompany`、`position`、`targetOpportunityId`、`targetOpportunity`、`fullPath`、`targetNoteId`、`targetNote`、`fileCategory`、`targetMcpAcceptance1794793609211Id`、`targetMcpAcceptance1794793609211`、`targetMcpAcceptance1794793738429Id`、`targetMcpAcceptance1794793738429`、`targetMcpAcceptance1794793959329Id`、`targetMcpAcceptance1794793959329`、`targetMcpAcceptance1794794138593Id`、`targetMcpAcceptance1794794138593`、`id`。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `updatedAt` | DATE_TIME | 否 |
| `createdBy` | ACTOR | 否 |
| `file` | FILES | 是 |
| `targetTask` | MORPH_RELATION | 是 |
| `deletedAt` | DATE_TIME | 是 |
| `targetPerson` | MORPH_RELATION | 是 |
| `name` | TEXT | 是 |
| `targetCompany` | MORPH_RELATION | 是 |
| `id` | UUID | 否 |
| `position` | POSITION | 否 |
| `updatedBy` | ACTOR | 否 |
| `targetOpportunity` | MORPH_RELATION | 是 |
| `searchVector` | TS_VECTOR | 是 |
| `fullPath` | TEXT | 是 |
| `targetNote` | MORPH_RELATION | 是 |
| `createdAt` | DATE_TIME | 否 |
| `fileCategory` | SELECT | 否 |
| `targetMcpAcceptance1794793609211` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794793738429` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794793959329` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794794138593` | MORPH_RELATION | 是 |

枚举值：

- `fileCategory`：`ARCHIVE`、`AUDIO`、`IMAGE`、`PRESENTATION`、`SPREADSHEET`、`TEXT_DOCUMENT`、`VIDEO`、`OTHER`。

### 13.9 workspaceMember

create_one 接受的键：无对应工具。

update_one 接受的键：无对应工具。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `openRecordIn` | TEXT | 否 |
| `searchVector` | TS_VECTOR | 是 |
| `locale` | TEXT | 否 |
| `id` | UUID | 否 |
| `name` | FULL_NAME | 否 |
| `updatedBy` | ACTOR | 否 |
| `updatedAt` | DATE_TIME | 否 |
| `dateFormat` | SELECT | 否 |
| `accountOwnerForCompanies` | RELATION | 否 |
| `userId` | UUID | 否 |
| `uiScale` | TEXT | 否 |
| `timelineActivities` | RELATION | 是 |
| `colorScheme` | TEXT | 否 |
| `timeZone` | TEXT | 否 |
| `timeFormat` | SELECT | 否 |
| `userEmail` | TEXT | 是 |
| `jobTitle` | TEXT | 是 |
| `deletedAt` | DATE_TIME | 是 |
| `ownedOpportunities` | RELATION | 否 |
| `createdBy` | ACTOR | 否 |
| `position` | POSITION | 否 |
| `createdAt` | DATE_TIME | 否 |
| `numberFormat` | SELECT | 否 |
| `assignedTasks` | RELATION | 否 |
| `avatarUrl` | TEXT | 是 |
| `calendarStartDay` | NUMBER | 否 |

枚举值：

- `dateFormat`：`SYSTEM`、`MONTH_FIRST`、`DAY_FIRST`、`YEAR_FIRST`。
- `timeFormat`：`SYSTEM`、`HOUR_24`、`HOUR_12`。
- `numberFormat`：`SYSTEM`、`COMMAS_AND_DOT`、`SPACES_AND_COMMA`、`DOTS_AND_COMMA`、`APOSTROPHE_AND_DOT`。

### 13.10 timelineActivity

create_one 接受的键：无对应工具。

update_one 接受的键：无对应工具。

| 字段 | 类型 | 可为空 |
| --- | --- | --- |
| `targetPerson` | MORPH_RELATION | 是 |
| `updatedBy` | ACTOR | 否 |
| `linkedRecordCachedName` | TEXT | 是 |
| `deletedAt` | DATE_TIME | 是 |
| `workspaceMember` | RELATION | 是 |
| `properties` | RAW_JSON | 是 |
| `linkedObjectMetadataId` | UUID | 是 |
| `targetCompany` | MORPH_RELATION | 是 |
| `targetTask` | MORPH_RELATION | 是 |
| `createdAt` | DATE_TIME | 否 |
| `createdBy` | ACTOR | 否 |
| `timelineActivityTypeSnapshot` | RAW_JSON | 是 |
| `searchVector` | TS_VECTOR | 是 |
| `timelineActivityTypeId` | UUID | 是 |
| `position` | POSITION | 否 |
| `updatedAt` | DATE_TIME | 否 |
| `targetOpportunity` | MORPH_RELATION | 是 |
| `happensAt` | DATE_TIME | 否 |
| `id` | UUID | 否 |
| `targetNote` | MORPH_RELATION | 是 |
| `linkedRecordId` | UUID | 是 |
| `targetMcpAcceptance1794793609211` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794793738429` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794793959329` | MORPH_RELATION | 是 |
| `targetMcpAcceptance1794794138593` | MORPH_RELATION | 是 |
