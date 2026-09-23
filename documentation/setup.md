# Setup Guide

This page walks through a full local deployment of UGCNP.

## 1. Prerequisites

- Node.js 22+, pnpm 11 (activated automatically via `packageManager`),
  Docker Desktop (Docker Compose v2), Python 3.13, Git.

```bash
node -v        # >= 20
pnpm -v        # 11.x (corepack will use the pinned version)
docker compose version
```

## 2. Infrastructure

Start only the data stores (no app images yet):

```bash
docker compose -f docker/compose.yaml up -d postgres redis minio
docker compose -f docker/compose.yaml ps
```

Defaults (override via `docker/.env`, see below):

| Service  | Host port | Container |
| -------- | --------- | --------- |
| Postgres | 5444      | 5432      |
| Redis    | 6380      | 6379      |
| MinIO    | 9000/9001 | 9000/9001 |

### docker/.env

`docker/.env.example` documents every variable. Copy it before first compose
run so container names, ports, MinIO keys and JWT secrets are stable:

```bash
cp docker/.env.example docker/.env
```

> Project-root `.env` files (e.g. `backend/.env`) are not tracked; copy from
> the matching `.env.example`.

## 3. Backend (local)

```bash
cp backend/.env.example backend/.env
pnpm install
pnpm --filter ugcnp-backend prisma:migrate     # applies prisma/migrations
pnpm --filter ugcnp-backend prisma:seed        # demo fixtures
pnpm --filter ugcnp-backend start:dev
```

Smoke test:

```bash
curl http://localhost:4000/api/v1/health
# {"data":{"status":"ok","db":true,"redis":true,...}}
```

`DATABASE_URL`/`REDIS_URL` in `backend/.env` must match the infra host ports.

## 4. AI service (local)

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\pip install -e .        # Windows
# .venv/bin/pip install -e .          # Linux/macOS
.venv\Scripts\python -m uvicorn app.main:app --port 5001
```

Verify:

```bash
curl http://localhost:5001/health
# {"status":"ok","service":"ugcnp-ai",...}
```

Backend picks it up via `AI_SERVICE_URL=http://localhost:5001` (default in
`backend/.env.example`). If it is down, the backend degrades gracefully.

## 5. Frontend (local)

```bash
pnpm --filter ugcnp-frontend dev
# http://localhost:3000
```

The local dev server reads `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`)
and sends requests to the backend directly.

## 6. Full stack via Docker (no local runtime)

```bash
docker compose -f docker/compose.yaml up -d --build
docker compose -f docker/compose.yaml ps   # all six services healthy
```

Seed within the container:

```bash
docker compose -f docker/compose.yaml exec backend sh -c \
  "cd backend && node ../node_modules/.bin/prisma db seed"
```

## 7. Login

Open http://localhost:3000/login. Use demo accounts from the README table.
A brand account (`himalayanteaco@ugcnp.local`) can publish campaigns and
review applications; a creator account can discover+apply; the admin account
sees the admin portal.

## 8. Testing

```bash
pnpm --filter ugcnp-backend test            # jest unit tests
cd ai-service && .venv/Scripts/pytest -q    # AI service tests
pnpm --filter ugcnp-frontend typecheck
pnpm --filter ugcnp-backend lint            # 0 errors = pass
pnpm build                                  # all workspaces
```

## 9. Troubleshooting

- **Backend container restarts**: `docker compose -f docker/compose.yaml logs backend`
  — usually a bad `DATABASE_URL`/missing secret. It runs `prisma migrate deploy`
  before `node dist/main.js`.
- **401 on refresh**: the refresh token is an httpOnly cookie; enable
  `credentials: 'include'`-style cookie handling in the client (frontend
  `api.ts` already does).
- **AI returns degraded data**: confirm `http://localhost:5001/health` responds
  and `AI_SERVICE_URL` is correct.
- **Lint gate**: warnings are allowed, errors are not; fix any `error` lines
  before CI will pass.