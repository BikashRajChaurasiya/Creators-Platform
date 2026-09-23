# ============================================================
# UGCNP backend — prisma migrate + serve.
# Build context is the repo root (../).
# ============================================================

FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY frontend/package.json ./frontend/package.json

RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules

COPY packages ./packages
COPY backend ./backend

# shared must be compiled before backend build; prisma client generated from schema
ENV DATABASE_URL="postgresql://ugcnp:ugcnp@postgres:5432/ugcnp?schema=public"
RUN pnpm --filter @ugcnp/shared build && pnpm --filter ugcnp-backend prisma:generate && pnpm --filter ugcnp-backend build

# ------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
RUN corepack enable

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma

RUN apk add --no-cache wget

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=10 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

CMD ["sh", "-c", "cd backend && node ./node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]