# SQBlog（Next.js 迁移目标项目）

本目录用于把 `../Doraemon`（Express + Vue3）完整迁移为 `Next.js` 全栈项目。

## 迁移文档

- 计划（Plan）：`plan/2026-01-10_14-04-04-doraemon-to-nextjs.md`
- 任务拆解（Issues CSV）：`issues/2026-01-10_14-04-04-doraemon-to-nextjs.csv`

## 目标技术栈

- Next.js（App Router）+ TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion

## 下一步（需要你确认）

### 运行（本地开发）

1. 进入目录：`cd Doraemon-blog`
2. 复制环境变量：`cp .env.example .env`（按你的 MySQL/Redis/邮件/百度地图 AK 修改）
3. 启动：`pnpm dev`

### 构建（生产）

- `pnpm build`
- `pnpm start`

### 说明

- 认证已迁移为 **HttpOnly Cookie**：
  - 用户：`doraemon_token`
  - 管理员：`doraemon_admin_token`
- 静态资源已迁移到 `public/`（例如 `public/assets/`、`public/map/`、`public/uploads/`）。

## Docker 部署

### 构建镜像

- `docker build -t doraemon-blog:latest .`
- 如需注入客户端可见的 `NEXT_PUBLIC_*`（例如百度地图 AK），请使用 build args 并在修改后重新构建：
  - `docker build --build-arg NEXT_PUBLIC_BAIDU_MAP_AK=xxx --build-arg NEXT_PUBLIC_BAIDU_MAP_TYPE=WebGL -t doraemon-blog:latest .`

### Docker Compose（使用镜像）

1. 准备环境变量：`cp .env.example .env`，并改成你的外部 MySQL/Redis 连接信息（至少改：`DB_HOST`、`DB_PASSWORD`、`REDIS_HOST`、`JWT_SECRET`，以及按需配置邮箱）。
2. 如需给前端注入 `NEXT_PUBLIC_BAIDU_MAP_AK` 等 `NEXT_PUBLIC_*`，请通过 build args 重新构建镜像（见上方）。
3. 启动：`docker compose up -d`
4. 查看日志：`docker compose logs -f web`
