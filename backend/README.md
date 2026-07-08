# Backend — Procurement & Vendor Management API

NestJS REST API for a procurement system (Purchase Request → Approval → Purchase Order → Goods Receipt) with Budget Control, Audit Log, and Notifications

> This is the **API server** of the project — to run the whole stack with a single Docker command, see [`../README.md`](../README.md)

## Tech Stack

| Area | Tool |
|---|---|
| Framework | NestJS 11 (TypeScript 5.7) |
| Database | PostgreSQL + TypeORM (migrations, `synchronize: false`) |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`) + bcrypt + Role Guard |
| Cache | Redis via `@nestjs/cache-manager` + `@keyv/redis` (cache-aside, graceful degrade) |
| Money math | `decimal.js` (avoids float issues in budgeting) |
| Validation | `class-validator` + `class-transformer` (`ValidationPipe` whitelist/transform) |
| API Docs | Swagger / OpenAPI (`@nestjs/swagger`) |
| Testing | Jest + Supertest |

ID = SERIAL (INT auto-increment)

## Module structure (`src/`)

| Group | Module | Responsibility |
|---|---|---|
| Core | `auth` | login/register, `/auth/me`, change password |
| | `users` | user CRUD, role/status (findAll scoped by role) |
| | `departments` | department master data |
| Procurement flow | `purchase-requests` | PR lifecycle (create → submit → approve/reject) |
| | `purchase-orders` | PO lifecycle + vendor rating endpoint |
| | `goods-receipts` | GRN (record goods receipt → close PO) |
| | `vendors` | vendor + category + rating + blacklist |
| | `budgets` | budget CRUD + reserve/consume (DB transaction) |
| Cross-cutting | `audit-logs` | audit trail (exports a service for other modules to inject) |
| | `notifications` | user notifications (exports a service, fire-and-forget) |
| | `cache` | Redis cache-aside + namespace invalidation (graceful degrade) |
| | `health` | `/health` liveness for Docker / CI |

## API conventions

- Base URL: `http://localhost:3000`
- Global prefix: **`/api/v1`** (e.g. `POST /api/v1/auth/login`)
- Swagger UI: **`/api/docs`** (click Authorize and enter a Bearer token)
- Health check: `/api/v1/health`
- Auth: send `Authorization: Bearer <access_token>` (obtained from `/auth/login`)
- Roles: `employee` / `manager` / `procurement_officer`

## Local development (run the backend standalone, without Docker)

PostgreSQL must be running first (quickest via `docker compose up -d postgres` from the root); Redis is optional (without it, the app gracefully degrades and hits the DB directly)

```bash
cd backend
cp ../.env.example .env     # set DB_HOST=localhost
npm install
npm run start:dev          # watch mode → http://localhost:3000
npm run seed               # seed sample data (ts-node)
```

## npm scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | dev server (watch) on `:3000` |
| `npm run build` / `npm run start:prod` | build → run `dist/main` |
| `npm run lint` | ESLint (`--fix`) |
| `npm run test` | unit tests (Jest) |
| `npm run test:e2e` | e2e tests (separate DB `procurement_test_db` + `REDIS_DB=1`) |
| `npm run test:cov` | unit tests + coverage |
| `npm run seed` | seed baseline data (ts-node) |
| `npm run seed:demo` | reset + seed realistic demo data |
| `npm run seed:prod` | seed from build (`node dist`, used in Docker) |

## Environment variables (`.env`)

| Variable | Default | Notes |
|---|---|---|
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | under Docker, `DB_HOST=postgres` is set automatically |
| `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | `procurement_user` / `procurement_pass` / `procurement_db` | |
| `JWT_SECRET` | — | must be set (at least 32 characters) |
| `JWT_EXPIRES_IN` | `7d` | access token lifetime |
| `PORT` / `NODE_ENV` | `3000` / `development` | |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `localhost` / `6379` / — | optional; under Docker, `REDIS_HOST=redis` |

## Key patterns

- **Auth & roles** — `JwtAuthGuard` + `RolesGuard` + `@Roles(...)`; `@Expose()` + `ClassSerializerInterceptor` expose only intended fields (`passwordHash` uses `select: false`)
- **Budget atomicity** — reserve/consume runs inside an `EntityManager` transaction; calculations use pure helpers in `common/budget-math.ts` (validate with unrounded values, store rounded to 2 decimals)
- **PO auto-complete** — when a GRN receives everything, the system closes the PO and consumes the budget within a single DB transaction
- **Cache-aside + invalidate** — reads go through Redis first; writes invalidate the old namespace via a generation counter; if Redis is down, the app fails fast back to the DB (no crash)
- **Fire-and-forget** — audit log + notification are called as `void svc.method().catch(...)` and never block the main flow

## Testing

```bash
npm run test          # unit
npm run test:e2e      # e2e — requires PostgreSQL (auto-uses procurement_test_db)
```

Note: unit tests (ts-jest) are transpile-only and therefore **do not catch type errors** — check types separately with `npx tsc --noEmit` and `npm run lint` before merging. e2e isolates state from dev in both PostgreSQL (`procurement_test_db`) and Redis (`REDIS_DB=1`)
