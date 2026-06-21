# Backend — Procurement & Vendor Management API

NestJS REST API สำหรับระบบจัดซื้อ-จัดจ้าง (Purchase Request → Approval → Purchase Order → Goods Receipt) พร้อม Budget Control, Audit Log และ Notification

> ส่วนนี้คือ **API server** ของโปรเจกต์ — สำหรับการรันทั้ง stack ด้วย Docker คำสั่งเดียว ดู [`../README.md`](../README.md)

## Tech Stack

| ด้าน | เครื่องมือ |
|---|---|
| Framework | NestJS 11 (TypeScript 5.7) |
| Database | PostgreSQL + TypeORM (migrations, `synchronize: false`) |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`) + bcrypt + Role Guard |
| Cache | Redis ผ่าน `@nestjs/cache-manager` + `@keyv/redis` (cache-aside, graceful-degrade) |
| Money math | `decimal.js` (กันปัญหา float ในงบประมาณ) |
| Validation | `class-validator` + `class-transformer` (`ValidationPipe` whitelist/transform) |
| API Docs | Swagger / OpenAPI (`@nestjs/swagger`) |
| Testing | Jest + Supertest |

ID = SERIAL (INT auto-increment)

## โครงสร้าง module (`src/`)

| กลุ่ม | module | หน้าที่ |
|---|---|---|
| Core | `auth` | login/register, `/auth/me`, เปลี่ยนรหัสผ่าน |
| | `users` | user CRUD, role/status (findAll scoped ตาม role) |
| | `departments` | department master data |
| Procurement flow | `purchase-requests` | PR lifecycle (create → submit → approve/reject) |
| | `purchase-orders` | PO lifecycle + endpoint ให้คะแนนผู้ขาย |
| | `goods-receipts` | GRN (บันทึกรับของ → ปิด PO) |
| | `vendors` | vendor + category + rating + blacklist |
| | `budgets` | budget CRUD + reserve/consume (DB transaction) |
| Cross-cutting | `audit-logs` | audit trail (export service ให้ module อื่น inject) |
| | `notifications` | แจ้งเตือนผู้ใช้ (export service, fire-and-forget) |
| | `cache` | Redis cache-aside + namespace invalidation (graceful-degrade) |
| | `health` | `/health` liveness สำหรับ Docker / CI |

## API conventions

- Base URL: `http://localhost:3000`
- Global prefix: **`/api/v1`** (เช่น `POST /api/v1/auth/login`)
- Swagger UI: **`/api/docs`** (กดปุ่ม Authorize ใส่ Bearer token)
- Health check: `/api/v1/health`
- Auth: ส่ง `Authorization: Bearer <access_token>` (ได้จาก `/auth/login`)
- Role: `employee` / `manager` / `procurement_officer`

## Local development (รัน backend แยก ไม่ผ่าน Docker)

ต้องมี PostgreSQL รันอยู่ก่อน (เปิดเร็วสุดด้วย `docker compose up -d postgres` จาก root); Redis เป็น optional (ถ้าไม่มี แอป graceful-degrade ยิง DB ตรง)

```bash
cd backend
cp ../.env.example .env     # ตั้ง DB_HOST=localhost
npm install
npm run start:dev          # watch mode → http://localhost:3000
npm run seed               # seed ข้อมูลตัวอย่าง (ts-node)
```

## npm scripts

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run start:dev` | dev server (watch) ที่ `:3000` |
| `npm run build` / `npm run start:prod` | build → รัน `dist/main` |
| `npm run lint` | ESLint (`--fix`) |
| `npm run test` | unit tests (Jest) |
| `npm run test:e2e` | e2e tests (แยก DB `procurement_test_db` + `REDIS_DB=1`) |
| `npm run test:cov` | unit test + coverage |
| `npm run seed` | seed baseline (ts-node) |
| `npm run seed:demo` | reset + seed ข้อมูล demo ที่สมจริง |
| `npm run seed:prod` | seed จาก build (`node dist`, ใช้ใน Docker) |

## Environment variables (`.env`)

| ตัวแปร | ค่าเริ่มต้น | หมายเหตุ |
|---|---|---|
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | ผ่าน Docker จะ override `DB_HOST=postgres` อัตโนมัติ |
| `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | `procurement_user` / `procurement_pass` / `procurement_db` | |
| `JWT_SECRET` | — | ต้องตั้งเอง (อย่างน้อย 32 ตัวอักษร) |
| `JWT_EXPIRES_IN` | `7d` | อายุ access token |
| `PORT` / `NODE_ENV` | `3000` / `development` | |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `localhost` / `6379` / — | optional; ผ่าน Docker override `REDIS_HOST=redis` |

## Key patterns

- **Auth & roles** — `JwtAuthGuard` + `RolesGuard` + `@Roles(...)`; `@Expose()` + `ClassSerializerInterceptor` เปิดเผยเฉพาะ field ที่ตั้งใจ (`passwordHash` ใช้ `select: false`)
- **Budget atomicity** — reserve/consume งบทำใน `EntityManager` transaction; คำนวณด้วย helper บริสุทธิ์ใน `common/budget-math.ts` (validate ด้วยค่า unrounded, เก็บด้วย round2)
- **PO auto-complete** — เมื่อ GRN รับของครบ ระบบปิด PO + consume งบ ภายใน DB transaction เดียว
- **Cache-aside + invalidate** — read ผ่าน Redis ก่อน, write ทำให้ namespace เก่าใช้ไม่ได้ด้วย generation counter; Redis ดับ = fail-fast กลับไปยิง DB (ไม่ crash)
- **Fire-and-forget** — audit log + notification เรียกแบบ `void svc.method().catch(...)` ไม่บล็อก flow หลัก

## Testing

```bash
npm run test          # unit
npm run test:e2e      # e2e — ต้องมี PostgreSQL (auto ใช้ procurement_test_db)
```

หมายเหตุ: unit test (ts-jest) เป็น transpile-only จึง **ไม่จับ type error** — ตรวจ type แยกด้วย `npx tsc --noEmit` และ `npm run lint` ก่อน merge. e2e แยก state ออกจาก dev ทั้ง PostgreSQL (`procurement_test_db`) และ Redis (`REDIS_DB=1`)
