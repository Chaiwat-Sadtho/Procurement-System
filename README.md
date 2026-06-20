# Procurement & Vendor Management System

A procurement and vendor management system (Purchase Request → Approval → Purchase Order → Goods Receipt) with budget control, audit logging, and notifications.

> NestJS + React + PostgreSQL — runs with a single Docker command

## Tech Stack

| Layer | Tools |
|---|---|
| Backend | NestJS 11 (TypeScript) + TypeORM |
| Database | PostgreSQL 16 |
| Cache / Rate-limit | Redis 7 (cache-aside + throttler storage) |
| Auth | JWT + bcrypt + Role Guard |
| API Docs | Swagger (OpenAPI) |
| Frontend | React 19 + Vite + Tailwind CSS + TanStack Query + React Hook Form + Zod |
| Testing | Jest + Supertest (backend), Vitest (frontend) |
| Infra | Docker + Docker Compose, nginx (load balancer), GitHub Actions CI |

## Features

- **Auth & Users** — JWT login, role-based access (employee / manager / procurement_officer), profile editing + password change
- **Purchase Request (PR)** — create/edit/submit for approval, state machine (draft → submitted → approved/rejected), select annual/quarterly budget
- **Vendor Management** — vendor CRUD, categories, blacklist, rating history
- **Purchase Order (PO) + GRN** — create a PO from a PR, record goods receipts (GRN), auto-complete the PO when fully received (DB transaction), rate vendors
- **Budget Control** — atomic reserve/release/consume of budgets (pessimistic lock)
- **Audit Log + Notification** — action logging + automatic notifications
- **Caching (Redis)** — cache-aside on reference data + vendor/rating lists, invalidate-on-write via a namespace generation counter, graceful degradation when Redis is down
- **Rate Limiting** — global throttle + auth-specific overrides (login/register/change-password), counters stored in Redis (multi-instance ready), fail-open when Redis is down
- **Load Balancing** — nginx round-robin across 2 backend instances (stateless + transparent failover), database migrations run once via a one-off service

## Quick Start (Docker — recommended)

Requires Docker + Docker Compose

```bash
# 1. clone + enter the folder
git clone https://github.com/Chaiwat-Sadtho/Procurement-System.git
cd Procurement-System

# 2. create the env file
cp .env.example .env

# 3. run the full stack (prod-like: postgres + redis + migrate + backend1/backend2 + frontend)
docker compose -f docker-compose.yml up --build -d

# 4. seed sample data (run once after the first up)
docker compose -f docker-compose.yml exec backend1 npm run seed:prod
```

Access (everything goes through nginx on `:8080` — the backend does not publish a port outside the network):
- Frontend: http://localhost:8080
- Swagger API docs: http://localhost:8080/api/docs (nginx proxy → backend pool)
- Health check: http://localhost:8080/api/v1/health

### Test accounts (password: `Password123`)

| Email | Role |
|---|---|
| employee@company.com | employee |
| manager@company.com | manager |
| procurement@company.com | procurement_officer |

### Dev mode (with pgAdmin)

`docker compose up -d` (without `-f`) merges `docker-compose.override.yml`, adding pgAdmin at http://localhost:5050 (admin@admin.com / admin)

## Running without Docker (local dev)

**Database + Cache:** a running PostgreSQL is required (or `docker compose up -d postgres redis`) — Redis is optional in dev (cache + rate-limit degrade gracefully without it)

**Backend:**
```bash
cd backend
cp ../.env.example .env   # DB_HOST=localhost
npm install
npm run start:dev         # http://localhost:3000
npm run seed              # seed data (ts-node)
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxies /api → :3000)
```

## Testing

```bash
# Backend
cd backend
npm run test              # unit
npm run test:e2e          # e2e (requires a DB)

# Frontend
cd frontend
npm run test:run          # vitest
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint + test + build for both the backend (with a PostgreSQL service container for e2e) and the frontend on every push to `master` / `dev` and every Pull Request.

## Demo Flow

1. `docker compose -f docker-compose.yml up --build -d` + seed
2. Open Swagger at http://localhost:8080/api/docs to browse all APIs
3. Log in as employee → create a PR → submit
4. Log in as manager → approve the PR (budget is reserved)
5. Log in as procurement → create a PO from the PR → record a GRN → PO auto-completes + budget is consumed
6. Rate the vendor → view it on the vendor detail page

## Architecture

```
Browser ──http://localhost:8080──> [nginx + React SPA]   (frontend container)
                                          │
                                          │ proxy /api/*  (round-robin + transparent failover)
                                          ├──> [backend1 :3000] ─┐
                                          └──> [backend2 :3000] ─┤
                                                                 ├── TypeORM ──────────> [postgres :5432]
                                                                 └── cache / throttle ──> [redis :6379]

[migrate]  one-off service: runs DB migrations once before the backends start (prevents migration races)
```
