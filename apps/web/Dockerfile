# Lightweight static web image served by Caddy (~20MB RAM)
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN corepack enable && corepack prepare pnpm@12.23.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile --filter @hospitality/web...

COPY packages/shared-types packages/shared-types
COPY apps/web apps/web

RUN pnpm --filter @hospitality/shared-types build && \
    pnpm --filter @hospitality/web build

FROM caddy:2-alpine AS runner
COPY --from=builder /app/apps/web/out /srv/web
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
