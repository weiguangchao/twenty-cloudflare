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
| 1 | 工程骨架与平台验证 | 0 | 完成 |
| 2 | Workspace DO：元数据存储与 DDL 引擎 | 1 | 完成 |
| 3 | 认证、会话与 workspace 生命周期 | 1 | 完成 |
| 4 | 元数据读取 API 与应用启动 | 2、3 | 完成 |
| 5 | 记录查询引擎（读） | 4 | 完成 |
| 6 | 记录写入与副作用 | 5 | 完成 |
| 7 | 搜索 | 6 | 完成 |
| 8 | 元数据写入 API 与视图 | 4 | 完成 |
| 9 | 文件 | 4 | 完成 |
| 10 | 权限与成员管理 | 6、8 | 完成 |
| 11 | 实时事件 | 6 | 完成 |
| 12 | 可选集成 | 10 | 完成（外部配置待接入） |
| 13 | 清理、部署与上线 | 全部 | 已部署；公网基础检查及恢复演练通过，业务验收待首次注册 |
| 14 | 对外 MCP 服务 | 5、6、7、10、12 | 完成（已部署，公网认证检查通过） |

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
- 对外 MCP 服务：核心 CRM 工具发现和调用，沿用 API key、会话及对象/字段权限（阶段 14）。

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
  ├─ /mcp            MCP Streamable HTTP，工具发现与调用转发到 Workspace DO
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

2026-11-12 从官方文档查得，来源见第 10 节。标了"已验证"的项由阶段 1 的 `test/platform/` 在 workerd 本地运行时里确认过。

| 项目 | 限制 | 对设计的影响 |
|---|---|---|
| DO SQLite 单库容量 | 10 GB | 单个 workspace 的数据上限 |
| D1 单库容量 | 10 GB，不可提升 | core 库只放身份数据，足够 |
| 每表最大列数 | 100（已验证，第 101 列报 `too many columns`） | 复合字段存成一个 JSON 列；每个对象限制 90 个字段 |
| 每条查询最大绑定参数 | 100（已验证） | 批量写入分片；`IN` 列表用 `json_each(?)` 传一个参数，5000 个 ID 已验证可用 |
| SQL 语句最大长度 | 100,000 字节（已验证，不是 100 KiB） | 不拼超长语句，值一律用绑定参数传 |
| `LIKE`/`GLOB` 模式最大长度 | 50 字节（已验证，超过报 `LIKE or GLOB pattern too complex`） | 包含匹配用 `instr`，不用 `LIKE '%x%'` |
| 单行、字符串、BLOB 大小 | D1 为 2 MB；DO 是整行约 8 MiB（已验证：限制按整行算，单值 8 MiB 可写，两个 5 MiB 的值放同一行就报 `SQLITE_TOOBIG`） | 富文本和 JSON 字段写入前按 2 MB 保守校验；同一行所有列合计还要低于 8 MiB |
| Worker 和 DO 内存 | 128 MB | 不把大结果集整体载入内存 |
| CPU 时间 | 默认 30 秒，可配到 5 分钟 | 批量操作分批，每批独立事务 |
| Worker 启动时间 | 1 秒 | GraphQL schema 懒构建，不放在全局作用域 |
| Worker 体积 | 64 MiB 未压缩 | 无压力 |
| 单个 DO 请求速率 | 软限制 1000 次每秒 | 一个 workspace 的并发上限，CRM 场景足够 |
| 数值精度 | 游标返回的整数受 JS 52 位精度限制 | `amountMicros` 上限约 9×10^15，够用；不要存更大的整数 |
| `sql.exec` | 不能执行 `BEGIN`、`SAVEPOINT`（已验证） | 事务一律用 `ctx.storage.transactionSync()`；回调里的 DDL 在抛异常时一起回滚（已验证） |
| DO 时间点恢复 | 30 天 | 备份策略的基础，见阶段 13 |
| Queues | 消息 128 KB，延迟最长 24 小时，重试最多 100 次 | 只传 ID，不传载荷 |
| Email Service | 仍为 beta | 邮件发送放在可选阶段，v1 用邀请链接 |

DO 的 SQLite 支持 FTS5、JSON 函数、数学函数、窗口函数、`RETURNING`、`ON CONFLICT`。不支持自定义函数，所以没有 `REGEXP`；`sqlite_version()` 等函数也被禁用。以上都已验证。

阶段 1 验证得到的其他事实：

- 外键默认开启（`PRAGMA foreign_keys` 为 1）。`ALTER TABLE ADD COLUMN ... REFERENCES` 加的外键，`ON DELETE CASCADE` 和 `SET NULL` 都生效，插入悬空引用会报错。删除带外键的列不会被阻止。
- `RENAME COLUMN` 会同步改写引用该列的索引。`DROP COLUMN` 遇到列上有索引会报错，要先删索引。
- FTS5 的 `trigram` 分词器可用，不区分大小写，中文和拉丁文子串都能命中，`bm25()` 可用。查询词少于 3 个字符时匹配不到任何结果，必须回退到 `instr`。加 `remove_diacritics 1` 后能忽略重音。用户输入直接放进 `MATCH` 会触发语法错误，需要转义成带引号的短语。
- 表达式加 `WHERE` 条件的唯一索引（`("emails" ->> '$.primaryEmail') WHERE "deletedAt" IS NULL`）生效：软删除的记录不参与唯一性检查。
- `->>` 返回 SQL 值，`->` 返回 JSON 文本（`'{"a":1}' -> '$.a'` 是字符串 `'1'`）。
- 从 DO 内部可以访问 D1 和 R2 绑定。

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
- 唯一约束用唯一索引实现。复合子字段上的唯一约束用表达式索引，如 `CREATE UNIQUE INDEX ... ON "rec_person" ("emails" ->> '$.primaryEmail') WHERE "deletedAt" IS NULL`。没有指定子字段的复合字段唯一索引，展开为该类型里 `isIncludedInUniqueConstraint` 的全部子字段（邮箱是 `primaryEmail`，链接是 `primaryLinkUrl`，电话是号码、国家码、区号三个）。
- 标准元数据里的唯一索引沿用旧系统的 `indexWhereClause`：`person.emails`、`company.domainName`、`workspaceMember.userEmail` 没有 `WHERE` 条件，软删除的记录也参与唯一性检查。用户通过 `isUnique` 新建的唯一索引带 `WHERE "deletedAt" IS NULL`。
- 外键的 `ON DELETE` 行为（`CASCADE`、`SET NULL`、`RESTRICT`）由 SQLite 外键执行：阶段 1 已验证 DO 里外键默认开启，`ALTER TABLE ADD COLUMN ... REFERENCES` 加的 `CASCADE` 和 `SET NULL` 都生效。
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
| `POST /mcp` | MCP 初始化、工具发现和调用；支持 `mode=meta` |
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
- 测试：vitest 加 `@cloudflare/vitest-plugin`（原 `@cloudflare/vitest-pool-workers`，已改名，旧包不再更新），在 workerd 里跑真实的 DO SQLite 和 D1。
- 端到端：现有的 `packages/twenty-e2e-testing`（Playwright），目标指向 `wrangler dev`。
- wrangler 版本和 `packages/twenty-website` 保持一致（4.151）。`compatibility_date` 取这个 wrangler 自带的 workerd 支持的最新日期（2026-10-12），升级 wrangler 时一起调整；开启 `nodejs_compat`。
- 仓库的 `.yarnrc.yml` 设了 `npmMinimalAgeGate: 3d`，发布不满 3 天的包装不上，新加依赖时要选更早的版本。

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
- **没有录 HAR。** Playwright MCP 的代码沙箱不能写文件，改为在浏览器上下文挂响应监听，把请求和响应发给本地 collector，按流程写 JSONL，再拆分和脱敏。结果和 HAR 拆分等价。
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

**实施记录**

- **包结构**：`packages/twenty-worker` 已加入根 `package.json` 的 workspaces。nx 目标有 `dev`、`build`（`wrangler deploy --dry-run`，依赖 `twenty-front:build`）、`deploy`、`test`、`typecheck`、`lint`。`worker-configuration.d.ts` 由 `wrangler types --include-runtime=false` 生成并入库，运行时类型来自 `@cloudflare/workers-types`。`migrations/` 和 `src/shared/` 等空目录留给后续阶段创建。
- **偏离 7.2**：
  - 测试库用 `@cloudflare/vitest-plugin`。原定的 `@cloudflare/vitest-pool-workers` 已改名、不再更新。
  - `compatibility_date` 是 2026-10-12，不是建包当天：和 twenty-website 一致的 wrangler 4.151 自带的 workerd 最多支持到这一天。
  - 仓库的 3 天包龄限制使依赖只能选较早的版本：hono 4.13.17、vitest-plugin 1.6.1、workers-types 5.20261108.1。
- **路由**：静态资源指向 `twenty-front/build`，开启 SPA 回退。`run_worker_first` 列出 `ApiPath` 的全部前缀（每个前缀写 `/x` 和 `/x/*` 两条），`test/wrangler-config.spec.ts` 校验两者一致。未实现的 API 路径返回 JSON 404。
- **client config**：所有可选功能关闭，`serverUrl` 和 `frontDomain` 取自请求地址。`signInPrefilled` 为 false，e2e 测试需要预填账号时再考虑开关。前端类型里有、旧服务端不返回的 `isTwoFactorAuthenticationEnabled` 也返回了（false）。
- **Workspace DO**：构造函数在 `blockConcurrencyWhile` 里跑 `sys_migration` 机制。迁移按数组顺序、各自在一个 `transactionSync` 里执行；名字必须唯一且升序，失败的迁移整体回滚、保持待执行。当前迁移列表为空，`ping()` 返回 `"pong"`。
- **平台验证**：结论都写进了第 4 节和 5.3 节，测试在 `test/platform/`。和原文不符、需要后续阶段注意的有：
  - SQL 语句上限是 100,000 字节，不是 100 KiB。
  - DO 的大小上限按整行算，约 8 MiB。原文写的是单值上限。
  - trigram 搜索词少于 3 个字符时一定匹配不到。
  - `DROP COLUMN` 要先删索引。
  - 删除带外键的列不会被阻止。
