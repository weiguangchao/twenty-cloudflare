# Cloudflare 迁移方案

把 Twenty 的后端从 NestJS + Postgres + Redis 换成完全运行在 Cloudflare 上的新后端，前端保留。本文是给执行 agent 的任务书，按阶段拆分，每个阶段可以单独交给一个 agent。

## 0. 怎么用这份文档

执行某个阶段的 agent 需要读：第 1 到 7 节（全局约定），加上第 8 节里自己那个阶段。其他阶段不用读。

所有阶段共同遵守的规则：

1. **不修改 `packages/twenty-server`。** 它在整个迁移期间只作为行为参考，最后一个阶段统一删除。
2. **新代码只放在 `packages/twenty-worker`**（阶段 1 创建）。它可以依赖 `twenty-shared`，不能 import `twenty-server` 的任何文件。需要 `twenty-server` 里的逻辑时，读懂后在新包里重写。
3. **前端改动最小化。** 优先让后端满足前端现有契约。只有当后端模拟的代价明显大于改前端时才改 `twenty-front`，并把改动追加到第 9 节的"前端改动记录"。
4. **文档和事实不符时，改文档。** 本文的文件路径和行号是在提交 `f7fed3afdc7` 上由自动调研收集的，平台限制是 2026-11-12 查的。依赖某条事实之前先自己核实，发现不对就在同一次改动里更正本文。
5. **遵守仓库根目录 `CLAUDE.md` 的代码规范。**
6. **完成后更新下面的进度表**，并在自己阶段末尾的"实施记录"里写下偏离方案的地方和原因。

### 进度表

| 阶段 | 内容 | 依赖 | 状态 |
|---|---|---|---|
| 0 | 契约与种子数据采集 | 无 | 完成 |
| 1 | 工程骨架与平台验证 | 0 | 未开始 |
| 2 | Workspace DO：元数据存储与 DDL 引擎 | 1 | 未开始 |
| 3 | 认证、会话与 workspace 生命周期 | 1 | 未开始 |
| 4 | 元数据读取 API 与应用启动 | 2、3 | 未开始 |
| 5 | 记录查询引擎（读） | 4 | 未开始 |
| 6 | 记录写入与副作用 | 5 | 未开始 |
| 7 | 搜索 | 6 | 未开始 |
| 8 | 元数据写入 API 与视图 | 4 | 未开始 |
| 9 | 文件 | 4 | 未开始 |
| 10 | 权限与成员管理 | 6、8 | 未开始 |
| 11 | 实时事件 | 6 | 未开始 |
| 12 | 可选集成 | 10 | 未开始 |
| 13 | 清理、部署与上线 | 全部 | 未开始 |

可以并行的组合：2 和 3；5、8、9；7、10、11。

## 1. 背景与已定决策

这些已经和需求方确认，执行时不要重新讨论：

- **必须 100% 运行在 Cloudflare 自己的服务上。** 不允许外部 Postgres、Redis，也不使用经 Cloudflare 计费的 PlanetScale。
- **只做核心 CRM。** 范围见第 2 节。
- **没有线上数据需要迁移。** 全新部署，不需要数据导入工具，不需要兼容旧的 ID、token、密码哈希。
- **不再跟进上游 Twenty。** 不需要保持和上游可合并，可以删减前端和 API。
- **前端 `twenty-front` 保留**，新后端实现它实际用到的那部分 GraphQL 契约。

为什么是重写而不是移植：Cloudflare Containers 没有持久磁盘，跑不了数据库；Workers 启动限时 1 秒、内存 128 MB，装不下现在约 1.2 万个文件的 NestJS 服务；现有数据层在 251 个文件里写了 Postgres 专有 SQL。

## 2. 范围

### 要做

- 标准对象：`company`、`person`、`opportunity`、`note`、`noteTarget`、`task`、`taskTarget`、`attachment`、`timelineActivity`、`workspaceMember`。
- 自定义对象和自定义字段，包括关联字段。
- 记录的增删改查、软删除和恢复、合并、去重、批量操作、聚合、分组（看板）。
- 视图：表格和看板，带筛选、排序、分组、字段显隐。
- 记录详情页布局、导航菜单（含收藏）、命令菜单。
- 全局搜索。
- 邮箱加密码的注册登录、session、workspace 创建和引导流程。
- 成员邀请（链接方式）、角色、对象级和字段级权限。
- 文件：头像、workspace logo、附件、文件字段。
- 时间线活动、回收站自动清理。
- 实时更新（阶段 11）。

### 不做

邮件和日历同步、工作流、AI 对话和 agent、计费、SSO 和双因素认证、应用市场和 logic function、front component、仪表盘、管理后台、自定义域名、行级权限谓词、私有记录、访问组、记录分享、ClickHouse 事件日志、数据导出任务。

### 可选（阶段 12，需求方确认后再做）

邮件发送（邀请、重置密码、邮箱验证）、API key 加 REST API 加 webhook、Google 和 Microsoft 登录。

### 待确认的默认值

v1 按**单 workspace 模式**实现（`isMultiWorkspaceEnabled: false`，等同现在的 `IS_MULTIWORKSPACE_ENABLED=false`）。数据模型本身是按 workspace 隔离的，以后打开多 workspace 不需要改存储结构。实现时不要写死"只有一个 workspace"的假设，workspace ID 一律从 session 里取。

## 3. 目标架构

```
浏览器
  │
  ▼
Worker: twenty-worker（一个脚本，同时承载静态资源和 API）
  ├─ 静态资源        twenty-front 的构建产物，SPA 回退
  ├─ /client-config  静态 JSON
  ├─ /metadata       GraphQL（graphql-yoga），认证、用户、元数据、视图、文件、订阅
  ├─ /graphql        认证后整个请求转发给 Workspace DO
  ├─ /file /file-upload   R2 读写
  │
  ├─ D1: core        user、workspace、userWorkspace、userSession、appToken
  ├─ R2: files       所有文件
  ├─ Queue: jobs     只用于离开 DO 的重 IO 任务（阶段 9、12）
  └─ Durable Object: WorkspaceDurableObject（每个 workspace 一个实例）
        └─ SQLite    该 workspace 的全部元数据和全部记录
```

关键设计：

- **每个 workspace 一个 Durable Object**，替代现在的每个 workspace 一个 Postgres schema。实例用 `env.WORKSPACE.idFromName(workspaceId)` 定位。
- **记录 API（`/graphql`）在 DO 内部执行。** 查询引擎需要同步事务和大量小 SQL，只有 DO 内部能做到。Worker 只负责认证，然后把请求和认证上下文通过 RPC 交给 DO。
- **元数据 API（`/metadata`）在 Worker 里执行。** schema 是静态的，resolver 按需访问 D1 或调用 DO 的 RPC 方法。DO 对外暴露粗粒度方法（如 `createField(input)`），不暴露裸 SQL。
- **D1 只放跨 workspace 的身份数据。** 其余全部放在 workspace 自己的 DO 里，包括角色、feature flag、文件记录。
- **不需要锁和连接池。** DO 是单线程的，一次同步事务就是原子的。现有代码里的 advisory lock、缓存锁、Redis 缓存都不需要对应物。
- **DO 内的后台任务用 outbox 表加 alarm**，不走 Queues。见第 5.6 节。

必须遵守的不变量：**记录读写路径在 `transactionSync` 回调内不得 `await`。** 所有外部 IO（R2、D1、`fetch`）都在事务提交后通过 outbox 异步执行。

## 4. 平台限制

2026-11-12 从官方文档查得，来源见第 10 节。

