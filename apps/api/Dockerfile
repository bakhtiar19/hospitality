# Multi-stage lightweight API image (Node 22 Alpine)
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.23.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --filter @hospitality/api...

COPY packages/shared-types packages/shared-types
COPY packages/database packages/database
COPY apps/api apps/api

RUN pnpm --filter @hospitality/shared-types build && \
    pnpm --filter @hospitality/database build && \
    pnpm --filter @hospitality/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Non-root security user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

USER nestjs
EXPOSE 4000

CMD ["sh", "-c", "cd /app/packages/database && npx prisma db push --accept-data-loss && cd /app/apps/api && node dist/main.js"]