- **前端开发方式**：vite 开发服务器本来就把 `ApiPath` 前缀代理到 `REACT_APP_SERVER_BASE_URL`（默认 `http://localhost:3000`），所以只把 `wrangler dev` 的端口设成 3000，前端零改动。已验证从 3001 端口访问 `/healthz`、`/client-config`、`/metadata` 都转发到了 Worker。
- **验收**：`wrangler dev` 下浏览器打开 `/` 跳到 `/welcome`，登录页正常渲染，`/client-config` 返回 200。控制台只有 `/metadata` 的 404（`GetPublicWorkspaceDataByDomain`、`TrackAnalytics`），阶段 3 和 4 实现。
- `twenty-front` 的生产构建在本机耗时约 50 分钟，产物 65 MB、2167 个文件，最大单文件 7 MB，在 Workers 静态资源的限制内。
- 根目录 `.oxfmtrc.jsonc` 排除了契约 fixture、导出数据、种子 JSON 和生成的类型文件，否则 `nx lint` 会要求重排这些数据文件。

### 阶段 2：Workspace DO 的元数据存储与 DDL 引擎

**目标**：在 DO 内实现元数据的存储，以及"元数据变更到表结构变更"的全部逻辑。本阶段不涉及 HTTP，只做 DO 的内部模块和 RPC 方法，用测试驱动。

**说明**：旧系统用"flat entity 对比生成迁移动作，再由 runner 执行"的管线（`S/engine/workspace-manager/workspace-migration/`，约 900 个文件）。新实现不需要这套管线。SQLite 的 DDL 是事务性的，一次 `transactionSync` 里同时改元数据表和物理表即可。

**任务**

1. 建 `meta_` 表。至少包括：对象、字段（选项可以内嵌为 JSON）、索引、搜索字段、视图、视图字段、视图字段分组、视图筛选、视图筛选分组、视图排序、视图分组、页面布局、布局 tab、布局 widget、导航菜单项、命令菜单项、角色、角色分配、对象权限、字段权限、权限标志、时间线活动类型、关联记录路径、feature flag、键值对、文件。列以阶段 0 导出的 JSON 为准（`src/workspace/seed/standard-metadata.json` 的 `tables`；字段选项在旧系统里同时存在 `fieldMetadata.options` 列和 `fieldMetadataOption` 表）。
2. 初始化：新 DO 首次启动时载入 `standard-metadata.json`，建出 10 张 `rec_` 表和对应索引。
3. 对象操作：创建、改名、改标签、停用和启用、删除。创建自定义对象时要按旧系统的行为自动加上系统字段，以及它和 `noteTarget`、`taskTarget`、`attachment`、`timelineActivity` 之间的关联字段。阶段 0 确认旧系统加的是 `attachments`、`noteTargets`、`taskTargets`、`timelineActivities`、`agentChatThreadTargets`，最后一个在范围外，不加。
4. 字段操作：创建、改名（`RENAME COLUMN`）、改标签和设置、改选项（含改选项值时更新已有数据）、改默认值、停用和启用、删除。删除字段前要先删掉该列上的索引，否则 `DROP COLUMN` 报错（阶段 1 已验证）；`RENAME COLUMN` 会自动改写索引。
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

**实施记录**

- **元数据表**：28 张 `meta_` 表从旧系统的 `core` schema 生成，产物是 `metadata-table-definitions.constant.ts`。列和旧表一致，去掉了 `workspaceId`。表之间的外键和 `ON DELETE` 规则（50 条）也照搬过来，删除对象或字段时，视图字段、筛选、排序、索引列、搜索字段、页面布局等由 SQLite 级联清理，不用手写。`fieldMetadataOption` 没有建表，选项存在 `fieldMetadata.options` 里，但 `collectionHashes` 里仍报告这个集合。
- **初始化**：走 `sys_migration` 机制，`0001-create-metadata-tables` 建表，`0002-load-standard-metadata` 载入种子、建 10 张记录表和 35 个物理索引。6 个 `TS_VECTOR` 的 GIN 索引只保留元数据，阶段 7 换成 FTS5。种子里的默认 feature flag 也在这一步写入，阶段 3 不用再写。每个新 DO 首次构造时都会自动完成初始化。
- **操作**：DO 上的 RPC 方法是 `createObject`、`updateObject`、`deleteObject`、`createField`、`updateField`、`deleteField`、`createIndex`、`deleteIndex`。另有 `getCollectionHashes()`，以及按版本缓存的 `getMetadataSnapshot()`，供记录引擎使用。每个操作在一个 `transactionSync` 里同时改元数据和表结构，返回 `{ status: 'success', value }` 或 `{ status: 'fail', failure }`。`failure` 的结构和旧系统 `METADATA_VALIDATION_FAILED` 的 extensions 一致（`errors` 按元数据名分组，带 `summary`），阶段 8 可以直接透传。非校验类的意外错误照常抛出，同样整体回滚。
- **对齐旧系统的行为**：
  - 可编辑属性按标准、自定义、系统、系统副作用、关联字段分别限制。
  - 自定义对象的系统字段、`name` 字段、搜索字段，以及和 `timelineActivity`、`attachment`、`noteTarget`、`taskTarget` 的 `target<对象>` morph 关联，名称、标签、图标、描述、`onDelete` 都和阶段 0 导出里的 `initiative` 一致。
  - 对象改名时，这四个 `target<对象>` 字段跟着改名，用户自建的反向关联不改。
  - 评分字段默认生成 `RATING_1` 到 `RATING_5` 五个选项。
  - 选项改值或删除时，同步改写已有数据，`MULTI_SELECT` 的 JSON 数组也一样，交换两个值也不会冲突。
- **偏离和取舍**：
  - 索引名是随机的 `IDX_<27 位十六进制>`，不是旧系统的确定性哈希。事务内不能 `await`，WebCrypto 的摘要又是异步的；而索引名只要求唯一。
  - 旧系统检查的"复合字段展开后的列名保留字"（如 `emailsPrimaryEmail`）没有实现，新存储不展开复合字段。
  - 对象名额外的 lodash `camelCase` 检查也没有实现，命名格式靠正则保证。
  - 自定义对象的默认视图和页面布局属于阶段 8。
- **给后续阶段的提示**：
  - GraphQL `Field` 上的 `isUnique`、`isSearchable` 在旧表里不是列：前者看有没有只含该字段的唯一索引，后者看 `searchFieldMetadata`。阶段 4、8 输出时要现算。
  - 阶段 6 写入时，复合字段的空子字段要存 `null`，不要存空字符串，否则 `person.emails` 这类没有 `WHERE` 的唯一索引会把空邮箱当成重复。
  - 阶段 3 激活 workspace 时，默认角色取种子的 `defaultRoleUniversalIdentifier`（Member）。
  - JSON 列在类型上是 `JsonValue`，递归部分用 interface 声明，否则 workers-types 的 RPC 类型推导会报"无限深"，DO stub 的返回值会变成 `never`。
- **测试**：16 个测试文件、97 个用例。覆盖 21 种字段类型各自的创建、改名、删除，每步同时断言元数据表和物理表；以及关联、morph、对象生命周期、校验失败、三种回滚场景（后期校验失败、DDL 中途失败、唯一索引因重复数据建不出来）、集合哈希和快照缓存。
- Worker 包体积因为内嵌了种子 JSON，增至 2.5 MiB（gzip 后 462 KiB）。

### 阶段 3：认证、会话与 workspace 生命周期

**目标**：实现注册、登录、session 和 workspace 的创建与激活。可以和阶段 2 并行，最后的 `activateWorkspace` 需要阶段 2 的初始化能力。

**任务**

1. D1 迁移：`user`、`workspace`、`userWorkspace`、`userSession`、`appToken`，以及登录 token 的一次性使用记录。列参考旧实体，去掉计费、SSO、双因素相关的列。
2. 在 Worker 里搭起 `/metadata` 的 yoga 服务，按 7.3 的策略加载完整 SDL 和零值 resolver。
3. session：签发、校验、撤销，cookie 的读写规则和 CSRF 检查按 6.2 实现。请求认证后得到 `{ userId, workspaceId, userWorkspaceId, workspaceMemberId }`。
4. 密码哈希：`bcryptjs`，10 轮。没有历史数据，不需要兼容旧哈希。
5. token：登录 token（15 分钟，一次性）、文件 token、文件上传 token，统一用 HS256，密钥由 `APP_SECRET` 加类型派生，用 WebCrypto 实现。`AuthTokenPair` 里返回同样方式签发的 access token，同时支持 `Authorization: Bearer` 认证，供脚本调用。不实现 ES256 密钥轮换。
6. 实现这些操作：`checkUserExists`、`getLoginTokenFromCredentials`、`getAuthTokensFromLoginToken`、`signIn`、`signUp`、`signUpInNewWorkspace`、`signUpInWorkspace`、`signOut`、`getPublicWorkspaceDataByDomain`、`activateWorkspace`，以及引导流程里前端会调用的 `getWorkspaceCreationDefaults`、`skipSyncEmailOnboardingStep`、`getInviteSuggestions`（空列表）、`sendInvitations`（空 emails 时返回成功）、`updateWorkspaceMemberSettings`、`currentUserSessions`。调用顺序见下方参考代码和 `contract/fixtures/auth-signup-onboarding/`。
7. `activateWorkspace` 的步骤：把 workspace 状态置为创建中；初始化 DO（阶段 2，种子已含 Admin、Member 和默认 feature flag）；给创建者分配现有 Admin 角色，按种子的 `defaultRoleUniversalIdentifier` 设置默认角色；创建 `workspaceMember` 记录；预填演示数据；状态置为 `ACTIVE`。
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

