# 阶段 13 清理清单

基准提交：`40835fd23af6752ead1074f281e9d2335164c8e7`。需求方已于 2026-11-13 确认按此清单全部清理。SDK／renderer 在解除引用后删除；先用 workers.dev 验收。未触碰已有业务数据。

| 目录 | 已跟踪文件数 | 处理 |
| --- | ---: | --- |
| `packages/twenty-server` | 14276 | 删除 |
| `packages/twenty-docker` | 116 | 删除 |
| `packages/twenty-apps` | 3580 | 删除 |
| `packages/twenty-zapier` | 29 | 删除 |
| `packages/twenty-companion` | 150 | 删除 |
| `packages/twenty-agent-skills` | 58 | 删除 |
| `packages/twenty-claude-skills` | 3 | 删除 |
| `packages/create-twenty-app` | 12 | 删除 |
| `packages/twenty-cli` | 758 | 删除 |
| `packages/twenty-front-component-renderer` | 1732 | 引用解除后删除 |
| `packages/twenty-sdk` | 290 | 引用解除后删除 |
| `packages/twenty-client-sdk` | 117 | 引用解除后删除 |

前端先移除工作流、AI、应用市场、logic function、front component、管理后台、计费、邮件/日历同步等范围外页面入口与路由，再删除不再被核心 CRM 引用的模块、页面、专用测试和 stories。仍被记录编辑、字段、布局等核心功能引用的代码会先拆出必要部分，避免直接删目录破坏核心功能。

SDK、客户端 SDK 与 renderer 仅在前端及保留包不再引用它们后删除。保留 Worker、前端、shared、UI、邮件模板、E2E、lint 工具，以及独立的网站和文档；网站/文档的历史引用单独核对。

同时更新 workspaces、锁文件、Nx 配置、旧 Docker/Postgres/Redis 启动脚本、仅服务于旧后端或上述已删除包的 CI 工作流。保留产品源代码以外的 Git 历史和许可证。前端清理单独提交：`ce42d9912c7`。

精确目录和基准文件数另见 `stage13-cleanup-manifest.json`。最终删除明细以同一基准上的 Git diff 为准；新增删除目标需要补充清单。

## 执行记录（2026-11-13）

上述 12 个包共 21,121 个已跟踪文件已删除。前端删除 4,116 个原路径下的文件（含迁移到通用 UI 目录的应用标识展示组件）；精确的新增、迁移和修改由 Git diff 记录。核心 CRM 的应用标识展示不再依赖 SDK 或 renderer。

已清除保留运行时的包导入、workspace 依赖、Nx 项目和 CI 调用。旧服务/应用专用的工作流、应用部署 action、集成测试计时、升级命令合并队列检查和扫描器 Dockerfile 一并移除；Crowdin、Dependabot、格式配置及 MCP 配置解除旧目录引用。扫描器威胁模型更新为 Worker 架构。独立网站/文档的上游示例、迁移审计记录及 shared 中解析外部导入的字符串 fixture 保留，均不构成已删除 workspace 的依赖。

原 `packages/twenty-server/.local-storage` 中被忽略的本地上传数据保留，并在根 `.gitignore` 中明确排除。清理没有读取或迁移生产数据。

需求方随后决定暂缓远程部署；本阶段继续完成本地验证和部署准备，不创建或修改远程资源。最终结果见 [STAGE13_VALIDATION.md](STAGE13_VALIDATION.md)。
