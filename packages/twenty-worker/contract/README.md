# 契约（阶段 0 产出）

从运行中的旧系统（`twenty-server`，提交 `f7fed3afdc7`）采集的前后端契约，是新后端各阶段的验收依据。采集于 2026-11-12。

| 路径 | 内容 |
|---|---|
| `fixtures/<流程>/NNN-<操作名>.json` | 每个请求一个文件，按发生顺序编号 |
| `fixtures/index.json` | 全部 fixture 的索引（流程、操作名、状态码、是否带 `errors`、重复次数） |
| `metadata-schema.graphql` | `/metadata` 的完整 SDL（内省导出） |
| `core-schema.graphql` | 采集结束时这个 workspace 的 `/graphql` SDL，含自定义对象 `initiative` |
| `metadata-operations.md` | 所有操作名及其归属阶段 |
| `metadata-export/workspace-metadata.json` | 该 workspace 的全部元数据行，未裁剪 |
| `metadata-export/filter-report.json` | 裁剪脚本的报告：每张表保留多少行、每条删除原因计数 |

种子数据在 `src/workspace/seed/`：`standard-metadata.json`（裁剪后的标准元数据）和 `demo-data.json`（预填的公司、人员、商机）。

## 流程

按采集顺序排列。后面的流程依赖前面流程留下的状态，重放时也要按这个顺序。名字以 `-api` 结尾的流程由脚本直接调用 API 产生，用于界面不容易触发的错误分支和字段类型，用的是前端在其他流程里实际发出的 query 文本。

| 流程 | 内容 |
|---|---|
| `auth-signup-onboarding` | 注册 alice@example.com、创建 workspace "Acme"、填写个人资料、跳过邀请，进入主界面 |
| `auth-signout-signin` | 登出，错误密码登录一次，正确密码登录 |
| `auth-api` | 认证错误码、登录 token 重复使用、cookie session、CSRF、登出后 session 失效 |
| `records-bulk-create-api` | `createPeople` 批量建 90 个人员。这里只有第一次尝试（带了不存在的 `city` 字段，返回 `BAD_USER_INPUT`），成功的那次在 `records-list/001`，见"已知问题" |
| `records-list` | 人员列表加载、滚动翻页、文本和姓名筛选、邮箱筛选、排序、商机看板和拖动卡片换列 |
| `record-detail` | 公司、商机、人员详情页，编辑货币、链接、关联、选择、日期、电话、文本、姓名，以及顺带触发的命令菜单搜索 |
| `record-field-types-api` | 地址、链接、邮箱、电话等写入形状，以及非法邮箱、未知字段、非法选项、错误 ID 的报错 |
| `record-lifecycle` | 用表单新建人员、软删除、恢复、永久删除、批量删除、回收站视图里恢复和永久删除、合并人员 |
| `notes-tasks` | 在公司上新建备注（含富文本正文）、关联第二个目标、新建任务并设置负责人、状态、截止日期、完成任务，查看时间线 |
| `search` | 命令菜单搜索人名、公司、邮箱片段、中文、备注标题、特殊字符；列表"搜索任意字段" |
| `data-model` | 新建自定义对象 Project，逐个新建 18 种类型的字段，字段改名、改选项、停用、删除，对象改名为 Initiative、停用、启用。界面发出的两个关联字段请求缺少关联参数而失败，见"已知问题" |
| `data-model-api` | 用 API 新建多对一、一对多、morph 关联字段，以及重名、保留字、非法名称、重复对象的校验错误 |
| `custom-object-records` | 自定义对象的列表、表单新建、详情页 |
| `custom-object-records-api` | 自定义对象每种字段类型的写入和非法值报错 |
| `views` | 新建视图并带筛选、加排序、隐藏和显示列、切换视图、新建看板视图、收藏记录和视图、取消收藏 |
| `files` | 上传头像、workspace logo、记录附件、FILES 字段，下载附件 |
| `file-access-api` | 文件下载的 token 校验和 Range |
| `members-roles` | 成员页、邀请链接、新建只读角色并隐藏 `person.jobTitle`、bob@example.com 用邀请链接加入、改角色、移除 bob |
| `permissions-api` | bob 在只读角色下读写记录、读取被隐藏字段、按它筛选排序 |
| `removed-member-api` | 被移除的 bob 再次登录 |
| `cleanup-api` | 删除 `permissions-api` 意外建出的 `person.sneaky` 字段，之后才导出 SDL 和元数据 |

## fixture 格式