**实施记录**

- **D1**：`migrations/0001-core-auth.sql` 创建六张身份表（包含 `usedLoginToken`），邮箱大小写归一化并加唯一约束。单 workspace 约束由可空的 `singleWorkspaceKey` 唯一列保证；认证上下文仍从 session 的 membership 解析 workspace，不写死 workspace ID。
- **GraphQL**：`/metadata` 懒构建完整契约 SDL，实现自定义标量、认证和引导操作。未实现的查询返回零值，未实现的 mutation 在认证后返回 `NOT_IMPLEMENTED`。`currentUser` 支持前端完整查询，提供引导状态、`userVars`、当前成员、默认角色和 feature flag；完整对象权限及元数据读取留到阶段 4，目前只授予个人资料权限。额外实现 `goBackToPreviousOnboardingStep` 和 `revokeUserSession`，供引导返回和个人设置里的会话撤销使用。
- **会话与 token**：cookie 有效期 180 天，服务端只存 SHA-256；HTTP/HTTPS 的名称、opt-in、导航读取和 Origin 检查按 6.2。Bearer access token 同样检查 D1 session，登出或撤销后立即失效。密码用 `bcryptjs` 3.0.2、10 轮；HS256 密钥用 HMAC 从 `APP_SECRET` 按用途派生。登录 token 有效期 15 分钟，通过 D1 唯一写入保证并发兑换只成功一次；access token 30 分钟、refresh token 180 天。文件和上传 token 提供签发校验工具，路由在阶段 9 接入。
- **激活与加入**：D1 状态更新用条件写入取得激活权，超过两分钟的创建中状态可以重试。DO 的成员、角色关联、5 个公司、5 个人员和 6 个商机，以及 `sys_workspaceActivation` 标记在一个同步事务内提交；D1 完成写入前中断也能安全重试。默认角色和 feature flag 沿用阶段 2 种子，不重复创建。`signUpInWorkspace` 要求 workspace 已激活、公共邀请已开启且 hash 正确，加入者分配默认 Member；开启邀请和管理成员仍属于阶段 10。
- **引导**：激活后直接进入 `PROFILE_CREATION`，跳过邮件同步和计费。个人资料更新只允许自己的成员记录，并校验允许的设置字段；保存姓名后进入 `INVITE_TEAM`，空邮箱邀请完成引导，非空邮箱仍返回 `NOT_IMPLEMENTED`。必须同时返回 `userVars.ONBOARDING_INVITE_TEAM_PENDING`，否则前端会自行跳过邀请页，与服务端状态不一致。
- **平台配置**：新增 `AUTH_RATE_LIMITER`，按 IP 和归一化邮箱分别限制每分钟 20 次认证尝试；每天 UTC 03:00 清理过期 session、refresh token 和登录 token 使用记录。限制使用 Cloudflare 的 [Rate Limiting 绑定](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)，它是每个 Cloudflare 位置的近似限制。
- **冷启动修正**：真实 `wrangler dev` 发现阶段 2 使用的共享包打包 chunk 会在全局作用域生成 ACTOR 选项 UUID，workerd 拒绝启动。Worker 的普通共享依赖改用 source alias 以便裁剪；复合类型定义通过单独 alias 在 DO 的 `blockConcurrencyWhile` 内懒加载，之后才执行迁移。事务内部仍无 `await`，没有修改共享包或旧服务端。
- **验证**：新增 18 个 workerd 测试，覆盖完整前端 query、注册登录、邀请加入和角色、引导返回、激活重试、登录 token 并发重放与过期、cookie/CSRF、Bearer 撤销、密码错误、限流和签名用途隔离。直接 `tsgo`、Nx lint 和完整 Worker 测试通过；测试使用 `--skip-nx-cache`。本机 Nx 的依赖任务 `twenty-shared:generateBarrels` 在 Node 26 下挂起，因此 lint/test 使用 `--excludeTaskDependencies`，复用现有 shared 构建和 lint 插件；`wrangler dev` 真实冷启动另行通过。
- **浏览器验收**：使用原有前端构建，注册 `stage3-browser@example.com`、创建 workspace、填写资料、从邀请页返回资料页再继续、跳过邀请，确认服务端 `onboardingStatus: COMPLETED`。通过设置里的 Logout 登出并用邮箱密码重新登录。前端零改动；主记录界面所需的元数据和对象权限仍在阶段 4 实现。
- **本地启动**：使用仓库要求的 Node 26，在 `packages/twenty-worker/.dev.vars` 配置随机 `APP_SECRET`（文件已被忽略），先运行 `wrangler d1 migrations apply CORE_DB --local`，再运行 `wrangler dev`。验收使用独立的 `.wrangler/stage3-acceptance` 本地存储，迁移和 dev 都传相同的 `--persist-to`；未部署远程资源。

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
- 元数据 API 返回 10 个标准对象和它们的字段；设置里的数据模型页按现有前端规则显示 5 个非系统业务对象，5 个系统对象保留在 API 中。
- 浏览器控制台没有 GraphQL 校验错误。
- 启动阶段的每个操作，响应结构和 fixture 一致（ID 和时间戳除外）。

**实施记录**

- **读取接口**：实现全部阶段 4 元数据操作，以及对象/字段单项读取、视图和页面布局的子集合读取、workspace 设置与角色读取。对象含字段、索引和搜索字段；视图含字段分组、筛选、排序和看板分组；布局含 tab、widget、配置与位置 union。对象支持筛选和游标分页。DO 按全部 collection hash 缓存读取模型，Worker 每个请求只加载一次；权限按当前 membership 单独计算，不缓存进共享数据。
- **前端关联契约**：物理 morph 子字段不放入 `fieldsList`，主字段的 `morphRelations` 列出保留的目标，反向普通关联指向 morph 主字段。`isUnique` 来自单字段唯一索引，`isSearchable` 来自搜索字段元数据。已用采集的完整 query 验证，布局配置和命令 payload 的 union 都有类型解析。
- **当前用户和权限**：`PermissionContext` 集中实现临时策略：Admin 具有核心 workspace、成员、角色、数据模型和布局权限，Member 具有核心记录读写、视图、文件和个人资料权限；无角色不授予访问。两类角色均不授予 AI、工作流、应用、邮件日历、计费、SSO、管理后台等权限。当前成员、全部 workspace 成员、默认角色、feature flag 和应用信息来自 DO，身份与 membership 来自 D1。阶段 10 替换对象/字段级真实权限；现阶段只标记标准只读字段为不可编辑。
- **范围外操作**：logic function、front component、连接账户、消息和日历 channel、AI channel、validation rule 查询返回空列表，`TrackAnalytics` 对未登录访问也返回成功。`FindManyApplications` 返回种子里的 Standard 和 Custom 两条应用；原操作清单写成一条，与 fixture 不符，已更正。种子仍保留若干通过通用 WORKSPACE 权限可见的 AI/计费设置命令，读取层按目标路径过滤它们。
- **SSE**：复用 Yoga 的 GraphQL-over-SSE，订阅时检查 workspace 和角色，首次立即返回空事件，此后每 30 秒返回空的 records、metadata 和 jobs 列表；取消或断开会清理计时器并结束等待中的读取。`addQueryToEventStream`、`removeQueryFromEventStream` 认证后返回 true，实际事件注册和广播留在阶段 11。
- **应用启动与成员页的衔接**：浏览器验证发现，成员设置实际从 `/graphql` 查询 workspaceMember 记录，而主记录页也会立即请求记录。因此新增临时只读入口：在 DO 内懒加载阶段 0 的 core SDL，真实读取当前 workspace 的成员（含姓名、邮箱、头像、设置和 actor JSON），支持基本筛选及 first/offset；其余记录返回空连接，mutation 返回 `NOT_IMPLEMENTED`。Worker 先校验 session、workspace、权限和 cookie Origin，再通过 RPC 转交，同步执行过程无 `await`。阶段 5 必须用元数据驱动的动态 schema 与真实记录查询替换 `execute-shell-record-query.util.ts`，包括完整排序、游标和关系展开。
- **文档修正与边界**：数据模型页调用 `useFilteredObjectMetadataItems`，默认隐藏系统对象，所以界面显示 company、person、opportunity、task、note，API 保留全部 10 个对象；未为了凑界面数量修改 `isSystem`。现有前端的 Communication 入口仍受通用 WORKSPACE 权限控制，个人资料仍显示 2FA/邮件重置入口，这些页面写入不在本阶段实现。前端零改动，阶段 13 清理时处理这些残留入口。
- **测试**：新增 41 个 workerd 测试，覆盖 25 个采集的阶段 4 操作、默认角色及 settings、morph/索引解析、分页、hash 更新、Member 权限、workspace 隔离、菜单裁剪、SSE 周期/取消和 HTTP 流、成员记录与只读占位入口；原认证测试复用抽出的公共测试工具。直接 `tsgo`、Nx lint 和完整 Worker 测试通过，最终全量测试耗时 26.4 秒，使用 `--skip-nx-cache`；lint/test 沿用阶段 3 的 `--excludeTaskDependencies`，避开本机 shared 依赖任务挂起。
- **浏览器验收**：使用本地 wrangler 加原前端构建，登录 `stage4-browser@example.com` 后验证五个核心导航、空公司列表、数据模型、公司字段、General、成员及 Roles，全部 API 成功，无 GraphQL 错误和页面异常；共享预览定位不稳定后改用本地 Playwright 完成。验收数据使用独立的 `.wrangler/stage4-acceptance`，未部署远程资源。

