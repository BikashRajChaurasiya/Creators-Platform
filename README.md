# UGCNP — Nepal Creator Economy Operating System

Monorepo for the UGCNP Phase 1 MVP: a creator-economy platform where creators
apply to brand campaigns and admins operate the network.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  frontend  (Next.js 16 / React 19 / Tailwind v4)  :3000     │
│  creator portal · brand portal · admin portal · auth        │
└──────────────┬──────────────────────────────────────────────┘
               │ REST (/{API_PREFIX})      WS (socket.io)
┌──────────────▼──────────────────────────────────────────────┐
│  backend  (NestJS 11)                          :4000        │
│  /api/v1  REST · Prisma (Postgres) · Redis · MinIO          │
│  Auth JWT · campaigns · applications · messaging ·          │
│  payments · notifications · analytics · admin               │
└──────┬───────────────────┬───────────────────┬──────────────┘
       │                   │                   │
┌──────▼──────┐   ┌────────▼────────┐   ┌──────▼──────┐
│  postgres   │   │  redis          │   │  minio      │
│  :5444*     │   │  :6380*         │   │  :9000/:9001│
└─────────────┘   └─────────────────┘   └─────────────┘
             ┌─────────────────────────────┐
             │  ai-service (FastAPI) :5001 │
             │  /analyze-content · /generate-copy │
             │  /match · /predict · /health │
             └─────────────────────────────┘
```

- Backend responds with a global `{ data: ... }` envelope (TransformInterceptor).
- Frontend `src/lib/api.ts` unwraps `data` and auto-refreshes on 401.
- Backend talks to the AI service over HTTP; on AI failure it degrades to
  heuristic results rather than erroring.

## Prerequisites

- Node.js >= 20 (tested on 22)
- pnpm >= 9 (pinned `pnpm@11.12.0` via `packageManager` in root package.json)
- Docker + Docker Compose v2+
- Python 3.13 (for the AI service when run locally)

## Quick start (Docker — full stack)

```bash
cp docker/.env.example docker/.env   # optional: adjust ports/secrets
docker compose -f docker/compose.yaml up -d --build
```

Brings up:

| Service    | Container      | Health URL                  |
| ---------- | -------------- | --------------------------- |
| postgres   | ugcnp-postgres | (docker healthcheck)        |
| redis      | ugcnp-redis    | (docker healthcheck)        |
| minio      | ugcnp-minio    | console http://localhost:9001 |
| backend    | ugcnp-backend  | http://localhost:4000/api/v1/health |
| ai-service | ugcnp-ai-service | http://localhost:5001/health |
| frontend   | ugcnp-frontend | http://localhost:3000       |

The backend container runs `prisma migrate deploy` on boot, then starts the API.
Seed the demo data after the stack is healthy:

```bash
docker compose -f docker/compose.yaml exec backend sh -c \
  "cd backend && node ../node_modules/.bin/prisma db seed"
```

### Docker Devtooling (optional)

```bash
docker compose --profile dev up -d pgadmin
```

## Quick start (Local dev)

### 1. Infrastructure

```bash
docker compose -f docker/compose.yaml up -d postgres redis minio
```

### 2. Backend

```bash
cp backend/.env.example backend/.env
pnpm install
pnpm --filter ugcnp-backend prisma:migrate
pnpm --filter ugcnp-backend prisma:seed
pnpm --filter ugcnp-backend start:dev
# API on http://localhost:4000/api/v1, health on /api/v1/health
```

### 3. AI service (Python)

```bash
cd ai-service
python -m venv .venv
.\.venv\Scripts\pip install -e .
.\.venv\Scripts\python -m uvicorn app.main:app --port 5001
```

### 4. Frontend

```bash
pnpm --filter ugcnp-frontend dev
# http://localhost:3000
```

## Demo accounts

All seeded accounts use password `Password123!`.

| Role | Email |
| ---- | ----- |
| Admin | admin@ugcnp.local |
| Brand (Himalayan Tea Co) | himalayanteaco@ugcnp.local |
| Creator | aaravshrestha@ugcnp.local, rijanmaharjan@ugcnp.local, saanvigurung@ugcnp.local |

See `backend/prisma/seed.ts` for the full seed fixture list.

## Key commands

```bash
pnpm build              # build all workspaces
pnpm -r typecheck       # typecheck all
pnpm --filter ugcnp-backend test          # backend unit tests
cd ai-service && .venv/Scripts/pytest -q  # AI service tests
pnpm --filter ugcnp-frontend typecheck    # frontend typecheck
pnpm --filter ugcnp-backend lint          # eslint (gate = 0 errors)
```

## Environment reference

- `backend/.env.example` — all backend variables with defaults.
- `docker/.env.example` — infra/app image ports and secrets used by compose.
- Frontend build-time vars (baked at image build): `NEXT_PUBLIC_API_URL`
  (default `http://localhost:4000`), `NEXT_PUBLIC_AI_URL`,
  `NEXT_PUBLIC_WS_URL`.

## API conventions

- Base path: `/api/v1`, everything wrapped in `{ data: ... }`.
- Auth: `Authorization: Bearer <accessToken>`; a valid `refreshToken` cookie
  refreshes the session on `POST /auth/refresh`.
- Role guards: `CREATOR`, `BRAND`, `ADMIN` (users carry a single `Role`).
- Health: `GET /health` → `{ data: { status, db, redis, timestamp } }`.

## CI

`.github/workflows/ci.yml` runs on push/PR to `main`:

- install (frozen lockfile), build shared, typecheck all, lint (0 errors),
  build backend + frontend, backend jest suite, AI pytest suite.
- On `main`, also verifies all three Docker images build.

## Related docs

- `documentation/blueprint.md` — decision-ready product blueprint (monetization,
  payments, compliance, disputes, media pipeline, UI redesign).
- `documentation/setup.md` — full setup walkthrough.
- `documentation/architecture.md` — services, auth flow, messaging, AI contract.
- `documentation/api.md` — endpoint reference and request/response examples.

**Blueprint status:** the money-moving core from the blueprint is implemented and
verified end-to-end — commission-on-budget payments with maker–checker
(prepare / approve / release by three distinct operators), Nepal payout channels,
a revenue-vs-creator-dues ledger, VAT/TDS estimates, SLA-backed disputes that
auto-create `DISPUTE` tasks, and the corresponding UI (creator payout stepper,
admin finance ledger + maker–check queue, brand running spend, VAT/TDS settings).

Self-serve is in place since then: brands initiate their own payouts to ACCEPTED
creators (still operator-approved), invoices are auto-generated and released with
each payout, creators submit campaign deliverables for review, and dashboards
surface earnings, spend and recent activity. The admin analytics portal adds a
time-series view (new users/campaigns/applications/submissions, platform revenue)
with 7/30/90-day windows, and a full self-service password reset (OTP → new
password) ships with login/docs.

Landing on the remaining items (media pipeline, minors compliance, full UX
redesigns) is tracked in `documentation/blueprint.md` §11–12.