| 项目 | 限制 | 对设计的影响 |
|---|---|---|
| DO SQLite 单库容量 | 10 GB | 单个 workspace 的数据上限 |
| D1 单库容量 | 10 GB，不可提升 | core 库只放身份数据，足够 |
| 每表最大列数 | 100 | 复合字段存成一个 JSON 列；每个对象限制 90 个字段 |
| 每条查询最大绑定参数 | 100 | 批量写入分片；`IN` 列表用 `json_each(?)` 传一个参数 |
| SQL 语句最大长度 | 100 KB | 不拼超长语句 |
| `LIKE`/`GLOB` 模式最大长度 | 50 字节 | 包含匹配用 `instr`，不用 `LIKE '%x%'` |
| 单行、字符串、BLOB 大小 | D1 为 2 MB；DO 文档页写 8 MB | 富文本和 JSON 字段写入前校验大小，按 2 MB 保守处理 |
| Worker 和 DO 内存 | 128 MB | 不把大结果集整体载入内存 |
| CPU 时间 | 默认 30 秒，可配到 5 分钟 | 批量操作分批，每批独立事务 |
| Worker 启动时间 | 1 秒 | GraphQL schema 懒构建，不放在全局作用域 |
| Worker 体积 | 64 MiB 未压缩 | 无压力 |
| 单个 DO 请求速率 | 软限制 1000 次每秒 | 一个 workspace 的并发上限，CRM 场景足够 |
| 数值精度 | 游标返回的整数受 JS 52 位精度限制 | `amountMicros` 上限约 9×10^15，够用；不要存更大的整数 |
| `sql.exec` | 不能执行 `BEGIN`、`SAVEPOINT` | 事务一律用 `ctx.storage.transactionSync()` |
| DO 时间点恢复 | 30 天 | 备份策略的基础，见阶段 13 |
| Queues | 消息 128 KB，延迟最长 24 小时，重试最多 100 次 | 只传 ID，不传载荷 |
| Email Service | 仍为 beta | 邮件发送放在可选阶段，v1 用邀请链接 |

DO 的 SQLite 支持 FTS5、JSON 函数、数学函数、窗口函数、`RETURNING`、`ON CONFLICT`。不支持自定义函数，所以没有 `REGEXP`。

## 5. 数据层约定

所有阶段共用，改动需要同步更新本节。

### 5.1 DO 内的表命名

| 前缀 | 用途 | 例子 |
|---|---|---|
| `meta_` | 元数据表 | `meta_objectMetadata`、`meta_view` |
| `rec_` | 记录表，后接对象的 `nameSingular` | `rec_person`、`rec_myCustomObject` |
| `fts_` | 全文索引虚拟表 | `fts_person` |
| `sys_` | 系统表 | `sys_migration`、`sys_outbox`、`sys_scheduledTask` |

表名和列名一律加双引号，保留 camelCase。

### 5.2 字段类型到 SQLite 列的映射

每个字段对应一列，关联字段除外。现有 Postgres 映射见 `packages/twenty-server/src/engine/workspace-manager/workspace-migration/workspace-migration-runner/utils/field-metadata-type-to-column-type.util.ts`。

| 字段类型 | SQLite 列 | 说明 |
|---|---|---|
| `UUID` | `TEXT` | 小写，`crypto.randomUUID()` 生成 |
| `TEXT` | `TEXT` | |
| `NUMBER`、`NUMERIC`、`POSITION` | `REAL` | |
| `BOOLEAN` | `INTEGER` | 0 或 1，边界处转换 |
| `DATE_TIME` | `TEXT` | UTC ISO 8601，固定毫秒精度，如 `2026-11-12T08:00:00.000Z`，保证字典序等于时间序 |
| `DATE` | `TEXT` | `YYYY-MM-DD` |
| `SELECT`、`RATING` | `TEXT` | 存选项值；合法性在应用层按字段选项校验，不建 CHECK 约束 |
| `MULTI_SELECT`、`ARRAY` | `TEXT` | JSON 数组 |
| `RAW_JSON`、`FILES` | `TEXT` | JSON |
| 复合类型（`ADDRESS`、`CURRENCY`、`FULL_NAME`、`LINKS`、`EMAILS`、`PHONES`、`ACTOR`、`RICH_TEXT`） | `TEXT` | **整个复合字段存成一个 JSON 对象**，键是子字段名。和现有实现（每个子字段一列）不同 |
| `RELATION`、`MORPH_RELATION` | `TEXT` | 只在多对一那一侧建列，列名 `<字段名>Id` |
| `TS_VECTOR` | 无列 | 由 `fts_` 表替代 |

复合子字段的定义在 `packages/twenty-shared/src/types/composite-types/`。

### 5.3 约束

- 只有 `id` 是 `PRIMARY KEY NOT NULL`。其余列在 SQLite 层面都可空，**非空、默认值、选项合法性都在应用层校验**。原因是 SQLite 改列约束需要重建整张表。
- 唯一约束用唯一索引实现。复合子字段上的唯一约束用表达式索引，如 `CREATE UNIQUE INDEX ... ON "rec_person" ("emails" ->> '$.primaryEmail') WHERE "deletedAt" IS NULL`。
- 外键的 `ON DELETE` 行为（`CASCADE`、`SET NULL`、`RESTRICT`）是否由 SQLite 外键执行，取决于阶段 1 的验证结果。验证不通过就在应用层的同一事务里实现。
- 每个对象最多 90 个字段，创建第 91 个时返回 `METADATA_VALIDATION_FAILED`。

### 5.4 系统字段

每张记录表都有：`id`、`createdAt`、`updatedAt`、`deletedAt`、`createdBy`（ACTOR）、`updatedBy`（ACTOR）、`position`。定义见 `packages/twenty-server/src/engine/metadata-modules/object-metadata/constants/partial-system-flat-field-metadatas.constant.ts`。

不建 `searchVector`、`_accessGroupIds`、`_isPrivate` 列。`searchVector` 字段的元数据要保留（前端按它生成搜索筛选），只是没有物理列。

### 5.5 Postgres 写法的替换

| Postgres | SQLite 替换 |
|---|---|
| `ILIKE '%x%'` | `instr(lower(col), lower(?)) > 0` |
| `ILIKE 'x%'`、`^@` | `substr(lower(col), 1, length(?)) = lower(?)` |
| `= ANY(:ids)`、`IN (...)` | `IN (SELECT value FROM json_each(?))` |
| 数组 `@>`、`&&` | `EXISTS (SELECT 1 FROM json_each(col) WHERE value IN (...))` |
| `jsonb ->>` | `col ->> '$.key'` |
| `DISTINCT ON`、`CROSS JOIN LATERAL` | `ROW_NUMBER() OVER (PARTITION BY ...)`，或按父 ID 批量二次查询 |
| `tsvector @@ to_tsquery` | FTS5 `MATCH` |
| `ts_rank` | `bm25()` |
| `DATE_TRUNC`、`AT TIME ZONE` | `strftime`，时区偏移在 JS 里算好传入 |
| PG enum | `TEXT`，改选项名时 `UPDATE` 数据 |
| `pg_advisory_xact_lock`、`FOR UPDATE` | 不需要 |
| `regex`、`iregex` 筛选 | 不支持，返回 `BAD_USER_INPUT` |

已知的行为差异，接受不修：`lower()` 只对 ASCII 做大小写折叠；带时区的按日期分组在夏令时切换日可能有一小时偏差。

### 5.6 DO 内的后台任务

- `sys_outbox`：记录变更事务提交时写入待办项（时间线活动以外的异步副作用，如删除 R2 对象、推送实时事件、调用 webhook）。
- `sys_scheduledTask`：周期任务，如每日回收站清理。
- DO 只有一个 alarm。alarm 处理函数执行所有到期的 outbox 项和周期任务，然后把下一次 alarm 设为最早的到期时间。
- outbox 项必须幂等，alarm 至少执行一次，失败的项按退避重试。

### 5.7 DO 自身的 schema 版本

`sys_migration` 表记录已执行的迁移。DO 构造函数里用 `ctx.blockConcurrencyWhile()` 执行未跑过的迁移。标准元数据的版本升级也走这个机制。

## 6. 前后端契约要点

完整契约以阶段 0 采集的 fixture 为准，这里只列结构性事实。`F` 代表 `packages/twenty-front/src`，`S` 代表 `packages/twenty-server/src`。

### 6.1 端点