### 阶段 5：记录查询引擎（读）

**目标**：`/graphql` 的记录读操作；全局 `search` 在阶段 7 实现。这是整个项目技术风险最高的阶段。

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

**实施记录**

- **入口与执行**：删除阶段 4 的 shell 查询实现，`/graphql` 在 Worker 验证 session、活动 workspace 和 CSRF 后，将请求与当前身份通过 RPC 交给 DO，原样返回 JSON。DO 再检查成员记录、当前角色，并在 `transactionSync` 内同步完成 schema 缓存、GraphQL 校验和全部 SQL；没有事务内外部 IO 或 `await`。权限错误在 DO 序列化，跨 RPC 后仍保留 GraphQL code。
- **动态 schema**：从当前元数据快照生成标准/自定义对象、复合类型、枚举、筛选、排序、连接、聚合、分组和 duplicates 输入输出，按 snapshot version 缓存；字段改名、删除、停用及对象改名会重建。仅复用采集 SDL 中不依赖 workspace 的标量和复合类型定义，不再构建整份旧 workspace schema。记录 mutation 仍返回 `NOT_IMPLEMENTED`，阶段 6 补齐。
- **筛选与排序**：实现 6.5 的操作符、字段间比较、关系筛选、复合 JSON 子字段和隐式 AND。`regex`、`iregex` 明确返回 `BAD_USER_INPUT`。文本包含查询用 `instr`，复杂 `%`/`_` 和反斜线转义用递归匹配，避开 SQLite 的 50 字节 LIKE 限制；startsWith/endsWith 按字面量匹配。`IN` 和数组成员列表统一绑定一个 JSON 参数；所有查询检查 100 个绑定参数和 100,000 字节 SQL 限制。排序支持四种空值顺序、复合字段、关联字段和元数据选项顺序。
- **分页与软删除**：支持 first/last、after/before、offset，默认最多 200 条，嵌套关联默认 60 条，始终追加 id 打破排序平局。游标使用旧代码的 base64url JSON，保存原始 SQL 排序值，避免结果里的空字符串/空数组转换破坏 NULL 边界。核对旧 `checkForDeletedAtFilter` 后，仅穿透 and/or/not 检查当前对象的 deletedAt；关联筛选里的 deletedAt 不扩大主对象查询范围。
- **选择集与关联**：解析别名、fragment 和 include/skip，只读取投影、排序游标和关联需要的列。多对一按目标 ID 批量查，一对多用 `ROW_NUMBER() OVER (PARTITION BY ...)` 和分组聚合，使每个父记录有独立的页和 totalCount，支持多层、morph 目标及被软删除关联。20 个父记录各有 3 条子记录、每组取 1 条再展开公司时，总共执行 5 条 SQL。用独立的选择结果存储避免别名与物理列或连接字段重名。
- **聚合、分组与去重**：聚合基于完整筛选结果，不受记录分页影响；空集合的 totalCount 为 0，其余聚合为 null，百分比返回 0–1。实现数值、日期、货币、rating、布尔及空值/唯一值聚合。看板支持 SELECT 选项顺序、每组记录分页和聚合排序；支持数组拆组、多维度、关联和全部日期粒度，按记录所在年份计算时区偏移及夏令时区间。duplicates 使用元数据 duplicateCriteria，按旧实现忽略长度小于 3 的候选值，支持已有 ID 和新建输入，并独立读取匹配所需字段。
- **结果与权限**：JSON 列解析为对象/数组，布尔转换，复合字段补齐旧契约中的空字符串和空数组默认值。记录投影、筛选、排序、关系展开、聚合、分组和去重读取接入 `PermissionContext`；当前仍使用阶段 4 的临时角色策略，阶段 10 实现真实角色/字段权限。列表 searchVector 筛选先按搜索字段用 instr 匹配，FTS5 和全局 search 留在阶段 7。
- **契约重放**：重放 365 条阶段 0 成功读取请求，覆盖标准对象、成员、时间线、备注任务、附件、自定义 initiative、关联和看板。测试从采集响应组合记录快照，导入采集的自定义元数据，移除范围外关联选择；改名前的 Project 请求按最终名称 Initiative 重放。比较保留选择的响应结构及值类型，ID、时间、历史写入状态和旧服务返回的 typename 不作字面量比较。全局 Search、范围外对象和原本失败的权限请求不计入这 365 条；错误与隔离另有行为测试。前端零改动，服务端参考包零改动。
- **万条数据性能**：本机 Node 26/workerd，10,000 条 company、按 position 排序取 60 条，含 totalCount、游标、域名和 pageInfo。独立运行 DO 内首次 84 ms，随后 5 次为 5、6、5、5、5 ms；含测试 RPC 的往返为 122 ms 和 6–7 ms。最终全量测试并发下首次 203 ms、随后 6、11、6、6、6 ms，往返 235 ms 和 10–60 ms。包含 schema 冷构建与权限检查；这是本地墙钟时间，不是生产 CPU 指标。测试通过 reporter 输出实测值，不设依赖机器速度的耗时断言。
- **浏览器验收**：本地 wrangler 配合原前端构建，验证 5 家公司、100 个人员和 6 个商机；人员从 60 条滚动加载余下 40 条，按 Job Title 筛到 95 条、姓名降序首条正确；Brian Chesky 详情显示字段和 Airbnb 关联；By Stage 看板显示五列、卡片和金额汇总。无 GraphQL 错误、页面异常或失败的 API 请求。使用从阶段 4 本地数据复制的独立 `.wrangler/stage5-acceptance`，验收用的额外 95 个人员只写入该本地库；未部署远程资源。
- **运行边界**：新增 `twenty-shared/constants` 的 source alias，避免 Wrangler 从 shared dist 引入模块顶层随机数初始化而冷启动失败。记录写入、保存视图筛选排序、文件 URL 签名、全局搜索和实时广播仍由后续对应阶段实现。
- **检查结果**：新增 440 项 workerd 测试（365 条契约重放、75 项行为和性能测试），最终 27 个测试文件、596 项测试全部通过，Nx 耗时 32.1 秒。直接 `tsgo` 和 Nx lint 通过；lint 为 0 warnings/0 errors，格式检查通过。lint/test 使用 `--skip-nx-cache --excludeTaskDependencies`，沿用阶段 3 的本机 shared 依赖任务绕行方式。

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

**实施记录**

- **写入引擎**：动态 schema 和 resolver 支持 create/update/delete/restore/destroy 的单条、批量操作、create upsert 和 merge。支持多对一的嵌套 create、按唯一键 connect 和 disconnect；复合字段更新保留未提供的子字段。检查必填、类型、选项、morph 单目标、邮箱、电话、链接、富文本和大小，复用 shared 的校验与规范化工具，电话使用仓库已有版本的 libphonenumber-js。复合字段的空字符串存 null，单字段上限 2 MB、单行 8 MB；createdBy/updatedBy 由认证上下文覆盖，接入对象和字段 PermissionContext。
- **批量与事务**：前端 CSV 固定每批 200 条，因此将 mutationMaximumAffectedRecords 与 Worker 写入上限统一为 200；SQL INSERT 仍按每句最多 100 个绑定参数分片。嵌套写入及合并的关系改写计入限制。整个 GraphQL 请求在 DO 的一个 transactionSync 中执行，后续别名、SQL 分片、校验或返回投影出错时，记录、时间线、导航清理和 outbox 全部回滚，响应 data 为 null。upsert 在创建嵌套记录之前匹配主键及元数据唯一索引，并遵守部分索引条件，避免更新时产生孤立关联。
- **排序、合并与删除**：计算 first/last position，保留显式数值位置。merge 支持最多 9 条记录、优先记录、dryRun、复合字段及数组合并；迁移反向关联和时间线，去重备注/任务 junction，并处理被软删除记录仍占用的非部分唯一键。永久删除由 SQLite 执行 FK 的 CASCADE/SET NULL/RESTRICT，应用层同步生成关联变更事件和文件清理任务。
- **同步副作用**：生成 shared database-events 结构的记录事件，保留身份、before/after、diff 和 updatedFields。写入带活动类型快照的创建、修改、删除、恢复时间线，备注和任务的关联及更新也写入目标记录时间线。删除记录时清理指向它的导航菜单项并更新 collection hash；失败请求同时回滚链接删除和 hash。
- **outbox 与 alarm**：新增 DO 迁移 0003，建立 sys_outbox 与 sys_scheduledTask。outbox 支持领取、5 分钟租约、退避重试、完成确认和稳定的幂等键；消费者必须使用 item.id 去重，以覆盖副作用完成后、确认写入前的中断。重复 alarm、租约过期和中断后重试均有测试。实时事件、FILES 引用移除及永久删除的文件清理项先保持 pending，阶段 9/11 注册实际消费者；当前不会丢弃未支持的任务。每日清理软删除超过 30 天的记录，每轮最多 100 条，有积压时继续调度，失败保留诊断并延后重试。
- **契约重放**：逐条重放 74 条范围内的成功写入及 BAD_USER_INPUT fixture，覆盖核心对象、自定义对象、关联、批量、upsert、恢复、销毁和合并。每条测试重建采集元数据与读取快照，比较保留选择的响应结构、值类型和错误码。较早脚本中的可空列表变量按当前 SDL 改成非空声明；保留旧服务实际接受的 blocknote 富文本输入。历史权限失败 fixture 留给阶段 10，事务、字段权限、唯一键冲突和返回投影失败另有行为测试；365 条读取契约继续通过。
- **浏览器验收**：本地 wrangler 配合前端构建，完成创建人员、编辑职位、软删除、恢复、永久删除、列表多选合并，以及创建备注/任务并关联人员；时间线显示创建、修改及关联条目。通过原 CSV 向导导入 1,000 条人员，5 批各 200 条全部成功，无 GraphQL 错误、页面异常或失败 API 请求。访问已删除记录时，前端先发出的普通查询按契约返回 NOT_FOUND，随后带 deletedAt 查询成功。数据仅写入独立的 .wrangler/stage6-acceptance，未部署远程资源。单条合并的记录搜索选择器依赖阶段 7 的 Search，本阶段使用列表多选入口验收合并。
- **启动兼容修正**：临时成员权限增加 IMPORT_CSV，开放现有导入入口。命令菜单原来会在普通记录页挂载工作流专用组件，因范围外 workflow 元数据已裁掉而崩溃；前端只补一处可用命令检查，详见第 9 节。twenty-server 参考包零改动。
- **检查结果**：新增 90 项 workerd 测试，其中 74 条写契约、16 项行为测试；最终 31 个测试文件、686 项测试通过。Worker 与前端直接 tsgo 通过，Worker Nx lint 和前端改动文件的 type-aware lint、格式检查通过，均为 0 warnings/0 errors。前端构建及相关 5 项组件测试通过，Worker wrangler deploy --dry-run 通过；包体 4,795.99 KiB，gzip 689.43 KiB。lint/test 使用 --skip-nx-cache --excludeTaskDependencies，沿用阶段 3 的本机 shared 依赖任务绕行方式。

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

