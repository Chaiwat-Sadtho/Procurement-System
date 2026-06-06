# Procurement & Vendor Management System

ระบบจัดซื้อ-จัดจ้างและบริหารผู้ขาย (Purchase Request → Approval → Purchase Order → Goods Receipt) พร้อม Budget Control, Audit Log และ Notification

> NestJS + React + PostgreSQL — รันได้ด้วย Docker คำสั่งเดียว

## Tech Stack

| Layer | เครื่องมือ |
|---|---|
| Backend | NestJS 11 (TypeScript) + TypeORM |
| Database | PostgreSQL 16 |
| Auth | JWT + bcrypt + Role Guard |
| API Docs | Swagger (OpenAPI) |
| Frontend | React 19 + Vite + Tailwind CSS + TanStack Query + React Hook Form + Zod |
| Testing | Jest + Supertest (backend), Vitest (frontend) |
| Infra | Docker + Docker Compose, nginx, GitHub Actions CI |

## Features

- **Auth & Users** — JWT login, role-based access (employee / manager / procurement_officer), แก้โปรไฟล์ + เปลี่ยนรหัสผ่าน
- **Purchase Request (PR)** — สร้าง/แก้/ส่งอนุมัติ, state machine (draft → submitted → approved/rejected), เลือกงบรายปี/รายไตรมาส
- **Vendor Management** — CRUD ผู้ขาย, หมวดหมู่, blacklist, ประวัติคะแนน
- **Purchase Order (PO) + GRN** — สร้าง PO จาก PR, บันทึกรับของ (GRN), auto-complete PO เมื่อรับครบ (DB transaction), ให้คะแนนผู้ขาย
- **Budget Control** — reserve/release/consume งบประมาณแบบ atomic (pessimistic lock)
- **Audit Log + Notification** — บันทึกการกระทำ + แจ้งเตือนอัตโนมัติ

## Quick Start (Docker — แนะนำ)

ต้องมี Docker + Docker Compose

```bash
# 1. clone + เข้าโฟลเดอร์
git clone https://github.com/Chaiwat-Setho/Procurement-System.git
cd Procurement-System

# 2. สร้างไฟล์ env
cp .env.example .env

# 3. รันทั้ง stack (prod-like: postgres + backend + frontend)
docker compose -f docker-compose.yml up --build -d

# 4. seed ข้อมูลตัวอย่าง (รันครั้งเดียวหลัง up ครั้งแรก)
docker compose -f docker-compose.yml exec backend npm run seed:prod
```

เปิดใช้งาน:
- Frontend: http://localhost:8080
- Swagger API docs: http://localhost:3000/api/docs
- Health check: http://localhost:3000/api/v1/health

### บัญชีทดสอบ (รหัสผ่าน: `Password123`)

| Email | Role |
|---|---|
| employee@company.com | employee |
| manager@company.com | manager |
| procurement@company.com | procurement_officer |

### โหมด dev (มี pgAdmin)

`docker compose up -d` (ไม่ใส่ `-f`) จะ merge `docker-compose.override.yml` เพิ่ม pgAdmin ที่ http://localhost:5050 (admin@admin.com / admin)

## รันแบบไม่ใช้ Docker (local dev)

**Database:** ต้องมี PostgreSQL รันอยู่ (หรือ `docker compose up -d postgres`)

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
2. เปิด Swagger http://localhost:3000/api/docs ดู API ทั้งหมด
3. Login เป็น employee → สร้าง PR → submit
4. Login เป็น manager → approve PR (งบถูก reserve)
5. Login เป็น procurement → สร้าง PO จาก PR → บันทึก GRN → PO auto-complete + งบถูก consume
6. ให้คะแนนผู้ขาย → ดูใน vendor detail

## Architecture

```
Browser ──http://localhost:8080──> [nginx (frontend container)]
                                         │ static SPA
                                         │ proxy /api/* ──> [backend container :3000]
                                                                  │ TypeORM
                                                                  └──> [postgres container :5432]
```