| 路径 | 用途 |
|---|---|
| `POST /metadata` | 默认 Apollo client。认证、当前用户、元数据、视图、文件 mutation、订阅 |
| `POST /graphql` | 记录的增删改查和 `search` |
| `GET /client-config?v=v1` | 启动配置。HTML 里有 `<script id="twenty-client-config">` 时前端跳过这次请求 |
| `PUT /file-upload/:id?token=` | 上传文件体，成功返回 204 |
| `GET /file/:fileFolder/:id?token=` | 下载文件，支持 Range |
| `GET /healthz` | 健康检查，前端不调用 |

需要由 Worker 而不是静态资源处理的路径前缀列在 `packages/twenty-shared/src/types/ApiPath.ts`。

前端的服务端地址取 `window._env_.REACT_APP_SERVER_BASE_URL`，没有就用 `location.origin`（`F/config/index.ts`）。新架构前后端同源，不注入这个变量。

### 6.2 认证

- **前端不发 `Authorization` 头，认证靠 httpOnly session cookie。** 前端每个请求带 `credentials: 'include'` 和 `x-twenty-session-cookie: 1`，另有 `x-locale`、`X-App-Version`（`F/modules/apollo/services/ApolloFactory.ts:85-306`）。
- cookie 名：https 下是 `__Host-twenty-session`，http 下是 `twenty-session`。值是 `sess_` 加 32 字节随机数的 base64url。httpOnly，`Path=/`，`SameSite=Lax`。服务端只存它的 sha256。有效期 180 天。
- 服务端只在请求带 `x-twenty-session-cookie` 头或 `sec-fetch-mode: navigate` 时才读 cookie（`S/engine/core-modules/user-session/utils/resolve-session-cookie-access.util.ts`）。
- CSRF：用 cookie 认证的非安全方法必须带允许的 `Origin`（`S/engine/middlewares/cookie-session-csrf.middleware.ts`）。
- 认证 mutation 仍返回 `AuthTokenPair`，前端忽略其中的 token，只调用 `markSessionActive()`。前端从不调用 `renewToken`。
- 密码规则：8 到 50 个字符（`S/engine/core-modules/auth/auth.util.ts`）。

### 6.3 错误

前端依据 GraphQL 错误的 `extensions.code` 行动（`ApolloFactory.ts:200-293`）：

- `UNAUTHENTICATED`：清状态，跳转 `/welcome`。
- `extensions.subCode === 'SESSION_SUPERSEDED'`：重试该操作。
- `FORBIDDEN`、`NOT_FOUND`、`BAD_USER_INPUT`、`CONFLICT`、`METADATA_VALIDATION_FAILED`、`INTERNAL_SERVER_ERROR`：静默或提示。
- 提示文案取 `extensions.userFriendlyMessage`。它通常是字符串，但旧系统在 token 无效、session 失效时返回对象 `{id, message}`；新后端统一返回字符串。
- CSRF 检查失败不是 GraphQL 错误：HTTP 403，响应体 `{"statusCode":403,"messages":[...],"error":"CSRF_ORIGIN_MISMATCH"}`。
- 各错误场景的具体 code 和 subCode 见 `contract/README.md` 的"采集中确认的旧系统行为"。

### 6.4 应用启动

1. 所有访客：client config，然后 `GetPublicWorkspaceDataByDomain`。
2. 已登录：`GetCurrentUser`，然后 `FindMinimalMetadata`（返回 `objectMetadataItems`、`views`、`collectionHashes`）。
3. 对 hash 变化的集合再拉：`ObjectMetadataItems`、`FindAllViews`、`FindFieldsWidgetViews`、`FindTableWidgetViews`、`FindAllRecordPageLayouts`、`FindAllRecordFormPageLayouts`、`FindManyLogicFunctions`、`FindManyNavigationMenuItems`、`FindManyCommandMenuItems`、`FindManyFrontComponents`（`F/modules/metadata-store/hooks/useLoadStaleMetadataEntities.ts`）。
   启动时还会调用 `FindManyApplications`、`TrackAnalytics`、`GetRecordPermissions`、`MyConnectedAccounts`、`MyMessageChannels`、`MyCalendarChannels`、`CurrentUserSessions` 和 `OnEventSubscription`，各自的归属和返回值见 `contract/metadata-operations.md`。
4. 界面在当前用户、对象和字段、视图和视图字段、`objectRecordsPermissions` 都加载后才渲染。

### 6.5 记录 API

以 `person` 为例，命名规则见 `S/engine/utils/get-resolver-name.util.ts`：

- 查询：`people`、`person`、`personDuplicates`、`peopleGroupBy`。
- 变更：`createPerson`、`createPeople`、`updatePerson`、`updatePeople`、`deletePerson`、`deletePeople`、`destroyPerson`、`destroyPeople`、`restorePerson`、`restorePeople`、`mergePeople`。没有独立的 upsert，是 create 上的 `upsert: Boolean` 参数。
- 连接结构：`edges { node cursor }`、`pageInfo { hasNextPage hasPreviousPage startCursor endCursor }`、`totalCount`，以及聚合字段。
- 游标：base64 编码的 JSON（`S/engine/api/graphql/graphql-query-runner/utils/cursors.util.ts`）。
- 表格滚动加载不用游标，用 `first` 加 `offset`（前端变量名 `$limit`、`$offset`）。
- 筛选：`and`、`or`、`not`，加各类型的操作符（`eq`、`neq`、`gt`、`gte`、`lt`、`lte`、`in`、`startsWith`、`endsWith`、`like`、`ilike`、`is`、`containsAny`、`isEmptyArray`、`containsIlike`、`search`）。
- 排序：`[{ field: AscNullsFirst | AscNullsLast | DescNullsFirst | DescNullsLast }]`，复合子字段嵌套一层。
- 关联写入：`connect`、`create`、`disconnect`。
- 这些查询由前端在运行时按元数据拼出来，不在生成的类型文件里。前端只会请求我们的元数据里声明过的字段。

### 6.6 实时事件

前端用 `graphql-sse` 连 `/metadata`，订阅 `onEventSubscription(eventStreamId)`，并用 `addQueryToEventStream`、`removeQueryFromEventStream` 注册关心的查询。服务端每 30 秒发一次空心跳，客户端 90 秒没收到就重建连接。没有实时事件时界面仍然可用，只是不会自动刷新。

## 7. 工程约定

### 7.1 包结构

```
packages/twenty-worker/
  wrangler.jsonc
  project.json                 nx 目标：dev、build、test、typecheck、lint、deploy
  migrations/                  D1 迁移（wrangler d1 migrations）
  contract/                    阶段 0 的 fixture 和 SDL
  src/
    index.ts                   Worker 入口和路由
    http/                      client-config、file、file-upload、healthz
    auth/                      session、cookie、token、密码
    core-db/                   D1 访问
    metadata-api/              /metadata 的 schema 和 resolver
    files/
    shared/                    错误类型、通用工具
    workspace/                 Durable Object
      workspace.durable-object.ts
      migrations/              DO 内部迁移
      metadata/                元数据存储和 DDL
      seed/                    标准元数据和演示数据
      record-api/              动态 schema、解析器、SQL 生成、执行
      search/
      events/                  outbox、副作用、alarm
      permissions/
  test/
```

文件命名沿用 `twenty-server` 的 kebab-case 加后缀风格（`.util.ts`、`.service.ts`、`.constant.ts`）。

### 7.2 技术选型

- HTTP 路由：Hono。
- GraphQL：`graphql` 16 加 `graphql-yoga`（和现有服务端一致，前端的 `graphql-sse` 客户端能直接对接）。DO 内的记录 API 用 graphql-js 直接构建 schema 并执行。
- 测试：vitest 加 `@cloudflare/vitest-pool-workers`，在 workerd 里跑真实的 DO SQLite 和 D1。
- 端到端：现有的 `packages/twenty-e2e-testing`（Playwright），目标指向 `wrangler dev`。
- wrangler 版本和 `packages/twenty-website` 保持一致。`compatibility_date` 取建包当天，开启 `nodejs_compat`。

### 7.3 `/metadata` 的 schema 策略

前端的启动查询会请求不在范围内的字段（如计费、AI 相关）。schema 里缺字段会导致整个查询校验失败。所以：