```json
{
  "flow": "records-list",
  "sequence": 12,
  "capturedAt": "2026-11-12T11:25:03.120Z",
  "endpoint": "/graphql",
  "method": "POST",
  "operationName": "FindManyPeople",
  "query": "query FindManyPeople(...) { ... }",
  "variables": { "limit": 40, "offset": 60 },
  "requestHeaders": { "x-twenty-session-cookie": "1", "origin": "http://localhost:3001" },
  "status": 200,
  "responseHeaders": { "content-type": "application/graphql-response+json; charset=utf-8" },
  "response": { "data": { } },
  "repeatCount": 1
}
```

- 同一流程里完全相同的请求和响应只保留第一份，`repeatCount` 记录出现次数。
- 超过 2 万字符且和更早某个 fixture 完全相同的响应，用 `responseRef: "<流程>/<文件>"` 代替。
- 同一流程里多次拉取的大集合（超过 10 万字符，如 `ObjectMetadataItems`），只保留该流程里第一份和最后一份，中间的写成 `responseOmitted`。
- 非 GraphQL 请求（`/client-config`、`/file`、`/file-upload`）的 `operationName` 是 `<方法> <路径前缀>`，查询参数放在 `variables`。二进制响应体没有保存。
- `OnEventSubscription` 是 graphql-sse 的长连接，只有请求，没有流内容。

### 脱敏

JWT、session cookie 值、邀请链接 hash 替换为 `<redacted-jwt-N>`、`<redacted-session-N>`、`<redacted-invite-hash-N>`。同一个原值始终对应同一个编号，所以"上一步返回的 token 在下一步被使用"这类关系仍可追踪。其他 cookie 一律写成 `<redacted-cookie>`。测试账号的密码（`Password123!` 等）保留，它们是重放需要的输入，不是真实凭据。

## 采集方式

浏览器部分用 Playwright MCP 驱动，在浏览器上下文挂响应监听，把请求和响应发给本地 collector 写成 JSONL，再拆分和脱敏成 `fixtures/`；`-api` 流程直接调用 API。SDL 和元数据从运行中的旧系统导出。采集脚本依赖已删除的 `twenty-server` 和 `pg`，已从仓库移除，需要时从提交 `6baa10464fb` 的 `packages/twenty-worker/contract/scripts/` 恢复。

`demo-data.json` 是一次性生成的：在仓库外临时写了一个脚本，用假的 EntityManager 执行旧服务端的 `prefill-companies.util.ts`、`prefill-people.util.ts`、`prefill-opportunities.util.ts`，截获插入的行，再把展开的复合列折回 JSON 对象。这个脚本没有放进本包，因为本包不允许 import `twenty-server`。三份数据都是代码里的字面量，以后不会变。

## 种子数据的裁剪规则

裁剪先按规则删除：

- 不属于标准应用（Standard）的行，即采集过程中用户创建的对象、字段、视图、布局、收藏等。角色例外：按 universal identifier 前缀 `20202020-` 保留 Admin 和 Member（Member 属于 workspace 自定义应用，但它是激活时创建的标准角色）。
- 第 2 节以外的对象；关联目标在范围外的字段。
- 仪表盘布局；范围外的 widget 类型（图表、邮件、日历、AI 对话、通话录音、工作流、营销、iframe）。
- 范围外的命令菜单项（工作流、AI 对话、仪表盘、营销、邮件、记录分享）和挂在 front component 或工作流上的命令。
- 用户收藏和工作流原生页面。

然后反复删除"引用了已删除行"的行，直到不再变化。引用按行内任意位置（包括 JSON 配置）出现的 id 或 universal identifier 判断。丢了列的索引（如 `attachment.targetWorkflow` 上的单列索引）、没有任何 widget 使用的 widget 视图、没有 widget 的 tab、没有子项的导航文件夹也一并删除。最后校验：保留的行里不能有指向未保留行的引用，也不能有指向导出范围外的 id，每个索引至少有一列，并且正好剩下 10 个核心对象。不满足就以非零状态退出。

裁剪结果：10 个对象、181 个字段、41 个索引、20 个视图、17 个页面布局、26 个 tab、58 个 widget、5 个导航项、47 个命令菜单项、2 个角色（默认角色 Member）、26 个权限标志定义、14 个时间线活动类型。`permissionFlag` 是定义表，全部保留，授予与否由角色和阶段 4、10 决定。

## 已知问题