**实施记录**

- **索引与迁移**：新增 DO 迁移 0004，为每个对象建立 fts_<对象> 和 sys_searchIndex 注册表，使用阶段 1 验证过的 trigram remove_diacritics 1。索引按 searchFieldMetadata 及活动字段生成，每个搜索字段独立一列，列名由字段 ID 派生。迁移回填已有活动记录，软删除记录不进入索引。
- **写入同步**：在 rec_ 表上安装 INSERT/UPDATE/DELETE 触发器，索引更新和原记录写入处于同一 SQLite 事务。覆盖记录 mutation、merge、成员资料、演示数据、外键级联及后台清理；软删除移除索引，恢复重新索引，失败请求一起回滚。已在 workerd 验证触发器内写 FTS5 可用，没有事务内异步 IO。
- **元数据重建**：元数据操作在事务内暂停搜索触发器，完成 DDL 后按字段 ID、名称、类型和标签字段计算签名，仅重建发生变化的索引并恢复触发器。对象创建、改名、删除，字段新增、改名、搜索开关、启用停用和删除均覆盖；失败的校验或 DDL 会回滚触发器及索引。未为了索引变更修改已提交的旧迁移。
- **文本提取与筛选**：复用 shared 的 isSearchableFieldType，提取文本、UUID、姓名、地址、富文本 markdown，以及邮箱、电话和链接的主要与附加值。邮箱补充分隔 @ 的形式，电话补充区号与号码、国内前导 0 的形式；不索引 JSON 属性名或富文本编辑器结构。searchVector.search 改为 FTS 查询，多个词要求全部命中；少于 3 个 Unicode 字符的词用索引内容列上的 instr 回退，长短词可以混用。MATCH 的值全部绑定，每个词转成转义后的带引号短语，输入中的引号、星号、括号不会变成查询语法。短词回退沿用 SQLite lower 的 ASCII 大小写边界。
- **全局 Search**：在 /graphql 动态 schema 中补齐 SearchRecord、SearchResultConnection 和 ObjectRecordFilterInput，支持对象包含/排除、记录筛选、空输入、最多 100 条结果和游标分页。命中任一词可进入结果，命中全部词优先；tsRank 取负 bm25 以沿用降序约定，tsRankCD 在全部词命中时取该分数，其余为 0，纯短词或空输入为 0。排序追加标准对象优先级、对象名和记录 ID；游标保留旧契约的 lastRanks/lastRecordIdsPerObject，并增加 lastObjectNameSingular，避免跨对象同分分页遗漏或重复。只返回所需标签与图片列，姓名拼接，LINKS 图片复用 shared favicon 工具；FILES 图片的签名 URL 仍留给阶段 9。
- **权限与契约**：搜索排除无读取权限的对象、不可读标签及不可读搜索字段，隐藏图片字段不输出值；显式包含对象时沿用旧服务允许搜索 isSearchable 为 false 的活动对象。重放全部 28 条 Search fixture，比较响应结构、typename、字段值类型和游标结构；7 条专门搜索场景中原有非空查询均有命中。历史快照和 trigram 排名与原 PostgreSQL 数据不同，不比较历史结果数量、排序或数值分数。365 条读取契约、74 条写入契约继续通过。
- **浏览器验收**：从阶段 6 本地数据复制独立的 .wrangler/stage7-acceptance，验证 Brian、airbnb、chesky@、新建中文姓名的三字和两字查询、含引号/星号/括号的输入；现有 Search any field 列表入口按新人员邮箱准确筛到一条，软删除后全局搜索不再命中。新建记录不需重建索引即可被搜到。共享预览完成部分查询后，在新建步骤遇到两次定位失败，剩余流程用本地 Playwright 完成；最终无 GraphQL 错误、页面异常或失败 API 请求。前端与 twenty-server 均零改动，未部署远程资源。
- **检查结果**：新增 40 项 workerd 测试（28 条 Search 契约、12 项行为），覆盖中文、重音、特殊字符、电话/邮箱/链接/地址/富文本、写入和元数据生命周期、回滚、权限、隔离和分页。最终 34 个测试文件、726 项测试全部通过；直接 tsgo、Nx lint、格式检查和 wrangler deploy --dry-run 通过，lint 为 0 warnings/0 errors。Worker 包体 4,813.61 KiB，gzip 693.49 KiB。lint/test 沿用 --skip-nx-cache --excludeTaskDependencies 的本机 shared 依赖绕行方式。

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

**实施记录**

- **写入入口与事务**：`/metadata` 的对象、字段、索引 mutation 复用阶段 2 的操作；新增视图、视图字段、字段分组、筛选、筛选分组、排序、分组及导航菜单的增删改，包含 SDL 中的批量入口。Worker 认证后调用 DO 的粗粒度 `executeMetadataMutation`，参数编码成 JSON，避免内联 GraphQL 输入生成的无原型对象触发 RPC DataCloneError。在同一个 `transactionSync` 内做权限校验、元数据和 DDL 写入、搜索索引同步、collectionHashes 更新。每批最多 200 项，一项失败整批回滚；嵌套返回值投影前清空请求内的元数据缓存，记录 schema 按既有 snapshot version 失效。
- **默认 UI 元数据**：新建自定义对象同时生成 INDEX 表格视图、详情字段视图、带 Home/Timeline/Tasks/Notes/Files 标签的记录页布局、创建表单和 workspace 导航项。新建或删除字段同步默认视图与创建表单，关联同时处理两端；字段改名保留原 ID，所以布局和已有记录继续可读。Kanban 视图按 Select 选项生成分组。没有采集到布局编辑 mutation，本阶段按方案只生成默认布局，编辑接口保留到后续需要时实现。
- **权限与校验**：DO 重新校验实际成员、用户和角色，数据模型写入需要 DATA_MODEL，公共视图写入需要 VIEWS，workspace 导航需要 WORKSPACE；个人导航只能由所属成员修改。视图字段、筛选、排序及父分组必须属于同一对象或视图；拦截筛选组和导航文件夹循环、跨成员文件夹、重复列、无效记录和不安全链接。原生页面键复用 shared 的 isNativePageKey。软删除视图一并隐藏子实体，筛选组递归软删除；永久删除沿用 SQLite 外键级联。校验异常保留 METADATA_VALIDATION_FAILED 的 errors/summary 结构和 create/update/delete 类型。
- **默认值与设置页**：API 接收字段默认值后递归去掉 SQL 字面量外层单引号并还原成对单引号，兼容复合字段 JSON 内的字面量；阶段 2 的内部操作不改签名。ObjectRecordCounts 查询实际未删除记录数，MostlyEmptyFieldMetadataIds 按允许的降级返回空列表。currentUser 返回实际的 workspaceCustomApplication，修复前端把自定义字段当作标准字段、改标签时不生成同步 API 名称的问题。补齐导航项 targetRecordIdentifier，通过一次 DO RPC 按读取权限取得收藏记录的实时标签及图片标识，刷新后收藏不再因缺少标签被前端隐藏；FILES 签名图片 URL 留给阶段 9。
- **契约与测试**：新增 43 条元数据写入 fixture 重放，覆盖对象和各字段类型、改名、停用启用、删除、视图列、筛选、排序和收藏。使用真实静态 GraphQL schema/resolver 和 workerd DO，以测试上下文注入已认证身份；另有 9 项 HTTP 行为测试覆盖真实认证入口、默认布局、SQL 默认值、改名后数据、关联、批量回滚、嵌套筛选删除、循环引用、导航排序与收藏权限。历史 fixture 比较响应结构和字段类型，生成 ID、时间及历史字段数量不作逐值比较。旧服务两条 deferred schema action 尚未完成的临时 CONFLICT fixture 不重放：新实现同步提交 DDL，不存在该后台等待状态。
- **浏览器验收**：在独立的 .wrangler/stage8-acceptance 数据副本上通过共享预览创建 Stage Eight Project、文本和数字字段及指向人员的关联；新建记录并选择 Brian Chesky，列表和默认详情页均能读取。把 Reference 改成 Tracking Reference 后，已有 Preserved reference 值仍可读。新建 Stage Eight Saved 视图，保存名称筛选、名称升序并隐藏 Owner 列，刷新后保持；收藏后刷新显示正确记录名，取消收藏后刷新移除。其余字段类型由 fixture 重放覆盖。验收发现的 RPC 序列化和 workspaceCustomApplication 缺失问题已修复并纳入 HTTP 回归测试。
- **检查结果**：36 个测试文件、778 项测试通过；直接 tsgo、Nx lint、格式检查、git diff --check 和 wrangler deploy --dry-run 通过，lint 为 0 warnings/0 errors。Worker 包体 4,844.57 KiB，gzip 699.75 KiB。lint/test 沿用 --skip-nx-cache --excludeTaskDependencies 的本机 shared 依赖绕行方式。未修改 twenty-front 或 twenty-server，未部署远程资源。

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