- **用现有的完整 SDL 作为 schema**，即阶段 0 从运行中的旧服务端导出的 `packages/twenty-worker/contract/metadata-schema.graphql`。不要用 `packages/twenty-client-sdk/src/metadata/generated/schema.graphql`，它比运行中的服务端少 7 个输入字段。
- resolver 逐阶段实现。未实现的 Query 字段返回零值（可空返回 `null`，列表返回空数组），未实现的 Mutation 抛 `NOT_IMPLEMENTED`。
- 启动查询涉及的非空字段必须有明确的返回值，以 fixture 为准。
- SDL 里的自定义标量（`DateTime`、`UUID`、`JSON`、`Upload` 等）都要有实现。

### 7.4 验证命令

每个阶段结束前必须通过：

```bash
npx tsgo -p packages/twenty-worker/tsconfig.json --noEmit
npx nx lint twenty-worker
npx nx test twenty-worker
```

涉及前端可见行为的阶段，还要用 `wrangler dev` 起服务，按该阶段的验收标准在浏览器里走一遍。

## 8. 阶段

### 阶段 0：契约与种子数据采集

**目标**：从运行中的旧系统采集新后端要对齐的全部事实。这是唯一需要运行旧后端的阶段，产出的文件是后续所有阶段的依据。

**任务**

1. 用 `bash packages/twenty-utils/setup-dev-env.sh` 和 `yarn start` 启动旧系统，注册一个新 workspace。
2. 用 Playwright 录制下列流程的 HAR，拆成每个 GraphQL 操作一个文件（操作名、query、variables、response），存到 `packages/twenty-worker/contract/fixtures/<流程>/`。响应里的密钥和 token 要抹掉。
   - 注册、创建 workspace、完成引导、登出、登录。
   - 人员和公司列表：加载、滚动翻页、筛选、排序、切换视图、看板分组。
   - 记录详情页：查看、编辑各类型字段、关联其他记录。
   - 新建、软删除、恢复、永久删除、批量删除、合并人员。
   - 备注和任务：新建、关联到记录、在时间线上查看。
   - 全局搜索。
   - 设置里的数据模型：新建自定义对象、新建各类型字段、新建关联、改名、停用。
   - 视图：新建、改筛选和排序、增删字段列、收藏。
   - 上传头像、上传附件、下载附件。
   - 设置里的成员和角色：复制邀请链接、用邀请链接加入、改角色、移除成员。
3. 导出两份 SDL：`/metadata` 的完整 schema，和这个 workspace 的 `/graphql` schema。存到 `contract/metadata-schema.graphql` 和 `contract/core-schema.graphql`。
4. 从数据库的 `core` schema 导出新 workspace 的标准元数据为 JSON：对象、字段、字段选项、索引、搜索字段、视图及其字段、筛选、排序、分组、字段分组、页面布局及其 tab 和 widget、导航菜单项、命令菜单项、角色、权限标志。
5. 写一个过滤脚本，把导出的 JSON 裁剪到第 2 节的范围：删掉范围外的对象；删掉关联目标在范围外的字段；删掉引用了被删对象或范围外 widget 类型的视图、布局、菜单项。结果存为 `packages/twenty-worker/src/workspace/seed/standard-metadata.json`。脚本要校验裁剪后没有悬空引用。
6. 导出演示数据（公司、人员、商机）的生成逻辑或结果，供新 workspace 预填。参考 `S/engine/workspace-manager/standard-objects-prefill-data/utils/`。
7. 汇总 fixture 里出现过的所有 `/metadata` 操作，写成 `contract/metadata-operations.md`，每个操作标注归属阶段。fixture 里出现但本文没分配的操作，分配到最合适的阶段并更新本文。

**参考代码**

- 标准对象定义：`S/engine/workspace-manager/twenty-standard-application/utils/`
- 前端的代码生成配置：`packages/twenty-front/codegen-metadata.cjs`

**验收标准**

- 上面列出的每个流程都有 fixture。
- `standard-metadata.json` 通过悬空引用校验，只包含 10 个核心对象。
- `metadata-operations.md` 覆盖 fixture 里的每一个操作名。

**说明**：标准元数据的 ID 可以直接沿用导出时的值。每个 workspace 是独立的数据库，不同 workspace 的元数据 ID 相同没有问题。

**实施记录**

产出都在 `packages/twenty-worker/contract/` 和 `src/workspace/seed/`，说明见 `contract/README.md`。

- 21 个流程，1365 个 fixture。14 个由浏览器操作产生，7 个（名字以 `-api` 结尾）用脚本直接调 API，覆盖界面不易触发的错误码、cookie 和 CSRF、各字段类型的写入形状、文件 token、只读角色的行为。
- **没有录 HAR。** Playwright MCP 的代码沙箱不能写文件，改为在浏览器上下文挂响应监听，把请求和响应发给本地 collector，按流程写 JSONL，再由 `split-fixtures.mjs` 拆分和脱敏。结果和 HAR 拆分等价。
- **关联字段走了 API。** 用 Playwright 操作数据模型页的关联字段表单时，前端发出的请求缺少 `relationCreationPayload` 而失败（失败的请求也保留在 fixture 里）。关联和 morph 关联改在 `data-model-api` 里按前端代码的形状创建。
- **演示数据的生成脚本没有入库。** `demo-data.json` 由仓库外的临时脚本执行旧服务端的 prefill 函数一次性生成，因为本包不能 import `twenty-server`。数据本身是字面量，不会再变。
- **种子裁剪的额外规则**：只保留标准应用拥有的行（Member 角色按标准 universal identifier 保留，默认角色是 Member）；删掉范围外的 widget 类型和命令菜单项；没有 widget 的 tab、没有 widget 使用的 widget 视图、空的导航文件夹也删掉。权限标志定义全部保留，授予由角色决定。丢了列的索引也删掉（复核时发现第一版留下了 10 个没有列的索引，已修正）。裁剪后 10 个对象、181 个字段、41 个索引，悬空引用校验通过。
- `core-schema.graphql` 包含采集时建的自定义对象 `initiative`，不是纯标准 workspace 的 schema。`metadata-schema.graphql` 是仓库里 `twenty-client-sdk` 那份 SDL 的严格超集，7.3 和第 10 节已改为引用它。
- 环境：仓库要求 Node 26（`yarn install` 在 Node 24 下失败）；Homebrew 的 Postgres 默认没有 `postgres` 角色，需要先建（密码 `postgres`）。
- 采集中确认的旧系统行为（分页用 offset、错误码、cookie、文件 token、权限报错方式等）记在 `contract/README.md`，并据此更新了 6.3、6.4、6.5 和阶段 2、3、4、8、10 的任务。前端启动时调用的 `FindManyAgentChatThreads` 有 AI 权限和对象存在两个前置条件，裁剪后不会发出，不需要处理。

### 阶段 1：工程骨架与平台验证

**目标**：建好新包，让 `wrangler dev` 能把前端跑起来，并用测试确认第 4、5 节依赖的平台行为。这个阶段发现走不通的地方要立刻上报，后面的设计都建立在它上面。

**任务**

1. 创建 `packages/twenty-worker`，按 7.1 的结构，配好 nx 目标、tsconfig、lint、vitest。
2. `wrangler.jsonc`：静态资源指向 `packages/twenty-front/build`，开 SPA 回退；`ApiPath.ts` 里的路径前缀交给 Worker 处理；声明 D1、R2、Queue、DO 绑定，DO 类用 SQLite 后端。
3. 实现 `/healthz` 和 `/client-config`。client config 的字段列表见 `S/engine/core-modules/client-config/client-config.entity.ts:343-463`，所有可选功能关闭：`authProviders` 只开 `password`，`billing.isBillingEnabled` 为 false，`isMultiWorkspaceEnabled` 为 false，`isCookieSessionEnabled` 为 true，邮件日历相关全为 false，`aiModels` 为空。
4. 实现 `WorkspaceDurableObject` 的空壳：构造函数里跑 `sys_migration` 机制，暴露一个 `ping()` RPC 方法。
5. 写平台验证测试，逐项确认并把结论写进本阶段的实施记录：
   - 外键：`ALTER TABLE ADD COLUMN ... REFERENCES` 后，`ON DELETE CASCADE` 和 `SET NULL` 是否生效。
   - FTS5：`trigram` 分词器是否可用，中文子串能否命中；`bm25()` 是否可用。
   - `IN (SELECT value FROM json_each(?))` 传 5000 个 ID 是否正常。
   - 表达式唯一索引加 `WHERE` 条件是否生效。
   - `transactionSync` 里先 DDL 后抛异常，表是否回滚。
   - 建第 101 列时的报错信息。
   - `RETURNING`、`ON CONFLICT DO UPDATE`、窗口函数、`->>` 操作符。
   - `ALTER TABLE` 的 `RENAME COLUMN`、`DROP COLUMN`（含列上有索引的情况）。
   - 超过 50 字节的 `LIKE` 模式的报错信息。
   - 单行写入 2 MB 和 8 MB 文本的结果。
   - 从 DO 内访问 D1 和 R2 绑定。
