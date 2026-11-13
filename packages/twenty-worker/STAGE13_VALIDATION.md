# 阶段 13 验证与交接

日期：2026-11-13。分支：`cloudflare-migration`。基准：`40835fd23af6752ead1074f281e9d2335164c8e7`（阶段 12）。

前端清理已单独提交为 `ce42d9912c7`（Remove unsupported frontend features and use Worker schemas）。

清理清单已获需求方确认。本地实现、清理和部署准备继续推进；**远程部署按需求方指示暂缓，生产上线验收尚未完成**。

## 本地验证

使用 Node 26.12.1、仓库 Yarn 4.18.1，跳过 Nx 缓存构建 shared 后执行直接类型检查。整条构建通过 `node .yarn/releases/yarn-4.18.1.cjs nx build twenty-worker --skip-nx-cache` 执行，避免本机缺少全局 Yarn；shared/UI barrel 生成器改用原生 Node 和异步 Prettier，解决 Nx 子进程中的同步 formatter 挂起。

| 检查 | 结果 |
| --- | --- |
| `yarn install --immutable` | 通过；保留上游 peer dependency 警告 |
| Nx 项目图 | 10 个保留 workspace 和根项目，无已删除包 |
| 直接 `tsgo -p tsconfig.json --noEmit` | shared、UI、emails、front、worker、website、oxlint-rules 全部通过；docs/utils/E2E 无独立根 tsconfig |
| 前端完整 Jest | 1,147 suites、6,337 tests、69 snapshots 全部通过 |
| Worker 完整 workerd 回归 | 50 files、861 tests 全部通过 |
| 前端变更 lint / Worker 全包 lint | 0 warnings、0 errors |
| Worker 格式检查 | 通过 |
| Worker schema 导出及前端 core/metadata codegen | 通过；测试比较导出 SDL 与新 workspace 实际 schema，重复生成结果一致 |
| 前端 Vite 构建 | 通过 |
| Wrangler 默认 / production dry-run | 通过；8,860.07 KiB，gzip 1,469.12 KiB |
| 整条 Nx Worker 构建链路 | 通过；6 个目标全部跳过缓存，48.5 秒 |
| Playwright 核心 CRM | 7 项全部通过，36.4 秒 |
| GitHub YAML 与本地 action/workflow 引用 | 75 个 YAML 解析通过，所有本地 uses 目标存在 |
| JavaScript 与开发脚本语法 | 变更的 `.mjs` / `.cjs` 及 setup shell 检查通过 |

E2E 创建临时 D1/DO/R2 存储并启动端口 3030 的本地 Worker；通过 UI 完成账号/工作区/资料设置，覆盖登录返回路径、邀请注册与重登录、记录创建/编辑/刷新持久化、自定义字段和 Kanban。工作流等范围外专用用例已移除。服务器退出后清理临时测试存储，测试进程和端口均已关闭。空实例查找工作区及退出/删除账号后的会话请求会产生预期 GraphQL 错误日志。

新增的安全验证覆盖 Turnstile token 缺失、配置不完整、成功验证的 hostname/IP、无效/过期/重复或其他 hostname 的 token、Siteverify 网络失败，以及操作员 token、维护模式和演练对象隔离。既有完整回归继续覆盖会话、权限、跨 workspace 隔离、CSRF/origin、文件 token、REST/API key、OAuth 和 webhook。回归通过不等同于独立渗透测试。

## 清理与兼容边界

12 个专用包共删除 21,121 个已跟踪文件；前端原路径删除 4,116 个文件，包含移至通用 UI 的展示组件。保留运行时没有已删除包的导入或 workspace 依赖；Nx、CI、启动、翻译和工具配置已解除引用。独立网站/文档中的上游示例、迁移来源说明和 shared 的外部导入字符串 fixture 保留，不能据此将此分支视为仍支持应用平台。

既有本地上传目录保留并忽略。未提交翻译目录的再生成改动、Cloudflare token、应用 secrets 或测试账号状态。

## 云端预检与暂缓项目

只读预检识别账号 `ac83875e6d6bf0e3b8baf0d0a7f96009`、workers.dev 子域 `tabuxiangma`。D1、Queues、Turnstile 列表可读取且为空；R2 返回 HTTP 403、错误 **10042**，提示先启用 R2。未运行资源创建、secret 写入、远程 migration 或 deploy。

需求方随后明确选择“暂缓远程部署”。以下项目仍未执行：

- workers.dev 从零资源创建、部署和公网核心 CRM 验收；自定义域名继续推迟。
- 云端 Turnstile 真实交互与远程安全 smoke checks。
- DO 及 D1 的真实时间点恢复演练；现有脚本和手册尚无成功云端演练记录。
- GitHub Actions 实际运行；当前只完成本地等效检查与流水线配置。
- 将容量/错误日志接入外部通知目的地。
- 阶段 12 的真实邮件投递与 Google/Microsoft 账号登录；需要发信域名及 provider 应用配置。

恢复远程工作时，先启用账号 R2，再按 [OPERATIONS.md](OPERATIONS.md) 创建资源、构建和部署；演练使用隔离 DO 和临时 D1，不直接操作真实 workspace。D1 免费计划保留 7 天、付费计划 30 天；DO 为 30 天。超过平台保留期或防账号丢失的完整离线备份尚未实施，评估和边界已写入操作手册。