**实施记录**

- **存储与上传状态**：已有阶段 2 的 meta_file 表，本阶段通过 DO 迁移 0005 扩展上传者、字段、workspace、R2 key、声明大小、租约及过期时间，保留原有列。createFileUpload 返回 15 分钟有效的上传能力令牌，限定 workspace 和 fileId；PUT 用 TransformStream 计数并通过 FixedLengthStream 流式写 R2，过量返回 413，短包返回 400，重复上传返回 409。状态为 PENDING → UPLOADING → STORED → COMPLETING → UPLOADED，未完成的文件不能下载或写入记录；租约防止同时上传或完成。文件直接写最终的 workspace/applicationUniversalIdentifier/folder/path，R2 条件写防止覆盖已有内容。
- **类型校验与 SVG**：沿用 file-type/core 的内容识别和 mrmime 的扩展名映射，并保留 TypeScript 文件的 MIME 特例；头像/logo 复用 shared 的 CORE_PICTURE_MIME_TYPES。SVG 最多 2 MiB，使用 sanitize-html 的 XML 解析和 SVG 元素/属性白名单，移除脚本、事件、样式、foreignObject、外部链接和非本地片段引用，拒绝 DTD/实体声明。仅 SVG 有界读入内存，其余文件只读取 8 KiB 前缀。净化使用 R2 etag 条件覆盖，保存净化标识，使“R2 已写入、DO 尚未提交”后的完成重试仍可成功；不用旧服务的 JSDOM。Vitest 的 SSR dependency optimizer 预打包 sanitize-html，解决其 CommonJS 依赖在 workerd 测试中的加载问题。
- **下载与签名**：GET/HEAD /file/:folder/:id 要求签名、用途、workspace、fileId 和实际目录全部匹配；缺少、伪造或借用别的文件 token 返回 403。core-picture 仅忽略过期时间，其余验证仍执行。支持单段、开放结尾和后缀 Range、206/416、ETag/304、If-Range、Content-Length 和缓存头。普通文件缓存时间收紧到 token 剩余寿命，区别于历史 fixture 固定 86400 秒，避免缓存越过能力令牌有效期。危险文档强制下载，并设置 nosniff/CSP；图片、文本、PDF 和媒体可预览。
- **前端接入**：实现头像、workspace logo 的专用完成入口，以及新 workspace 在登录令牌兑换和激活前上传 logo 的流程；未激活 workspace 的特殊路径在 DO 内重新通过 D1 校验创建者和成员。兼容旧式 multipart 上传 mutation。补齐前端上传后写 avatarUrl、删除头像/清空 logo 的设置入口；workspace 的其他设置仍留给阶段 10。currentUser.editableProfileFields 改成前端实际识别的 firstName/lastName/profilePicture，替换阶段 3 占位的 name/avatarUrl。FILES 写入只接受本 DO 已完成且属于目标字段的文件，持久化 fileId/label，读取时补 extension 和新的签名 URL；全局搜索和收藏图片也接入 FILES 投影。记录事务内用 node:crypto 的同步 HMAC 签名，与异步 token 校验保持相同的用途派生规则，没有事务内 await。
- **删除与清理**：接入阶段 6 的 file-cleanup outbox，覆盖字段移除文件、永久删除及关联级联删除；删除前检查所有 FILES 引用、成员头像和 D1 的 workspace logo，回收站中的记录也计为有效引用。每小时分批检查超过 24 小时的未完成上传和已完成但未引用的文件；每页 100 项，超过 20 个文件的删除通过 Queue，消息每批最多 100 个 ID。R2 删除失败保留 DELETING 元数据并按 outbox 退避重试，重复投递幂等；周期任务也重投过期的 DELETING 项，避免 Queue 重试耗尽后遗失删除工作。跨 D1/R2 的临界区用 blockConcurrencyWhile 防止重新引用，异常在回调内捕获后再向外抛，避免 DO 被重置而丢失正常的重试状态；没有在 SQLite 事务内调用外部 IO。
- **边界与偏离**：普通直传上限取 100,000,000 字节，头像/logo 为 10 MiB，低于旧服务的 1 GiB 普通上传上限，以适配 Cloudflare Free/Pro 域名的请求体限制。只开放范围内的 CorePicture 和 FilesField，工作流、邮件、应用包等目录不启用。历史文件访问 fixture 中无 token 的旧头像地址不再回退读取：按本阶段验收标准统一返回 403。没有线上旧文件需要迁移。
- **验证**：重放 files/021、026、037、074、099 的申请与对应的 023、028、039、076、101 完成 mutation，映射历史字段和生成 ID，并实际 PUT/GET 校验字节；另外 16 项行为测试覆盖 Range、缓存、能力令牌、大小/类型、SVG 净化及中断重试、头像/logo 保存删除、激活前上传、权限、共享引用、父记录级联清理、Queue、R2 失败重试和 multipart。既有 74 条记录写入 fixture 的安装步骤补齐对应文件元数据，再继续执行真实的文件引用校验。最终 39 个测试文件、799 项测试通过；直接 tsgo、Nx lint、格式检查、git diff --check 和 wrangler deploy --dry-run 通过，lint 为 0 warnings/0 errors。Worker 包体 5,400.25 KiB，gzip 827.71 KiB。lint 沿用 --skip-nx-cache --excludeTaskDependencies 的本机依赖绕行方式；最终全量测试直接运行 vitest run --maxWorkers=2 --testTimeout=30000 --hookTimeout=60000，规避本机运行器并发启动及默认超时问题。
- **浏览器验收**：使用独立的 .wrangler/stage9-acceptance 数据副本，在共享预览上传并显示头像和 logo；给 Airbnb 上传文本附件，打开预览读到正文并操作下载；新建 Documents 文件字段并上传文件，刷新后读取签名 URL。永久删除带附件记录的 R2 清理由 workerd 集成测试验收。twenty-front 和 twenty-server 均零改动，未部署远程资源。

### 阶段 10：权限与成员管理

**目标**：把占位的权限实现换成真的，并完成成员相关的设置页。

**任务**

1. `PermissionContext` 的真实实现：按角色计算对象级权限（读、改、软删、永久删）和字段级权限（读、改），逻辑参考 `S/engine/permissions/role/utils/compute-role-records-permissions.util.ts`。
2. 在记录引擎的读写路径上强制执行。无权读的字段不能出现在结果、筛选、排序里。
3. `objectRecordsPermissions` 返回真实计算结果。
4. 角色的增删改、对象权限和字段权限的设置、给成员分配角色。
5. 邀请：生成和重置邀请链接（`inviteHash`），通过链接注册加入 workspace（`signUpInWorkspace`），落地页的 `GetWorkspaceFromInviteHash`（实际字段 `findWorkspaceFromInviteHash`）。成员页还会调用 `GetWorkspaceInvitations`（实际字段 `findWorkspaceInvitations`）、`getApprovedAccessDomains`、`twoFactorAuthenticationRecoveryStatus`，v1 返回空值。
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

**实施记录**

- **权限计算**：从实际的 role、roleTarget、rolePermissionFlag、objectPermission 和 fieldPermission 构建 PermissionContext；对象覆盖的 null 继承角色默认值，系统对象及 workspaceMember 沿用旧服务的规则。字段限制覆盖查询投影、别名、筛选、排序、聚合和写入；morph 关系的限制传播到同组字段，UI 只读字段始终不可编辑。采集 SDL 没有独立的创建权限输入，创建权限随编辑权限设置，与旧转换逻辑一致。每次请求重新计算，角色变更后 API 权限立即生效。
- **角色操作**：实现角色增删改、对象/字段权限、权限标志和成员角色分配，更新对应 collection hash。对象权限列表按前端契约整体替换，字段权限按提交项更新，可用 null 恢复继承。校验角色名称唯一、读写权限一致、字段归属和批次重复项；保护不可编辑的 Admin、已分配角色和默认角色，并阻止工作区仍有其他成员时撤销最后一位管理员。
- **邀请与页面能力**：邀请链接支持开启、关闭、轮换和落地校验，注册后按当前默认角色加入（初始为 Member）。链接管理使用 WORKSPACE_MEMBERS 权限，默认角色修改使用 ROLES，普通设置使用 WORKSPACE；因为 v1 不开放 SECURITY，邀请开关与旧服务的 SECURITY 归属不同。保留邀请、approved domains 和双因素恢复查询的 v1 空结果。只声明 CUSTOM_ROLES 能力以启用原前端的创建角色按钮，计费、行级权限、私有记录和记录分享仍关闭。
- **成员与账号**：DO 事务软删除 workspaceMember、删除角色分配及其私人导航/收藏；再通过持久化 member-cleanup outbox 撤销 D1 会话并移除 membership。D1 暂时不可用时，DO 已拒绝该成员访问，alarm 继续重试清理。删除个人账号会停用并匿名化账号、清除密码和撤销会话；最后一个成员离开时删除 D1 workspace。软删除成员的邮箱同时匿名化，避免标准邮箱唯一索引阻止同邮箱重新注册加入。
- **设置与存储**：D1 新增 0002-workspace-settings.sql，DO 新增 0006-initialize-workspace-settings；持久化 workspace 名称、默认角色和回收站保留天数，logo 继续走阶段 9 的文件路径。保留天数同步到清理任务。workspace-settings outbox 重试时读取最新设置，避免旧任务覆盖新修改。个人资料继续同步成员记录与 D1 用户信息，并执行 PROFILE_INFORMATION 权限检查。
- **验证**：workerd 完整测试 40 个文件、817 项通过，新增成员/权限 HTTP 用例包含采集契约重放、隐藏字段、对象覆盖删除、字段限制恢复、权限批次回滚、邀请失效、会话撤销和 D1 故障重试；worker 直接 tsgo、lint 和 Wrangler dry-run 通过。前端直接 tsgo、改动文件的类型感知 lint、所在目录的文案检查和生产构建通过。
- **浏览器验收**：独立的 .wrangler/stage10-acceptance 本地数据副本，通过成员设置页创建只读角色并隐藏 Job Title，邀请第二个用户注册并完成资料，随后分配角色。第二个用户的人员列表没有创建入口和 Job Title；直接写入和请求隐藏字段均返回 FORBIDDEN。成员移除、邀请开关/重置和设置持久化也在本地验收。前端只补充成员邀请页的链接管理入口，原因记在第 9 节；未修改 twenty-server，未部署远程资源。

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