6. 配好前端开发方式：`packages/twenty-front` 的 vite 开发服务器把 `F/config/apiProxyPrefixes.ts` 里的前缀代理到 `wrangler dev`。

**验收标准**

- `wrangler dev` 下浏览器能打开登录页，没有 client config 报错。
- 平台验证测试全部有明确结论。结论和第 4、5 节不符的，已更正文档并说明对后续阶段的影响。
- 7.4 的三条命令通过。

### 阶段 2：Workspace DO 的元数据存储与 DDL 引擎

**目标**：在 DO 内实现元数据的存储，以及"元数据变更到表结构变更"的全部逻辑。本阶段不涉及 HTTP，只做 DO 的内部模块和 RPC 方法，用测试驱动。

**说明**：旧系统用"flat entity 对比生成迁移动作，再由 runner 执行"的管线（`S/engine/workspace-manager/workspace-migration/`，约 900 个文件）。新实现不需要这套管线。SQLite 的 DDL 是事务性的，一次 `transactionSync` 里同时改元数据表和物理表即可。

**任务**

1. 建 `meta_` 表。至少包括：对象、字段（选项可以内嵌为 JSON）、索引、搜索字段、视图、视图字段、视图字段分组、视图筛选、视图筛选分组、视图排序、视图分组、页面布局、布局 tab、布局 widget、导航菜单项、命令菜单项、角色、角色分配、对象权限、字段权限、权限标志、时间线活动类型、关联记录路径、feature flag、键值对、文件。列以阶段 0 导出的 JSON 为准（`src/workspace/seed/standard-metadata.json` 的 `tables`；字段选项在旧系统里同时存在 `fieldMetadata.options` 列和 `fieldMetadataOption` 表）。
2. 初始化：新 DO 首次启动时载入 `standard-metadata.json`，建出 10 张 `rec_` 表和对应索引。
3. 对象操作：创建、改名、改标签、停用和启用、删除。创建自定义对象时要按旧系统的行为自动加上系统字段，以及它和 `noteTarget`、`taskTarget`、`attachment`、`timelineActivity` 之间的关联字段。阶段 0 确认旧系统加的是 `attachments`、`noteTargets`、`taskTargets`、`timelineActivities`、`agentChatThreadTargets`，最后一个在范围外，不加。
4. 字段操作：创建、改名（`RENAME COLUMN`）、改标签和设置、改选项（含改选项值时更新已有数据）、改默认值、停用和启用、删除。
5. 关联字段：一对多和多对一成对创建和删除；多对一侧建 `<名>Id` 列和索引；morph 关联按旧系统规则展开为每个目标一个字段。
6. 索引和唯一约束的创建、删除。
7. 校验：名称唯一、保留字、命名格式、90 个字段上限、不能删改系统字段和标准字段的受保护属性。校验失败返回带原因的结构化错误，不抛裸异常。
8. `collectionHashes`：每个元数据集合维护一个版本值，任何写入都更新，供 `FindMinimalMetadata` 使用。
9. 把以上能力暴露为 DO 的 RPC 方法，并提供内存中的元数据快照（按版本缓存），供记录引擎使用。

**参考代码**

- 名称计算：`S/engine/metadata-modules/field-metadata/utils/compute-column-name.util.ts`、`S/engine/utils/compute-table-name.util.ts`
- 系统字段：`S/engine/metadata-modules/object-metadata/constants/partial-system-flat-field-metadatas.constant.ts`
- 关联和 morph：`packages/twenty-shared/src/utils/fieldMetadata/isMorphRelationHead.ts`、`S/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-note-target-standard-flat-field-metadata.util.ts`
- 校验规则：`S/engine/workspace-manager/workspace-migration/workspace-migration-builder/validators/`
- 旧 DDL 生成：`S/engine/twenty-orm/workspace-schema-manager/`

**验收标准**

- 新 DO 初始化后，元数据内容和 `standard-metadata.json` 一致，10 张记录表存在且列符合 5.2 的映射。
- 每种字段类型的创建、改名、删除都有测试，测试同时断言元数据表和物理表。
- 任一步失败时元数据和表结构都回滚，有测试覆盖。
- 自定义对象创建后，能在 `noteTarget` 等对象上看到对应的关联字段。

### 阶段 3：认证、会话与 workspace 生命周期

**目标**：实现注册、登录、session 和 workspace 的创建与激活。可以和阶段 2 并行，最后的 `activateWorkspace` 需要阶段 2 的初始化能力。

**任务**

1. D1 迁移：`user`、`workspace`、`userWorkspace`、`userSession`、`appToken`，以及登录 token 的一次性使用记录。列参考旧实体，去掉计费、SSO、双因素相关的列。
2. 在 Worker 里搭起 `/metadata` 的 yoga 服务，按 7.3 的策略加载完整 SDL 和零值 resolver。
3. session：签发、校验、撤销，cookie 的读写规则和 CSRF 检查按 6.2 实现。请求认证后得到 `{ userId, workspaceId, userWorkspaceId, workspaceMemberId }`。
4. 密码哈希：`bcryptjs`，10 轮。没有历史数据，不需要兼容旧哈希。
5. token：登录 token（15 分钟，一次性）、文件 token、文件上传 token，统一用 HS256，密钥由 `APP_SECRET` 加类型派生，用 WebCrypto 实现。`AuthTokenPair` 里返回同样方式签发的 access token，同时支持 `Authorization: Bearer` 认证，供脚本调用。不实现 ES256 密钥轮换。
6. 实现这些操作：`checkUserExists`、`getLoginTokenFromCredentials`、`getAuthTokensFromLoginToken`、`signIn`、`signUp`、`signUpInNewWorkspace`、`signUpInWorkspace`、`signOut`、`getPublicWorkspaceDataByDomain`、`activateWorkspace`，以及引导流程里前端会调用的 `getWorkspaceCreationDefaults`、`skipSyncEmailOnboardingStep`、`getInviteSuggestions`（空列表）、`sendInvitations`（空 emails 时返回成功）、`updateWorkspaceMemberSettings`、`currentUserSessions`。调用顺序见下方参考代码和 `contract/fixtures/auth-signup-onboarding/`。
7. `activateWorkspace` 的步骤：把 workspace 状态置为创建中；初始化 DO（阶段 2）；给创建者分配 Admin 角色，建 Member 角色并设为默认；写入默认 feature flag；创建 `workspaceMember` 记录；预填演示数据；状态置为 `ACTIVE`。
8. 引导状态：按旧逻辑计算，跳过邮件同步和计费两步。
9. 定时任务：一个 Cron Trigger 清理过期的 session 和 token。
10. 登录接口限流，用 Rate Limiting 绑定。

**参考代码**

- 前端调用顺序：`F/modules/auth/sign-in-up/hooks/useSignInUp.ts:119-187`、`F/modules/auth/hooks/useAuth.ts:364-546`
- resolver：`S/engine/core-modules/auth/auth.resolver.ts`
- session：`S/engine/core-modules/user-session/`
- 注册：`S/engine/core-modules/auth/services/sign-in-up.service.ts:692-853`
- 激活：`S/engine/core-modules/workspace/services/workspace.service.ts:678-780`、`S/engine/workspace-manager/workspace-manager.service.ts:38-138`
- 引导状态：`S/engine/core-modules/onboarding/onboarding.service.ts:118-187`
- workspace 解析：`S/engine/core-modules/domain/workspace-domains/services/workspace-domains.service.ts:76-202`

