# syntax=docker/dockerfile:1
# ============================================================
# UGCNP backend (NestJS + Prisma).
# Build context is the repo root so the shared package and the
# pnpm workspace layout resolve the same way they do on Vercel.
# ============================================================

FROM node:22-alpine AS base
WORKDIR /app
ENV CI=true
RUN corepack enable \
    && apk add --no-cache openssl

# --- deps: manifests only, so this layer survives source edits ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY e2e/package.json ./e2e/package.json
# `--filter ugcnp-backend...` installs the backend plus its workspace
# dependencies (@ugcnp/shared) and nothing else. Without it this downloads the
# whole 823-package workspace, pulling Next.js, Tailwind and React into an image
# that never runs them, and doubling the registry traffic because the frontend
# build is doing the same download in parallel.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
    && pnpm install --frozen-lockfile --filter "ugcnp-backend..."

# --- build: generate the Prisma client, then compile ---
FROM deps AS build
COPY packages ./packages
COPY backend ./backend
# Prisma only needs a syntactically valid URL to generate the client. It never
# connects during `generate`. The real URL arrives at runtime.
ENV DATABASE_URL="postgresql://ugcnp:ugcnp@localhost:5432/ugcnp?schema=public"
RUN pnpm --filter @ugcnp/shared build \
    && pnpm --filter ugcnp-backend prisma:generate \
    && pnpm --filter ugcnp-backend build

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
# Prisma CLI reads this for the schema path, datasource URL and the seed
# command. Without it the CLI falls back to defaults, so `db seed` fails and
# `migrate` only works by coincidence of directory layout.
COPY --from=build /app/backend/prisma.config.ts ./backend/prisma.config.ts

EXPOSE 4000

# `migrate deploy` applies only committed migrations and is safe to re-run, so
# a restarted or replaced container converges instead of crashing. It must run
# against a direct (non-pooled) connection, which is what compose supplies.
# 127.0.0.1, not localhost: inside a container `localhost` can resolve to ::1
# first, but Node binds IPv4 only, so a healthcheck using the hostname reports
# "connection refused" while the service is perfectly healthy.
HEALTHCHECK --interval=10s --timeout=4s --start-period=30s --retries=12 \
    CMD wget -qO- http://127.0.0.1:4000/api/v1/health >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "cd backend && node ./node_modules/prisma/build/index.js migrate deploy && exec node dist/main.js"]
