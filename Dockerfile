# syntax=docker/dockerfile:1.6

FROM node:20-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_BAIDU_MAP_AK
ARG NEXT_PUBLIC_BAIDU_MAP_TYPE=WebGL

ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_BAIDU_MAP_AK=${NEXT_PUBLIC_BAIDU_MAP_AK}
ENV NEXT_PUBLIC_BAIDU_MAP_TYPE=${NEXT_PUBLIC_BAIDU_MAP_TYPE}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/sql ./sql
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN mkdir -p /app/public/uploads

EXPOSE 3000
CMD ["sh", "-c", "node node_modules/next/dist/bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