- **成功的批量创建落进了 `records-list`。** 监听器在响应返回后才异步上报，期间流程标签已经切换。只影响这一条。
- **浏览器里的 `SignOut` 没有响应体**（`auth-signout-signin`）。登出后页面立即跳转，响应体没读到；完整的 `SignOut` 响应在 `auth-api`。
- **`custom-object-records-api` 开头有两对登录请求。** 第一次运行因为缺少前端 query 中途退出，只留下了登录。
- **数据模型页的关联字段表单。** 用 Playwright 操作关联字段的配置表单时，前端发出的 `CreateOneFieldMetadataItem` 不带 `relationCreationPayload`，服务端返回 `METADATA_VALIDATION_FAILED`（`data-model` 流程里那两条错误）。前端代码（`SettingsObjectNewFieldConfigure.tsx`）在正常操作下会带上这个参数，所以关联和 morph 关联改用 `data-model-api` 采集，输入形状照该文件拼出。
- **`core-schema.graphql` 不是纯标准 workspace 的 schema。** 它包含采集时建的 `initiative` 对象和指向它的关联字段，可以当作自定义对象的类型生成参考。
- **界面语言。** `members-roles` 以前的流程里，浏览器语言是 zh-CN，响应里的 `userFriendlyMessage` 和部分标签是中文；`data-model` 开始切到英文。
- **混入的范围外字段。** 采集时的元数据还没有裁剪，fixture 里的记录查询会请求 `agentChatThreadTargets` 等范围外关联。新后端用裁剪后的元数据，前端就不会再请求这些字段。

## 采集中确认的旧系统行为

供后续阶段参考，第 6、8 节已按需更新：

- 表格滚动加载用 `offset` 翻页（`first: $limit, offset: $offset`），不是游标。
- 新建记录时 `position` 可以传字符串 `"first"`。
- 筛选对象里同级的多个键是隐式 AND，如 `{"id": {"in": [...]}, "deletedAt": {"is": "NOT_NULL"}}`。
- 看板用 `<复数>GroupBy`，参数 `groupBy: {stage: true}`，筛选里带上全部选项值。
- 新建字段时默认值是带 SQL 引号的字面量，如货币 `{"currencyCode": "'USD'"}`、电话 `{"primaryPhoneNumber": "''"}`。
- 新建自定义对象自动加上 `attachments`、`noteTargets`、`taskTargets`、`timelineActivities` 和 `agentChatThreadTargets` 关联；最后一个在范围外。
- 对象改名后，其他对象上指向它的反向关联字段名不变（`opportunity.project`），默认视图名也不变（"All Projects"）。
- 旧系统的 DDL 是异步的：连续快速建字段会得到 `DEFERRED_WORKSPACE_MIGRATION_ACTIONS_IN_PROGRESS`。新架构的同步 DDL 不需要模拟这个错误。
- 错误码：已存在邮箱注册 `FORBIDDEN/USER_ALREADY_EXISTS`；单 workspace 模式下已有 workspace 时注册新 workspace `FORBIDDEN/SIGNUP_DISABLED`；未知用户登录 `UNAUTHENTICATED/USER_NOT_FOUND`；错误密码 `FORBIDDEN/FORBIDDEN_EXCEPTION`；登录 token 重复使用 `UNAUTHENTICATED`，消息 "Login token has already been used"。
- `extensions.userFriendlyMessage` 通常是字符串，但 token 无效和 session 失效时是对象 `{id, message}`。
- 带 cookie 但不带 `x-twenty-session-cookie` 头的请求按未认证处理（"Missing authentication token"）。跨源或缺少 `Origin` 的 cookie 请求返回 HTTP 403，响应体不是 GraphQL 格式：`{"statusCode":403,"messages":[...],"error":"CSRF_ORIGIN_MISMATCH"}`。
- 登出清除 `__Host-twenty-session` 和 `twenty-session` 两个 cookie；http 下签发的是 `twenty-session`，有效期 180 天。
- 文件：无 token、用别的文件的 token、文件不存在都返回 403 `Forbidden resource`；文件已被替换（旧头像）返回 404 `FILE_NOT_FOUND`。Range 请求返回 206 和 `content-range`，缓存头 `private, max-age=86400, immutable`。上传地址 `uploadUrl` 是带服务端 origin 的绝对 URL。
- 只读角色：查询里选了被隐藏的字段，整个查询返回 `FORBIDDEN/PERMISSION_DENIED`，不是静默去掉字段；按隐藏字段筛选或排序同样报错；写入和删除返回 `FORBIDDEN`。角色带 `canUpdateAllSettings` 时仍能改数据模型。
- 移除成员时，如果该用户没有别的 workspace，旧系统连 user 一起删除，之后 `checkUserExists` 返回 false。
