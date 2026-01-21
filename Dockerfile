# syntax=docker/dockerfile:1.6

# 说明：
# - 生产运行时建议使用 next.config.js/mjs/cjs，而不是 next.config.ts。
#   因为 next.config.ts 在运行时需要 typescript 参与转译；但生产镜像通常只安装 prod 依赖（--prod），会导致启动失败。

FROM node:20-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# 使用 corepack 固定 pnpm 版本，保证 CI / Docker 构建一致性。
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS deps
# 只拷贝依赖清单，最大化利用 Docker layer cache（代码改动不影响依赖层）。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
# 构建阶段：安装完整依赖（含 devDependencies）+ 产出 .next 构建产物。
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000

ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
# 运行阶段：只安装生产依赖，镜像更小、更安全。
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/sql ./sql
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN mkdir -p /app/public/uploads

EXPOSE 3000
CMD ["sh", "-c", "node node_modules/next/dist/bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