**验收标准**

- 浏览器里能完成注册、创建 workspace、填写个人资料，之后登出再登录。
- cookie 属性符合 6.2；不带 `x-twenty-session-cookie` 头的请求不被认证；跨源的 mutation 被拒绝。
- 登录 token 第二次使用失败。
- 错误密码、已存在邮箱、过期 session 的错误码和 fixture 一致。

### 阶段 4：元数据读取 API 与应用启动

**目标**：登录后应用外壳能完整渲染，导航、设置页、数据模型页可见。此时记录列表还是空的。

**任务**

1. `GetCurrentUser`：用户信息来自 D1，`workspaceMember`、`currentUserWorkspace`（含 `permissionFlags`、`objectRecordsPermissions`）、`currentWorkspace`（含 `featureFlags`、默认角色）来自 DO。范围外的字段按 fixture 返回空值。
2. 权限先用占位实现：Admin 全部允许，Member 除设置外全部允许。把权限判断收敛到一个 `PermissionContext` 接口，阶段 10 替换实现。
3. `FindMinimalMetadata` 和 6.4 第 3 步列出的全部查询。`FindManyLogicFunctions`、`FindManyFrontComponents` 返回空列表。`contract/metadata-operations.md` 里标为阶段 4 的其他操作一并实现，包括 `FindManyTimelineActivityTypes`、`FindManyApplications`、`FindManyViews`，以及返回空列表或成功的范围外查询和 `TrackAnalytics`。
4. 用返回的数据隐藏范围外的功能，不改前端代码：
   - 不授予 `WORKFLOWS`、`AI`、`AI_SETTINGS`、`APPLICATIONS`、`SECURITY`、`CONNECTED_ACCOUNTS` 权限标志。
   - 用户的 `canImpersonate`、`canAccessFullAdminPanel` 为 false。
   - 种子数据里已经去掉了邮件、日历、工作流相关的 tab、widget、菜单项（阶段 0 第 5 步），在这里确认界面上确实没有。
5. `onEventSubscription` 先返回只发心跳的 SSE 流，`addQueryToEventStream`、`removeQueryFromEventStream` 返回 true。避免客户端反复重连。
6. workspace 设置的读取，以及成员列表的读取。

**参考代码**

- 用户片段：`F/modules/users/graphql/fragments/userQueryFragment.ts`
- 启动门控：`F/modules/metadata-store/effect-components/IsMinimalMetadataReadyEffect.tsx`
- 功能开关位置：`F/modules/settings/hooks/useSettingsNavigationItems.tsx`、`F/modules/app/components/SettingsRoutes.tsx:839-1397`
- 权限标志：`packages/twenty-shared/src/constants/PermissionFlagType.ts`

**验收标准**

- 登录后进入主界面，左侧导航显示人员、公司、商机、任务、备注，没有工作流、AI、仪表盘入口。
- 设置里的数据模型页列出 10 个标准对象和它们的字段。
- 浏览器控制台没有 GraphQL 校验错误。
- 启动阶段的每个操作，响应结构和 fixture 一致（ID 和时间戳除外）。

### 阶段 5：记录查询引擎（读）

**目标**：`/graphql` 的全部读操作。这是整个项目技术风险最高的阶段。

**任务**

1. Worker 侧：认证后把请求体和认证上下文通过 RPC 交给 DO，原样返回结果。
2. 动态 schema：DO 内根据元数据快照用 graphql-js 构建 schema，按元数据版本缓存。类型、参数、命名必须和 `contract/core-schema.graphql` 一致。
3. 查询解析：把 GraphQL 选择集解析成"要查的列、要展开的关联、要算的聚合"。
4. 筛选编译：6.5 列出的全部操作符，按 5.5 的规则编译成 SQLite。复合子字段用 `->>` 访问。未显式筛选 `deletedAt` 时默认只返回未删除的记录，这条规则先对照旧实现确认。
5. 排序和游标分页：支持 `first`、`last`、`after`、`before`、`offset`，四种空值排序方向，复合子字段排序。游标格式和旧实现兼容。
6. 关联展开：多对一用批量二次查询；一对多返回连接结构，每个父记录有自己的 `first` 限制和 `totalCount`，用 `ROW_NUMBER()` 实现；支持多层嵌套。
7. 聚合和 `totalCount`：见 `S/engine/api/graphql/workspace-schema-builder/utils/get-available-aggregations-from-object-fields.util.ts`。
8. `groupBy`：看板用到的按 `SELECT` 字段分组必须完整；按日期粒度分组按 5.5 的已知差异处理。
9. `findDuplicates`。
10. 结果整形：JSON 列解析、布尔值转换、复合字段还原为对象。
11. 读权限检查接入 `PermissionContext`。
12. 所有 `IN` 列表走 `json_each`，所有语句检查绑定参数不超过 100 个。

**参考代码**

- resolver 工厂：`S/engine/api/graphql/workspace-resolver-builder/factories/`
- 参数定义：`S/engine/api/graphql/workspace-schema-builder/utils/get-resolver-args.util.ts`
- 筛选输入类型：`S/engine/api/graphql/workspace-schema-builder/graphql-types/input/`
- 筛选转 SQL：`S/engine/record-filter/utils/compute-where-condition-parts.ts`
- 排序：`S/engine/api/graphql/graphql-query-runner/graphql-query-parsers/graphql-query-order/`
- 关联展开：`S/engine/api/common/common-nested-relations-processor/`
- 查询执行：`S/engine/api/common/common-query-runners/`
- 前端的查询生成：`F/modules/object-record/utils/generateFindManyRecordsQuery.ts`、`F/modules/object-metadata/utils/mapFieldMetadataToGraphQLQuery.ts`

**验收标准**

- 人员、公司、商机列表显示演示数据，滚动加载、筛选、排序、看板视图都正常。
- 记录详情页显示字段和关联记录。
- 阶段 0 的读操作 fixture 逐个重放，响应结构一致。
- 每个筛选操作符、每种字段类型的排序都有单元测试。
- 1 万条记录的表上，列表首屏查询的 DO 内耗时有记录在案。

### 阶段 6：记录写入与副作用

**目标**：`/graphql` 的全部写操作，以及写入触发的副作用。

**任务**

1. `createOne`、`createMany`（含 `upsert`）、`updateOne`、`updateMany`、`deleteOne`、`deleteMany`、`destroyOne`、`destroyMany`、`restoreOne`、`restoreMany`、`merge`。
2. 输入校验和规范化：非空、类型、选项合法性、复合字段结构、邮箱和电话和链接的格式、单行大小。校验规则对照旧实现。
3. 关联写入：`connect`、`create`、`disconnect`。
4. `position` 的计算：参考 `S/engine/core-modules/record-position/services/record-position.service.ts`。
5. `createdBy`、`updatedBy` 从认证上下文填充。
6. 永久删除时的外键行为，按阶段 1 的结论由 SQLite 或应用层执行。
7. 批量操作：单次影响的记录数受 `mutationMaximumAffectedRecords` 限制；批量插入按"100 除以列数"分片；整个 mutation 在一个事务里。
8. 事件：每次写入生成和旧系统同构的事件（`{recordId, userId, workspaceMemberId, properties: {before, after, diff, updatedFields}}`，类型见 `packages/twenty-shared/src/database-events/`）。
9. 同步副作用，和写入在同一个事务里完成：时间线活动的写入；删除记录时清理指向它的导航菜单项。
10. 异步副作用，写入 `sys_outbox`：实时事件推送（阶段 11 消费）、文件清理（阶段 9 消费）。先把 outbox 和 alarm 机制按 5.6 实现好。
11. 回收站清理：`sys_scheduledTask` 里的每日任务，永久删除软删除超过 `trashRetentionDays` 的记录。
12. 写权限检查接入 `PermissionContext`。

