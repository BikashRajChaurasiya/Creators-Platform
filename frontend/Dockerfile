# syntax=docker/dockerfile:1
# ============================================================
# UGCNP frontend (Next.js, standalone output).
# Build context is the repo root so @ugcnp/shared resolves.
# ============================================================

FROM node:22-alpine AS base
WORKDIR /app
ENV CI=true
RUN corepack enable

# --- deps: manifests only, so this layer survives source edits ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY e2e/package.json ./e2e/package.json
# See backend/Dockerfile: filtering to the frontend and its workspace
# dependencies avoids pulling Prisma engines, the AWS SDK and Playwright into
# an image that never uses them.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
    && pnpm install --frozen-lockfile --filter "ugcnp-frontend..."

# --- build ---
FROM deps AS build
COPY packages ./packages
COPY frontend ./frontend

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# are build args, not runtime env. They must be host-reachable addresses: the
# browser resolves them, so a Docker service name like `backend:4000` would
# fail for anyone outside the compose network. In production on Vercel this is
# left unset instead, and the browser calls /api/* on its own origin.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @ugcnp/shared build \
    && pnpm --filter ugcnp-frontend build

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Standalone output mirrors the workspace layout, so the server entry point
# lives at frontend/server.js rather than server.js.
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./frontend/.next/static
# Next.js does NOT copy public/ into the standalone bundle, so anything served
# from there (e.g. /logo.svg) 404s unless it is copied explicitly.
COPY --from=build /app/frontend/public ./frontend/public

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=4s --start-period=20s --retries=12 \
    CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "frontend/server.js"]
