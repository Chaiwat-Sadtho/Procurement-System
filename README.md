# Procurement & Vendor Management System

ระบบจัดซื้อ-จัดจ้างและบริหารผู้ขาย (Purchase Request → Approval → Purchase Order → Goods Receipt) พร้อม Budget Control, Audit Log และ Notification

> NestJS + React + PostgreSQL — รันได้ด้วย Docker คำสั่งเดียว

## Tech Stack

| Layer | เครื่องมือ |
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

- **Auth & Users** — JWT login, role-based access (employee / manager / procurement_officer), แก้โปรไฟล์ + เปลี่ยนรหัสผ่าน
- **Purchase Request (PR)** — สร้าง/แก้/ส่งอนุมัติ, state machine (draft → submitted → approved/rejected), เลือกงบรายปี/รายไตรมาส
- **Vendor Management** — CRUD ผู้ขาย, หมวดหมู่, blacklist, ประวัติคะแนน
- **Purchase Order (PO) + GRN** — สร้าง PO จาก PR, บันทึกรับของ (GRN), auto-complete PO เมื่อรับครบ (DB transaction), ให้คะแนนผู้ขาย
- **Budget Control** — reserve/release/consume งบประมาณแบบ atomic (pessimistic lock)
- **Audit Log + Notification** — บันทึกการกระทำ + แจ้งเตือนอัตโนมัติ
- **Caching (Redis)** — cache-aside บน reference data + รายการ vendor/rating, invalidate-on-write ผ่าน namespace gen-counter, graceful-degrade เมื่อ Redis ดับ
- **Rate Limiting** — throttle ระดับ global + override เฉพาะ auth (login/register/change-password), เก็บ counter บน Redis (รองรับหลาย instance), fail-open เมื่อ Redis ดับ
- **Load Balancing** — nginx round-robin หน้า backend 2 instance (stateless + transparent failover), รัน DB migration ครั้งเดียวด้วย one-off service

## Quick Start (Docker — แนะนำ)

ต้องมี Docker + Docker Compose

```bash
# 1. clone + เข้าโฟลเดอร์
git clone https://github.com/Chaiwat-Sadtho/Procurement-System.git
cd Procurement-System

# 2. สร้างไฟล์ env
cp .env.example .env

# 3. รันทั้ง stack (prod-like: postgres + redis + migrate + backend1/backend2 + frontend)
docker compose -f docker-compose.yml up --build -d

# 4. seed ข้อมูลตัวอย่าง (รันครั้งเดียวหลัง up ครั้งแรก)
docker compose -f docker-compose.yml exec backend1 npm run seed:prod
```

เปิดใช้งาน (ทุกอย่างผ่าน nginx ที่ `:8080` — backend ไม่ publish port ออกนอก network):
- Frontend: http://localhost:8080
- Swagger API docs: http://localhost:8080/api/docs (nginx proxy → backend pool)
- Health check: http://localhost:8080/api/v1/health

### บัญชีทดสอบ (รหัสผ่าน: `Password123`)

| Email | Role |
|---|---|
| employee@company.com | employee |
| manager@company.com | manager |
| procurement@company.com | procurement_officer |

### โหมด dev (มี pgAdmin)

`docker compose up -d` (ไม่ใส่ `-f`) จะ merge `docker-compose.override.yml` เพิ่ม pgAdmin ที่ http://localhost:5050 (admin@admin.com / admin)

## รันแบบไม่ใช้ Docker (local dev)

**Database + Cache:** ต้องมี PostgreSQL รันอยู่ (หรือ `docker compose up -d postgres redis`) — Redis เป็น optional ใน dev (cache + rate-limit graceful-degrade ถ้าไม่มี)

**Backend:**
```bash
cd backend
cp ../.env.example .env   # DB_HOST=localhost
npm install
npm run start:dev         # http://localhost:3000
npm run seed              # seed ข้อมูล (ts-node)
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxy /api → :3000)
```

## Testing

```bash
# Backend
cd backend
npm run test              # unit
npm run test:e2e          # e2e (ต้องมี DB)

# Frontend
cd frontend
npm run test:run          # vitest
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) รัน lint + test + build ทั้ง backend (พร้อม PostgreSQL service container สำหรับ e2e) และ frontend บนทุก push เข้า `master` / `dev` และทุก Pull Request

## Demo Flow

1. `docker compose -f docker-compose.yml up --build -d` + seed
2. เปิด Swagger http://localhost:8080/api/docs ดู API ทั้งหมด
3. Login เป็น employee → สร้าง PR → submit
4. Login เป็น manager → approve PR (งบถูก reserve)
5. Login เป็น procurement → สร้าง PO จาก PR → บันทึก GRN → PO auto-complete + งบถูก consume
6. ให้คะแนนผู้ขาย → ดูใน vendor detail

## Architecture

```
Browser ──http://localhost:8080──> [nginx + React SPA]   (frontend container)
                                          │
                                          │ proxy /api/*  (round-robin + transparent failover)
                                          ├──> [backend1 :3000] ─┐
                                          └──> [backend2 :3000] ─┤
                                                                 ├── TypeORM ──────────> [postgres :5432]
                                                                 └── cache / throttle ──> [redis :6379]

[migrate]  one-off service: รัน DB migration ครั้งเดียวก่อน backend ขึ้น (กัน migration race)
```