**实施记录**

- **注册与传输**：新增 DO 迁移 `0007-initialize-event-streams`，在 SQLite 持久化事件流、连接标识和查询签名。保留现有 GraphQL-over-SSE；Worker 通过经过会话认证的内部 fetch 与 DO 建立 WebSocket，DO 使用 Hibernation API，连接附件保存接收者身份与连接时的 outbox 游标。重建实例时恢复现存连接并移除孤立注册；新连接不重放建立前的历史事件。
- **记录事件**：消费记录事务已有的 `record-event` outbox，并补齐时间线记录事件。匹配复用记录查询的筛选、排序和权限校验；空筛选沿用旧服务的全对象匹配，更新同时检查 before/after，删除和恢复保留相应匹配语义。只发送命中的 queryIds；接收者可读字段、关系标签及文件 URL 在推送时重新投影。outbox 同一时间的任务按插入顺序处理，失败继续使用租约和 alarm 重试。
- **元数据事件**：在元数据事务内采集受影响表的变更前后值，包括外键级联，并与 collection hash 一起写入 `metadata-event` outbox；回滚不产生事件。输出前端使用的 field、relation、index、view 等形状；索引字段作为 index 的嵌套数据发送，隐藏 morph 派生字段不重复发送。删除记录导致的导航清理也会广播。
- **权限与隐私**：注册、修改查询和推送都检查实际成员及角色；每轮投递重新验证 D1 会话，重新构建接收者权限。隐藏字段不能参与事件筛选、排序或出现在 before/after、updatedFields、diff 中；无读取权限的对象不推送。私人导航只发给所属成员，角色配置按 ROLES 权限过滤，时间线嵌套 properties 暂不推送，避免携带其他对象的隐藏字段值。
- **心跳与清理**：Worker 每 30 秒验证会话并发送 SSE 空事件；内部 ping/pong 由 DO 自动应答，不唤醒 DO。断开或取消会结束挂起读取、清理计时器并关闭 WebSocket，随后级联删除查询；旧连接迟到的关闭事件不会删除替代连接。每成员最多 20 个连接、workspace 最多 1000 个连接、每流最多 200 个查询；单次消息超过 512 KB 或 Worker 缓冲超过 100 条/1 MB 时关闭连接，使用前端现有重连与重新查询恢复。
- **验证**：workerd 完整测试 42 个文件、824 项通过；新增覆盖五种记录变更、筛选前后匹配、关系投影、元数据与事务回滚、真实 DO 驱逐后恢复、会话撤销、字段/对象权限、私人导航、查询移除、连接替换和断开清理。虚拟时钟验证连续五分钟心跳及计时器释放。worker 直接 tsgo、lint 和 Wrangler dry-run 通过。
- **浏览器验收**：使用独立 `.wrangler/stage11-acceptance` 数据副本，两个登录同一 workspace 的页面验证新建、修改、删除、恢复记录及新建自定义字段能自动显示；空闲超过五分钟后可继续更新。关闭验收页面后检查 DO，事件流和查询注册均为零。沿用推荐传输，无需修改前端或 twenty-server，未部署远程资源。

### 阶段 12：可选集成

每一项单独确认后再做，互相独立。

2026-11-13 需求方确认三项全部实现，顺序为 12a → 12b → 12c。

**12a 邮件发送**：用 Cloudflare Email Service（当前 beta，开工前先确认状态和发信域名要求）。包括邀请邮件、重置密码、邮箱验证。模板复用 `packages/twenty-emails`，先确认它在 Workers 运行时里能渲染。发送走 Queue 以便重试。

**12b API key、REST API、webhook**：API key 的创建和撤销，Bearer 认证；`/rest` 下的记录接口，复用记录引擎；webhook 从 outbox 经 Queue 投递，带签名和重试。参考 `S/engine/api/rest/`、`S/engine/core-modules/api-key/`、`S/engine/metadata-modules/webhook/`。

**12c Google 和 Microsoft 登录**：OAuth 授权码流程，回调后重定向到 `/verify?loginToken=`，参考 `S/engine/core-modules/auth/services/auth.service.ts:826`。只做登录，不申请邮件和日历权限。

**实施记录**

- **邮件与运行时**：使用原生 `EMAIL` send_email binding；D1 迁移 `0003-transactional-email.sql` 增加邮件任务、个人邀请与 action token 数据。复用 twenty-emails 的模板和翻译，邮件主题取翻译后的标题。模板在 workerd 渲染通过，但预构建包包含顶层 UUID 默认值，真实 Wrangler 启动不允许执行；因此在发信处理器中延迟导入，并把 shared/translations 指向源文件。原生本地邮件模拟器已生成 HTML/text 邮件。
- **邀请与账户邮件**：实现个人邀请的发送、查询、重发、撤销及按邮箱加入，公共邀请关闭时仍可用，可按管理员指定角色加入。实现一小时密码重置与邮箱验证链接；重发失效旧链接，链接与邮箱、origin 绑定且只能消费一次，密码重置撤销已有会话。EMAIL_VERIFICATION_REQUIRED 可启用密码注册邮箱验证；未验证用户不能建立或访问 workspace。普通未知邮箱请求保持相同成功响应。
- **邮件可靠性**：先持久化 D1 邮件任务，再向 Queue 发送任务 ID；失败由五分钟 cron 补发。发送使用租约、指数退避及最多十次尝试；完成后擦除任务载荷，过期任务清除。任务中待发送的链接暂存至投递或过期，APP token 表只存 hash。邮件交付仍为至少一次，不能声称第三方邮件服务具有跨进程恰好一次语义。
- **API key**：DO 迁移 `0008-initialize-integrations` 增加 key、webhook 和投递表。实现 key 创建、读取、改名、角色分配、轮换和撤销；只保存 token hash。Bearer 可访问 /graphql 和 /rest，按 workspace origin 隔离；每次请求在 DO 重新检查有效期、撤销状态与实际角色。开放现有 API_KEYS_AND_WEBHOOKS 权限及原前端开发者设置入口；API 身份不进入账户/设置 mutation，actor 标记为 API，事件不会携带 token hash。
- **REST 范围**：请求转换为动态 schema 上的 GraphQL 操作，继续使用现有事务、验证和副作用。覆盖单条/批量创建、upsert、单条/筛选批量更新、读取、永久/软删除和恢复；支持 REST 或 JSON 筛选、排序、游标、offset、字段选择及最多两层关系展开。沿用旧 REST 的永久删除默认值。搜索、聚合、分组、去重和合并通过同一 key 使用现有 GraphQL；未复制旧服务这些高级 REST 专用端点，接口范围及例子写在 `packages/twenty-worker/INTEGRATIONS.md`。
- **Webhook**：记录变更事务内持久化待办，outbox 经 Queue 仅传 DO/投递 ID，Worker 发起外部请求。发送前按当前角色投影字段和关系，并重新读取 endpoint 与 secret；删除后取消待发项。沿用 timestamp:rawBody 的 HMAC-SHA256 hex 签名，增加稳定 delivery ID，接收端需去重。请求五秒超时、禁止重定向、仅允许公共 HTTPS hostname；启用 global_fetch_strictly_public。失败退避，Queue 耗尽后由 alarm 恢复，最多十次、24 小时；webhook 仅订阅记录变更，元数据继续经 SSE。
- **OAuth**：D1 迁移 `0004-oauth-login.sql` 保存十分钟单次 state 和 provider/issuer/subject 身份关联。使用 httpOnly state cookie、PKCE S256、nonce，以及 jose 的 RS256/JWKS、issuer、audience、有效期校验和 Microsoft tenant 限制。只请求 openid/profile/email，不保存 provider access/refresh token。现有成员返回 /verify?loginToken，新实例注册使用 agnostic session。Microsoft 邮箱及非权威 Google 邮箱不会直接绑定已有账号，需已登录的同邮箱账号、个人邀请或本地邮件证明。
- **验证与验收**：完整 workerd 回归 47 个文件、852 项通过，涵盖新邮件流程、原模板渲染、REST、key 轮换/过期/角色变更、webhook 签名与权限过滤/重试、签名 ID token 的 OAuth 流程和绑定防护；公网路由标志调整后的相关 18 项检查、直接 tsgo、lint 与 Wrangler dry-run 也通过。真实 Wrangler 本地服务验证邮件邀请注册及资料设置、密码重置后以新密码登录、设置页创建 key 并调用 REST、创建/删除 webhook。没有修改前端或 twenty-server，没有部署远程资源。真实收件、Google/Microsoft 真实账号登录等待外部域名和应用配置，配置步骤见 INTEGRATIONS.md。

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

