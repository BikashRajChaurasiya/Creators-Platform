# Architecture

## Monorepo layout

```
packages/shared   zod schemas, TS types, enums shared by backend + frontend + AI
backend           NestJS 11 API (REST + socket.io) + Prisma
frontend          Next.js 16 App Router, React 19, Tailwind v4
ai-service        FastAPI (Python 3.13) heuristics/AI endpoints
docker/           compose.yaml + per-service Dockerfiles
documentation/    these docs
```

## Services

### backend (NestJS 11)

- Global prefix `/api/v1` (`main.ts`).
- `TransformInterceptor` wraps every response in `{ data: ... }` (recursively
  awaiting nested Promises).
- CORS allows the frontend origin from `APP_URL` (default
  `http://localhost:3000`), `credentials: true`.
- `PrismaModule`/`RedisService` provide data stores.
- Guards: `JwtAuthGuard` global, `RolesGuard` per-route (`Role = CREATOR |
  BRAND | ADMIN | MANAGER | QA`).
- `Public()` decorator opts a route out of the JWT guard.
- Module map:
  - `auth` — register, login (JWT access + refresh cookie), OTP, password
    reset, refresh, logout, Google OAuth.
  - `users` — me get/update.
  - `campaigns` — create (brand), list mine, discover, patch, state machine,
    invite.
  - `application` — apply, withdraw, list, review, submissions, feedback,
    analyze (AI passthrough).
  - `brand` — brand profile, verification.
  - `creator` — creator profile, portfolio, verification, discover.
  - `messaging` — conversations, messages, read receipts.
  - `notifications` — list, unread count, mark read.
  - `payment` — payments list/summary, status transitions.
  - `upload` — MinIO presigned uploads.
  - `analytics` — creator/brand/platform analytics + AI passthrough
    (`/match`, `/copy`, `/predict`).
  - `admin` — users, campaigns, payments, tasks, disputes, reports,
    settings, audit logs.
  - `common` — shared services: S3 storage, AI client, guards, interceptors,
    validation.
  - `health` — `/health` db+redis probe (public).

### frontend (Next.js 16)

- `src/lib/api.ts` — `fetch` wrapper: attaches bearer token, auto-refreshes on
  401, unwraps `{ data }`.
- `src/lib/session.ts` — localStorage session (`ugcnp.access`,
  `ugcnp.refresh`, `ugcnp.user`).
- `src/lib/use-api.ts` — React hook wrapper for API calls.
- `src/lib/ui.ts` — shared nav arrays + status → Tailwind color maps.
- Portals: creator (`/creator/...`), brand (`/brand/...`), admin
  (`/admin/...`), auth (`/login`, `/register`), guarded by `RequireAuth`.
- Static-rendered at build; `useSearchParams()` must live in a Suspense
  boundary (Next 16 requirement).
- Enums imported from `@ugcnp/shared`; NB application statuses are
  `PENDING | SHORTLISTED | ACCEPTED | REJECTED | WITHDRAWN`.

### ai-service (FastAPI)

Next to nothing in terms of infrastructure — a stateless service exposing:

| Endpoint          | Purpose                              |
| ----------------- | ------------------------------------ |
| `GET /health`     | liveness                             |
| `POST /analyze-content` | returns an overall engagement score per content item |
| `POST /generate-copy`  | returns hooks + hashtags for a brief |
| `POST /match`     | ranks creators for a campaign brief  |
| `POST /predict`   | forecasts engagement for a content idea |

The backend `AiClient` (`backend/src/common/services/ai.client.ts`) calls it
over HTTP with a timeout and returns `null`/degraded results when it is down,
so the platform never hard-fails on AI outage.

## Data layer — Prisma

- Single Postgres schema; migrations in `backend/prisma/migrations/NNNN_*`.
- `DATABASE_URL` drives both the runtime (Prisma Client) and the CLI
  (`backend/prisma.config.ts` reads it via `env()`).
- `prisma db seed` runs `backend/prisma/seed.ts` (demo users, brands,
  creators, campaigns, applications, payments).
- Migrations applied automatically by the backend container
  (`prisma migrate deploy`) and manually with `pnpm --filter ugcnp-backend
  prisma:migrate` for local dev.

## Auth flow

1. `POST /api/v1/auth/register` → OTP sent (console mode logs it) →
   `POST /auth/verify-otp` activates the user.
2. `POST /auth/login` returns `{ accessToken }` + sets an httpOnly
   `refreshToken` cookie.
3. Frontend stores the access token and sends `Authorization: Bearer ...`.
4. On 401, `api.ts` calls `POST /auth/refresh` (cookie) and retries once.
5. `POST /auth/logout` clears the cookie.

## Message bus / realtime

- `socket.io` on the backend (`HttpAdapter`), authenticated via JWT.
- Conversations and messages are REST-first (`/api/v1/conversations`), with
  websocket events pushing new messages to connected clients.
- Notifications: REST list + unread-count; read/mark-read endpoints.

## Storage — MinIO (S3-compatible)

- `upload/presign` returns a presigned PUT URL; `upload/complete` finalizes.
- `upload/mine` lists the caller's media.
- Public base URL: `STORAGE_PUBLIC_BASE` (http://localhost:9000/ugcnp-media in
  dev), overridden to `http://localhost:9000/ugcnp-media` in compose.

## Deployment

- `docker/` images: `node:22-alpine` runtime for backend/frontend,
  `python:3.13-slim` for AI.
- Frontend is built with Next.js `output: 'standalone'`; `NEXT_PUBLIC_*` vars
  are baked at build time.
- Backend container runs `prisma migrate deploy` before starting.
- CI (`.github/workflows/ci.yml`): install, build shared, typecheck/lint/build
  all workspaces, backend jest + AI pytest, and (on main) a Docker-image
  build check.