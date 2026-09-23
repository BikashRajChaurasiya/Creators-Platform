# ============================================================
# UGCNP frontend — Next.js standalone output.
# Build context is the repo root (../).
# NEXT_PUBLIC_* values are baked in at build time via --build-arg.
# ============================================================

FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules

COPY packages ./packages
COPY frontend ./frontend

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_AI_URL=http://localhost:5001
ARG NEXT_PUBLIC_WS_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_AI_URL=$NEXT_PUBLIC_AI_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN pnpm --filter @ugcnp/shared build && pnpm --filter ugcnp-frontend build

# ------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./frontend/.next/static

EXPOSE 3000

CMD ["node", "frontend/server.js"]