**阶段 13 执行记录（2026-11-13）**

- 清理清单已确认并执行：删除 12 个专用包的 21,121 个已跟踪文件，SDK/renderer 在解除运行时引用后删除；删除范围外前端路由、模块和专用测试，保留核心 CRM。前端清理单独提交为 `ce42d9912c7`。
- 核心与 metadata codegen 已指向 Worker schema；新增 core SDL 导出和真实 workspace schema 一致性检查。E2E 使用独立临时存储启动 Wrangler，通过 UI 建立账号/工作区，验证记录、Kanban、邀请和登录跳转。
- 新增 dev/production 资源配置、亚太区位置提示、资源创建/部署脚本、稳定 secrets 管理、生产注册 Turnstile、结构化日志、每日 DO 容量日志及阈值事件、维护模式和受独立 token 保护的恢复操作入口。根架构文档、开发命令与 CI 已适配 Worker。
- **云端验收暂缓**：只读账号预检发现 R2 未启用（错误 10042），需求方随后明确决定暂缓远程部署。未创建或修改远程 D1、R2、Queue、Worker 或 Turnstile 资源。生产从零部署、CI 实际运行、云端恢复演练及外部告警通知目的地仍待验收，不能将本阶段视为生产上线完成。恢复手册和演练脚本已备齐；D1 免费计划 Time Travel 为 7 天，付费计划为 30 天，DO 为 30 天。
- 部署结果和后续验收条件记录在 `packages/twenty-worker/DEPLOYMENT.md`；邮件及真实 Google/Microsoft 登录继续按阶段 12 的外部配置边界验收。

### 阶段 14：对外 MCP 服务

**目标**：将原版 `f7fed3afdc7` 中的对外 MCP 服务迁入 Worker，供外部 AI 客户端操作核心 CRM，复用既有认证、权限、记录事务和副作用。

**实施记录（2026-11-16）**

- **协议与路由**：新增 `/mcp` 的无状态 Streamable HTTP 入口。支持初始化、ping、工具发现/调用及空的资源/模板/提示列表；POST 可返回 JSON 或有限 SSE 响应，通知返回 202 且不执行工具。协商 `2025-11-25`、原版 `2025-06-18` 和兼容版本 `2025-03-26`；校验 JSON-RPC、协议头、Content-Type、Accept、Origin，并限制请求体为 2,000,000 字节。GET/DELETE 返回 405，不保留 MCP 会话状态。
- **认证与隔离**：沿用 API key 和已激活 workspace 会话，先在 Worker 检查身份及 workspace origin，再在 DO 校验实际 key hash、有效期、撤销状态及当前角色。初始化、发现和通知同样校验，不把 key 的外层格式检查视为认证完成。Cookie 请求继续使用原有标记和 CSRF 检查，不新增账户或设置写权限。
- **核心工具**：从当前元数据和权限生成标准/自定义对象的查询、创建、更新、upsert、软删除、恢复、永久删除、合并、聚合和分组工具，并提供跨对象搜索及只读对象/字段元数据发现。沿用原版 snake_case 工具命名和查询的顶层字段筛选；保留默认直接模式与 `mode=meta` 的 `get_tool_catalog`、`learn_tools`、`execute_tool`。输入 schema 和嵌套定义按字段、对象及写入权限裁剪，实际执行仍通过记录引擎检查。
- **事务与运行时**：复用同步 GraphQL 记录执行和事务回滚，不在事务内引入外部 IO。文件签名、时间线、实时事件及 webhook 沿用既有路径；写入 actor 标记为 AGENT 并保留 key/成员名称。复用 DO 的 schema 缓存，新增 shared/workflow 源码 alias 以使用既有对象自动化守卫。
- **兼容边界**：不恢复范围外工作流、AI/skills、应用/函数、外部 MCP 连接器及账户/设置工具；MCP 的 metadata 工具只读。分组/聚合输入按 Worker GraphQL 契约生成，客户端应重新发现 schema。使用现有 Bearer 凭据，不提供 MCP OAuth 授权服务器、动态客户端注册、旧版 GET/SSE、进度通知、断线重放或后台任务。批量上限沿用 Worker 的 200 条。无需新增依赖、存储迁移或前端改动；未部署远程资源。
- **使用与验证**：连接配置、curl 示例、工具参数和协议边界见 `packages/twenty-worker/MCP.md`。Node 26 下跳过 Nx 缓存重建 shared，直接 Worker tsgo、全包 lint/格式检查通过；完整 workerd 回归 51 个文件、877 项测试通过，最后补充数组参数校验后重跑 MCP 的 16 项集成测试全部通过。覆盖握手、直接/meta 模式、标准及自定义对象、关联与合并、权限及隐藏字段、密钥轮换/撤销/过期、会话/CSRF、元数据变化、事务回滚和固定/流式请求体大小限制。Wrangler 默认及 production dry-run 通过，最终 production 包 gzip 1,477.11 KiB；未部署或修改远程资源。

## 9. 风险、未决事项与记录

### 风险

| 风险 | 说明 | 处理 |
|---|---|---|
| 查询引擎的工作量 | 阶段 5 要重写旧系统约 640 个文件覆盖的行为 | fixture 重放作为验收依据；允许把阶段 5 再拆成筛选、关联、聚合三个子任务 |
| 单个 workspace 10 GB 上限 | 无法提升 | 阶段 13 加容量监控；超限方案（归档或按对象拆分 DO）等真有需求再设计 |
| 每对象 90 个字段上限 | 源于每表 100 列 | 在界面上给出明确报错 |
| 大小写和重音 | SQLite 的 `lower()` 只处理 ASCII | 搜索走 FTS5，不受影响；筛选的差异接受 |
| 长时间操作阻塞 DO | DO 单线程，一次大批量写入会让该 workspace 的其他请求排队 | 批量操作分批，每批一个事务，批间让出 |
| Email Service 仍是 beta | 影响邀请邮件和密码重置的真实投递 | 12a 已实现；接入 Workers Paid 与已验证发信域名后启用，未配置时继续使用邀请链接 |
| 费用未估算 | DO 按请求、时长、读写行数计费 | 阶段 5 完成后用真实查询测一次行读取量再估 |

### 未决事项

1. 单 workspace 还是多 workspace 部署（当前默认单 workspace）。
2. 阶段 12 三项已确认并实现；待提供发信域名及 Google/Microsoft 应用配置以做真实集成验收。
3. 未接入发信域名前密码重置不可投递；本地仅模拟发信。
4. 阶段 13 已于 2026-11-16 部署至 workers.dev，12 项公网检查及隔离 DO/D1 恢复演练通过；首次管理员注册和已认证业务验收、CI 实际运行及外部告警接收端仍待完成。详见 `packages/twenty-worker/DEPLOYMENT.md`。

### 前端改动记录

| 阶段 | 文件 | 改动与原因 |
| --- | --- | --- |
| 6 | `src/modules/command-menu-item/display/components/SidePanelCommandMenuItemDisplayPage.tsx` | 仅在对应工作流命令可用时挂载 CoreObjectsCommands；普通 CRM 命令菜单不再读取已裁掉的 workflow 元数据。后端补造工作流对象及其依赖会重新引入范围外模型，一处渲染条件更小。 |
| 10 | `src/pages/settings/members/tabs/SettingsWorkspaceMembersInviteTab.tsx` | 在成员邀请页补充链接开关和重置按钮，复用现有组件与文案；原开关位于 v1 已排除的 Security 页面，后端无法单独提供可操作的界面入口。 |

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

阶段 9 补充核验（2026-11-13）：

- R2 Workers API（条件写、范围读取）：https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- FixedLengthStream（声明长度和字节数量校验）：https://developers.cloudflare.com/workers/runtime-apis/streams/transformstream/
- DO blockConcurrencyWhile 的异常重置语义：https://developers.cloudflare.com/durable-objects/api/state/

阶段 11 补充核验（2026-11-13）：

- DO WebSocket Hibernation API、连接附件与自动应答：https://developers.cloudflare.com/durable-objects/best-practices/websockets/

阶段 12 补充核验（2026-11-13）：

- Email Sending beta 与 Workers Paid 要求：https://developers.cloudflare.com/email-service/
- 发信域名配置：https://developers.cloudflare.com/email-service/configuration/domains/
- 原生结构化邮件 API：https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- 本地邮件模拟器：https://developers.cloudflare.com/email-service/observability/local-development/sending/
- Google OpenID Connect：https://developers.google.com/identity/openid-connect/openid-connect
- Microsoft OIDC 与 token claims：https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc 、https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
- 公网 fetch 路由标志：https://developers.cloudflare.com/workers/configuration/compatibility-flags/#global-fetch-strictly-public

仓库内的参考：

- 现有 Workers 部署配置的例子：`packages/twenty-website/wrangler.jsonc`
- `/metadata` 的 SDL：`packages/twenty-worker/contract/metadata-schema.graphql`
- 需要由后端处理的路径前缀：`packages/twenty-shared/src/types/ApiPath.ts`
- 字段类型枚举：`packages/twenty-shared/src/types/FieldMetadataType.ts`