**参考代码**

- 事件中枢：`S/engine/api/graphql/workspace-query-runner/listeners/entity-events-to-db.listener.ts`
- 时间线活动：从上面的 listener 追到 `entityEventsToDbQueue` 的处理器
- 合并：`S/engine/api/common/common-query-runners/` 里的 merge runner
- 回收站：`S/engine/trash-cleanup/`
- upsert：`S/engine/twenty-orm/repository/workspace-repository.ts:855` 附近

**验收标准**

- 界面上能新建、编辑、删除、恢复、永久删除、合并记录，能新建备注和任务并关联到记录。
- 记录的时间线上出现创建和修改条目。
- CSV 导入 1000 条人员成功。
- 阶段 0 的写操作 fixture 逐个重放，响应结构一致。
- 事务中途失败时没有残留数据，有测试覆盖。
- alarm 重复触发时 outbox 项不会被重复生效，有测试覆盖。

### 阶段 7：搜索

**目标**：全局搜索和列表里的搜索筛选。

**任务**

1. 每个对象一张 `fts_<对象>` 虚拟表，分词器按阶段 1 的结论选择，优先 `trigram`（支持中文子串）。索引的字段由搜索字段元数据决定。
2. 写入、更新、删除记录时在同一事务里维护 FTS 表。字段的文本提取规则参考 `S/engine/workspace-manager/utils/get-ts-vector-column-expression.util.ts`（邮箱、电话、链接有特殊处理）。
3. 搜索字段元数据变化时（如新增文本字段、改对象的标签字段）重建该对象的 FTS 表。
4. `search` 查询：跨对象检索，参数和返回结构见 `F/modules/command-menu/graphql/queries/search.ts`。`tsRank`、`tsRankCD` 用 `bm25()` 的结果填充。
5. 筛选操作符 `search`（作用在 `searchVector` 字段上）。
6. 查询词短于分词器最小长度时回退到 `instr` 匹配。
7. 用户输入要转义成合法的 FTS5 查询串，不能把原始输入直接拼进 `MATCH`。

**参考代码**

- `S/engine/core-modules/search/services/search.service.ts`
- `S/engine/metadata-modules/flat-search-field-metadata/`

**验收标准**

- 命令菜单里搜索人名、公司名、邮箱片段、中文片段都能命中。
- 列表页的搜索框能筛选记录。
- 包含引号、星号、括号的输入不报错。
- 新建记录后立即可被搜到，删除后搜不到。

### 阶段 8：元数据写入 API 与视图

**目标**：把阶段 2 的 DO 能力通过 `/metadata` 暴露出来，并实现视图和菜单的写操作。可以和阶段 5 并行。

**任务**

1. 对象和字段的 mutation：创建、更新、删除、停用和启用。输入输出结构以 `contract/metadata-schema.graphql` 和 fixture 为准。
2. 视图及其子实体（字段、筛选、筛选分组、排序、分组、字段分组）的增删改。
3. 导航菜单项的增删改和排序（收藏功能依赖它）。
4. 页面布局：自定义对象创建时自动生成默认的详情页布局和默认视图，行为对照旧实现。布局编辑相关的 mutation 按 fixture 里是否出现决定做不做。
5. 每次写入更新对应的 `collectionHashes`，并让记录引擎的 schema 缓存失效。
6. 元数据 mutation 的权限：需要 `DATA_MODEL` 等权限标志，接入 `PermissionContext`。
7. 校验错误映射为 `METADATA_VALIDATION_FAILED`，错误体结构和 fixture 一致。
8. 数据模型设置页用到的 `ObjectRecordCounts`、`MostlyEmptyFieldMetadataIds`（可先返回空列表）。
9. 前端新建字段时默认值是带 SQL 引号的字面量（如 `"'USD'"`、`"''"`），存储前要去掉引号，见 `contract/fixtures/data-model/`。

**参考代码**

- `S/engine/metadata-modules/object-metadata/object-metadata.resolver.ts`
- `S/engine/metadata-modules/field-metadata/`
- `S/engine/metadata-modules/view/` 及同级的 `view-field`、`view-filter`、`view-sort`、`view-group`
- `S/engine/metadata-modules/navigation-menu-item/`
- 守卫：`S/engine/guards/access-policy.guard.ts`

**验收标准**

- 在设置里新建自定义对象，加上各类型字段和一个指向人员的关联，刷新后导航里出现它，能新建和查看它的记录。
- 改字段名后，已有数据仍然可读。
- 能新建视图、保存筛选和排序、调整列，刷新后保持。
- 能收藏和取消收藏记录。

### 阶段 9：文件

**目标**：基于 R2 的上传和下载。可以和阶段 5 并行。

**任务**

1. `createFileUpload`：在 DO 的 `meta_file` 里建记录，返回指向 `/file-upload/:id?token=` 的 `uploadUrl`。
2. `PUT /file-upload/:id`：校验上传 token，把请求体流式写入 R2。限制大小，超限返回 413。
3. `completeFileUpload`：校验文件类型，SVG 做净化，把文件标记为可用。R2 没有移动操作，直接写到最终路径并用记录状态区分是否完成。
4. `GET /file/:fileFolder/:id`：校验文件 token，从 R2 读取，支持 Range 和缓存头。`core-picture` 目录的 token 不检查过期。
5. 存储路径沿用 `{workspaceId}/{applicationUniversalIdentifier}/{fileFolder}/{path}`。
6. 头像、workspace logo、附件对象、`FILES` 字段。fixture 里出现的旧式上传 mutation 也要支持。
7. 清理：消费 `sys_outbox` 里的文件删除项；定期清理超时未完成的上传。批量删除 R2 对象量大时走 Queue。
8. 返回给前端的文件 URL 要带有效的 token，生成规则参考 `S/engine/core-modules/file/file-url/file-url.service.ts:89-111`。

**参考代码**

- `S/engine/core-modules/file/file-upload/`
- `S/engine/core-modules/file/controllers/file.controller.ts`
- `S/engine/core-modules/file-storage/services/file-storage.service.ts:350-376`
- 前端：`F/modules/file/hooks/useDirectFileUpload.ts`、`F/modules/file/utils/putFileToUploadTarget.ts`

**验收标准**

- 能上传并显示头像和 workspace logo。
- 能给记录上传附件、预览、下载。
- 没有 token 或 token 属于别的文件时返回 403。
- 永久删除带附件的记录后，R2 里对应的对象被删除。

### 阶段 10：权限与成员管理

**目标**：把占位的权限实现换成真的，并完成成员相关的设置页。

**任务**

1. `PermissionContext` 的真实实现：按角色计算对象级权限（读、改、软删、永久删）和字段级权限（读、改），逻辑参考 `S/engine/permissions/role/utils/compute-role-records-permissions.util.ts`。
2. 在记录引擎的读写路径上强制执行。无权读的字段不能出现在结果、筛选、排序里。
3. `objectRecordsPermissions` 返回真实计算结果。
4. 角色的增删改、对象权限和字段权限的设置、给成员分配角色。
5. 邀请：生成和重置邀请链接（`inviteHash`），通过链接注册加入 workspace（`signUpInWorkspace`），落地页的 `getWorkspaceFromInviteHash`。成员页还会调用 `getWorkspaceInvitations`、`getApprovedAccessDomains`、`twoFactorAuthenticationRecoveryStatus`，v1 返回空值。
6. 移除成员：撤销其 session，软删除 `workspaceMember`，处理其名下的收藏。
7. workspace 设置的修改：名称、logo、默认角色、回收站保留天数。
8. 个人资料的修改，删除自己的账号。
9. 不做：行级权限谓词、私有记录、访问组、记录分享。对应的 feature flag 保持关闭。

**参考代码**

- `S/engine/permissions/`
- `S/engine/metadata-modules/role/role.service.ts:486-507`
- `S/engine/workspace-manager/twenty-standard-application/utils/role-metadata/create-standard-flat-role-metadata.util.ts`
- `S/engine/core-modules/user-workspace/user-workspace.service.ts`
- `S/engine/core-modules/workspace-invitation/`

