# 仓库协作指南（AGENTS.md）

> 本文件用于帮助人类与 AI Agent 在本仓库中高效协作：尽量小步修改、可回滚、遵循既有结构与约定。

## 项目结构与模块组织

- `src/app/`：Next.js App Router 路由（`page.tsx`、`layout.tsx`）与 API 路由处理器（`src/app/api/*/route.ts`）。
- `src/components/`：按功能拆分的 React 组件（如 `blog/`、`admin/` 等），`ui/` 存放 shadcn/Radix 的基础组件。
- `src/lib/`：共享工具与服务（鉴权、DB、env、邮件、上传等）。优先使用别名 `@/…`（`@/*` → `src/*`）。
- `src/content/`：页面/组件使用的内容源与数据。
- `src/styles/`：样式相关（Tailwind / 全局样式 / 遗留 SCSS，见 `src/styles/legacy`）。
- `public/`：静态资源（如 `public/assets/`、`public/map/`、`public/uploads/`）。
- `sql/`：MySQL 迁移脚本（运行时由 `src/lib/db/migrations.ts` 自动执行；按日期命名更易追踪）。
- `plan/`、`issues/`：迁移计划与任务拆解文档。

## 开发、构建与校验命令

- `bun install`：安装依赖（推荐 Node.js 版本与 Docker 一致：Node 20）。
- `cp .env.example .env`：准备本地环境变量（按你的 MySQL/Redis/邮箱/百度地图等配置修改）。
- `bun dev`：启动本地开发。
- `bun run build`：生产构建。
- `bun start`：本地启动生产构建产物。
- `bun run lint`：ESLint（Next Core Web Vitals + TypeScript）。
- `bun run typecheck`：TypeScript 类型检查（`tsc --noEmit`）。

### Docker（可选）

- 构建镜像：`docker build -t doraemon-blog:latest .`
- 通过 compose 启动：`docker compose up -d`
- 查看日志：`docker compose logs -f web`
- 注意：生产运行默认使用外部 MySQL/Redis；`public/uploads` 通过 volume 持久化（见 `docker-compose.yml`）。

## 编码风格与命名约定

- 技术栈：TypeScript + React + Next.js（App Router）。
- 代码风格：保持现有格式（2 空格缩进、分号、双引号），优先沿用仓库现有写法与工具函数。
- 组件：导出使用 `PascalCase`；UI 基础组件放在 `src/components/ui/`。
- 路由：遵循 Next 约定（如 `src/app/blog/[id]/page.tsx`、`src/app/api/news/route.ts`）。
- 服务器/客户端边界：
  - Node-only 代码放在 Route Handler 或 `src/lib/**` 的服务端 helper 中。
  - Client Component（带 `"use client"`）避免引入服务端依赖（如 `fs`、`mysql2` 等）；必要时拆分 `*-client.ts`（仓库已有类似模式）。
- 数据库/迁移：
  - MySQL：`src/lib/db/mysql.ts` 封装连接与查询，并在首次访问时自动执行 `sql/` 下的迁移。
  - 新增环境变量：先更新 `src/lib/env.ts` 的 zod schema，再同步更新 `.env.example`（不要提交 `.env`）。

## 测试与质量保障

- 当前仓库未配置自动化测试框架（没有 `*.test.*` / `*.spec.*`）。
- 如确需引入测试：使用 `*.test.ts(x)` 命名，并新增 `bun test` 脚本与简短说明（避免一次性引入过重的测试栈）。

## 提交与 PR 规范

- **AI Agent 仅限只读操作**：只能查看 Git 信息（如 `git status`、`git log`、`git diff`），**禁止**执行任何修改操作（如 `commit`、`push`、`pull`、`merge`、`reset`、`revert` 等）。
- 提交信息必须遵循下方《Git 提交信息命名方案（约束）》。
- 变更尽量聚焦：一个提交/PR 解决一个问题，避免"顺手重构"造成 diff 扩散。
- PR 说明：包含简短摘要，尽量关联 `plan/` 或 `issues/` 中对应条目；UI 变更附截图/录屏；涉及 `.env` / `sql/` / 鉴权时明确说明影响面与回滚方式。

## Git 提交信息命名方案（约束）

### 统一格式

- 必须使用：`<type>(<scope>): <subject>`
- `scope`必须填写
- `subject`使用中文
- 破坏性变更（Breaking Change）必须使用 `!`：`<type>(<scope>)!: <subject>` 或 `<type>!: <subject>`

### type（必填）

- `feat`：新增功能
- `fix`：修复缺陷
- `perf`：性能优化
- `refactor`：重构（不改变外部行为）
- `docs`：文档/注释
- `style`：仅格式调整（不影响逻辑），例如格式化、空格、排序
- `test`：测试相关
- `build`：构建/打包相关（Next.js、bun、Docker 等）
- `ci`：CI 配置相关
- `chore`：杂项维护（脚本、工具、目录整理等）

### scope（必填）

- 只用小写英文与短横线（`kebab-case`），不加空格
- 推荐范围（按需选用）：`app`、`api`、`components`、`ui`、`lib`、`db`、`auth`、`content`、`styles`、`public`、`sql`、`docker`、`config`、`deps`、`docs`、`plan`、`issues`
- 依赖升级/降级建议使用：`chore(deps): ...`

### subject（必填）

- 用一句话描述“做了什么”，避免空泛描述（如“修复 bug”“更新代码”）
- 允许中文或英文；英文建议使用祈使句（imperative），且不要以句号结尾
- 建议控制在 72 字符以内（过长请把细节放到正文）

### 正文与脚注（可选但推荐）

- 正文：解释“为什么改/怎么改/影响面”，与标题空一行
- 引用迁移文档/任务：在脚注使用 `Refs:`，例如 `Refs: plan/2026-...` 或 `Refs: issues/2026-...`
- 破坏性变更：除使用 `!` 外，脚注必须补充 `BREAKING CHANGE: ...`

### 示例

- `feat(blog): 新增文章目录折叠`
- `fix(api): 修复上传接口对空文件的处理`
- `chore(deps): 升级 next 到 16.1.1`
- `refactor(db): 统一 MySQL 查询的返回类型`
- `docs: 补充 Docker 部署说明`

## 配置与安全注意事项

- 永远不要提交任何密钥/凭证；新增环境变量时同步更新 `.env.example`。
- 鉴权使用 HttpOnly Cookie：用户 `doraemon_token`、管理员 `doraemon_admin_token`；对 `src/lib/auth/` 的修改按安全敏感变更对待。