**验收标准**

- 新建一个只读角色并分配给第二个用户，该用户看得到记录但界面不提供编辑，直接调 API 修改返回 `FORBIDDEN`。
- 对某角色隐藏一个字段后，该角色的前端界面里看不到这个字段；直接在查询里请求它、按它筛选或排序，都返回 `FORBIDDEN`（旧系统对整个查询报错，不是静默去掉字段，见 `contract/fixtures/permissions-api/`）。
- 用邀请链接能加入 workspace，默认获得 Member 角色。
- 被移除的成员立即失去访问。

### 阶段 11：实时事件

**目标**：其他用户或其他标签页的修改能自动反映到界面。

**任务**

1. 事件流注册表：DO 内维护每个 `eventStreamId` 订阅了哪些查询（`addQueryToEventStream`、`removeQueryFromEventStream`）。
2. 事件匹配：记录变更后，根据每个流注册的查询签名判断是否受影响，生成 `objectRecordEventsWithQueryIds`。匹配逻辑对照旧实现。
3. 元数据变更事件 `metadataEvents`（带 `updatedCollectionHash`），让其他客户端刷新元数据。
4. 传输：保持前端的 `graphql-sse` 不变。推荐做法是 Worker 持有 SSE 响应流，同时和 DO 建立可休眠的 WebSocket 接收事件，转发到 SSE。DO 侧用 WebSocket Hibernation API，没有事件时不计费。
5. 心跳每 30 秒一次。客户端断开后清理注册信息。
6. 权限：推送前按接收者的权限过滤事件内容。

如果上面的传输方案在验证中有问题（比如长连接下 Worker 的行为不符合预期），备选是把前端传输改成直连 DO 的 WebSocket，改动点在 `F/modules/sse-db-event/components/SSEClientEffect.tsx`，并记入前端改动记录。

**参考代码**

- `S/engine/subscriptions/`
- `S/engine/workspace-event-emitter/`
- 前端：`F/modules/sse-db-event/`

**验收标准**

- 两个浏览器登录同一 workspace，一边新建或修改记录，另一边的列表在几秒内更新。
- 一边新建自定义字段，另一边不刷新页面就能看到。
- 空闲 5 分钟后连接仍然可用，或者能自动恢复。
- 关闭页面后 DO 里的注册信息被清除。

### 阶段 12：可选集成

每一项单独确认后再做，互相独立。

**12a 邮件发送**：用 Cloudflare Email Service（当前 beta，开工前先确认状态和发信域名要求）。包括邀请邮件、重置密码、邮箱验证。模板复用 `packages/twenty-emails`，先确认它在 Workers 运行时里能渲染。发送走 Queue 以便重试。

**12b API key、REST API、webhook**：API key 的创建和撤销，Bearer 认证；`/rest` 下的记录接口，复用记录引擎；webhook 从 outbox 经 Queue 投递，带签名和重试。参考 `S/engine/api/rest/`、`S/engine/core-modules/api-key/`、`S/engine/metadata-modules/webhook/`。

**12c Google 和 Microsoft 登录**：OAuth 授权码流程，回调后重定向到 `/verify?loginToken=`，参考 `S/engine/core-modules/auth/services/auth.service.ts:826`。只做登录，不申请邮件和日历权限。

### 阶段 13：清理、部署与上线

**目标**：删除不再需要的代码，建立生产部署。

**任务**

1. 端到端测试：让 `packages/twenty-e2e-testing` 里属于核心 CRM 的用例在 `wrangler dev` 上通过，删掉范围外功能的用例。
2. 删除旧代码：`packages/twenty-server`、`packages/twenty-docker`，以及只服务于范围外功能的包。删除前列出清单交需求方确认，这一步不可逆。
3. 前端清理：删掉已经隐藏的范围外功能的模块和路由，减小包体积。改动量大，单独提交。
4. 前端类型生成：把 `packages/twenty-front` 的 codegen 指向新 Worker，确认生成结果没有破坏性差异。
5. 部署配置：`wrangler.jsonc` 里分 `dev` 和 `production` 环境；D1、R2、Queue 的创建脚本；`APP_SECRET` 等用 wrangler secret 管理；绑定自定义域名。
6. D1 的主库位置和 DO 的 `locationHint` 选在主要用户所在区域。
7. 可观测性：开启 Workers Logs；关键路径加结构化日志（请求 ID、workspace ID、操作名、DO 内耗时）；错误上报。
8. 备份：DO 自带 30 天时间点恢复，D1 自带 30 天 Time Travel。写一份恢复操作手册并实际演练一次。评估是否需要定期把 workspace 导出到 R2 作为超过 30 天的备份。
9. 容量监控：定期记录每个 DO 的 `sql.databaseSize`，接近 10 GB 时告警。
10. 安全检查：登录限流、注册页的 Turnstile、CSRF、文件 token、所有 mutation 的权限覆盖。
11. 更新根目录的 `CLAUDE.md` 和 `README.md`，反映新的架构和命令。
12. CI：新包的 lint、类型检查、测试、部署流水线。

**验收标准**

- 生产环境从零部署成功，能注册并完整使用核心 CRM。
- 端到端测试在 CI 里通过。
- 恢复演练成功并有记录。
- 仓库里没有对已删除包的引用，`yarn install` 和全量类型检查通过。

## 9. 风险、未决事项与记录

### 风险

| 风险 | 说明 | 处理 |
|---|---|---|
| 查询引擎的工作量 | 阶段 5 要重写旧系统约 640 个文件覆盖的行为 | fixture 重放作为验收依据；允许把阶段 5 再拆成筛选、关联、聚合三个子任务 |
| 单个 workspace 10 GB 上限 | 无法提升 | 阶段 13 加容量监控；超限方案（归档或按对象拆分 DO）等真有需求再设计 |
| 每对象 90 个字段上限 | 源于每表 100 列 | 在界面上给出明确报错 |
| 大小写和重音 | SQLite 的 `lower()` 只处理 ASCII | 搜索走 FTS5，不受影响；筛选的差异接受 |
| 长时间操作阻塞 DO | DO 单线程，一次大批量写入会让该 workspace 的其他请求排队 | 批量操作分批，每批一个事务，批间让出 |
| Email Service 仍是 beta | 影响邀请邮件和密码重置 | v1 用邀请链接；密码重置在 12a 之前不可用，需要告知需求方 |
| 费用未估算 | DO 按请求、时长、读写行数计费 | 阶段 5 完成后用真实查询测一次行读取量再估 |

### 未决事项

1. 单 workspace 还是多 workspace 部署（当前默认单 workspace）。
2. 阶段 12 的三项做不做、先后顺序。
3. 没有邮件发送时，密码重置是否需要一个临时方案（比如管理员重置）。
4. 阶段 13 删除旧代码的范围，需要需求方确认清单。

### 前端改动记录

暂无。每次修改 `packages/twenty-front` 都在这里追加一行：阶段、文件、改了什么、为什么不能在后端解决。

## 10. 参考来源

平台限制的出处，2026-11-12 访问：

- Durable Objects 限制：https://developers.cloudflare.com/durable-objects/platform/limits/
- Durable Objects SQLite 存储 API：https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- Workers 限制：https://developers.cloudflare.com/workers/platform/limits/
- D1 限制：https://developers.cloudflare.com/d1/platform/limits/
- Queues 限制：https://developers.cloudflare.com/queues/platform/limits/
- Containers 更新日志：https://developers.cloudflare.com/changelog/product/containers/
- Email Service 更新日志：https://developers.cloudflare.com/email-service/platform/changelog/
- Workers 连接数据库的方式：https://developers.cloudflare.com/workers/databases/connecting-to-databases/

仓库内的参考：

- 现有 Workers 部署配置的例子：`packages/twenty-website/wrangler.jsonc`
- `/metadata` 的 SDL：`packages/twenty-worker/contract/metadata-schema.graphql`
- 需要由后端处理的路径前缀：`packages/twenty-shared/src/types/ApiPath.ts`
- 字段类型枚举：`packages/twenty-shared/src/types/FieldMetadataType.ts`
