# Frontend — Procurement & Vendor Management UI

React SPA สำหรับระบบจัดซื้อ-จัดจ้าง (Purchase Request → Approval → Purchase Order → Goods Receipt) พร้อม Budget Control และ Dashboard — UI ภาษาไทย, รองรับ dark mode

> ส่วนนี้คือ **web client** ที่คุยกับ [backend API](../backend/README.md) ผ่าน REST — สำหรับการรันทั้ง stack ด้วย Docker คำสั่งเดียว ดู [`../README.md`](../README.md)

## Tech Stack

| ด้าน | เครื่องมือ |
|---|---|
| Framework | React 19 + TypeScript (build ด้วย Vite 8) |
| Routing | React Router 7 (`react-router-dom`) |
| Server state | TanStack Query 5 (`@tanstack/react-query`) |
| HTTP | `axios` (instance กลาง + interceptor) |
| Forms | React Hook Form 7 + Zod 4 (`@hookform/resolvers`) |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix primitives) + `lucide-react` icons |
| Charts | `recharts` |
| Theme | `next-themes` (light/dark) |
| Toast | `sonner` |
| Font | IBM Plex Sans Thai + IBM Plex Mono (`@fontsource`) |
| Testing | Vitest 4 + Testing Library + jsdom |

## โครงสร้าง (`src/`)

จัดแบบ **feature-folder** — baseline ของแต่ละ feature คือ `api.ts` + `pages/` แล้วเพิ่ม `hooks/` / `components/` / `lib/` / `types.ts` ตามความซับซ้อน (auth/settings เป็น feature เล็ก มีแค่ `api.ts` + `pages/`; settings มี `layout/` เพิ่ม)

| โฟลเดอร์ | หน้าที่ |
|---|---|
| `app/` | `providers.tsx` (QueryClient + theme + toaster) · `router.tsx` (เส้นทาง + `ProtectedRoute`) |
| `features/auth` | login + `/auth/me` API (`api.ts` + `LoginPage`); token แนบ/ลบใน `shared/lib/axios` interceptor |
| `features/dashboard` | สรุปภาพรวม — stat cards, donut, recent PRs, budget summary, attention list |
| `features/purchase-requests` | PR list/detail/form + status badge + filter |
| `features/purchase-orders` | PO list/detail/form + budget preview + ให้คะแนนผู้ขาย |
| `features/goods-receipts` | GRN (บันทึกรับของ) list/detail/form |
| `features/vendors` | vendor list/detail/form + หมวดหมู่ + blacklist + rating |
| `features/budgets` | budget list/detail/form + breakdown bar + transactions |
| `features/users` | user management (เฉพาะ procurement_officer) |
| `features/settings` | โปรไฟล์ + เปลี่ยนรหัสผ่าน |
| `shared/components` | composite UI ใช้ร่วม (`AppLayout`, `Sidebar`, `PageHeader`, `ProtectedRoute`, `ListSearchPrompt` + `List*`, `DateField`, `ConfirmDialog`, `StarRating`, `ThemeToggle`) |
| `shared/components/ui` | shadcn/ui primitives (button, card, table, dialog, select, form, ...) |
| `shared/hooks` | `useCurrentUser` · `usePagination` · `useUrlFilters` (sync filter ↔ URL) |
| `shared/lib` | `axios` (API client) · `utils` (`cn`, `formatCurrency`) · `buddhistDate` · `getApiErrorMessage` · `safeNum` |

## การเชื่อมต่อ backend

- dev server proxy `/api/*` → `http://localhost:3000` (ตั้งใน [`vite.config.ts`](vite.config.ts)) → เรียก API ด้วย path สัมพัทธ์ `/api/v1/...` ได้เลย ไม่ต้องตั้ง base URL
- **ไม่มี environment variable** ฝั่ง frontend — base path มาจาก proxy (dev) หรือ nginx (prod ใน Docker)
- import ด้วย alias `@` → `src/` (เช่น `@/shared/components/ui/button`)

## Local development (รัน frontend แยก)

ต้องมี backend รันอยู่ที่ `:3000` ก่อน (ดู [backend README](../backend/README.md)) เพราะ proxy ชี้ไปที่นั่น

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxy /api → :3000)
```

## npm scripts

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server (Vite, HMR) ที่ `:5173` |
| `npm run build` | type-check (`tsc -b`) + production build → `dist/` |
| `npm run preview` | serve `dist/` ที่ build แล้วไว้ลองดู |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (`--write` ใน `src/`) |
| `npm run test` | unit tests (Vitest, watch) |
| `npm run test:run` | unit tests รันครั้งเดียว (ใช้ใน CI) |

## Key patterns

- **Server state = TanStack Query** — ทุก data fetch ผ่าน custom hook (`useXxx`) ที่ห่อ `useQuery`/`useMutation`; mutation `invalidateQueries` ให้ list/detail refetch เอง ไม่เก็บ server data ใน global store
- **Forms = RHF + Zod** — schema validation ต้อง **ตรงกับ backend DTO** (login = required-only, register/เปลี่ยนรหัสผ่าน = min 8); ปุ่ม submit disable จนกว่า `isDirty`/`isValid`
- **Search-first list pages** — หน้า list เริ่มด้วย `ListSearchPrompt` (query `enabled` เมื่อ `hasSearched`) ไม่ดึงทั้งตารางตั้งแต่แรก
- **Filters-in-URL** — `useUrlFilters` sync ตัวกรอง/หน้า ↔ query string ครบทุกหน้า list (refresh/แชร์ลิงก์ได้, back/forward ทำงาน)
- **Role-based UI** — `ProtectedRoute` + `useCurrentUser`; ปุ่ม/เมนู/หน้า render ตาม role (employee / manager / procurement_officer)
- **Thai-first UI** — label/ข้อความเป็นไทย, แสดงวันที่แบบพุทธศักราช (`buddhistDate`), จำนวนเงินผ่าน `formatCurrency`
- **Error handling** — interceptor ใน `shared/lib/axios.ts` + `getApiErrorMessage` แปลง error เป็นข้อความ + `sonner` toast

## Testing

```bash
npm run test:run     # Vitest (jsdom + Testing Library)
```

หมายเหตุ: Vitest (transform) **ไม่จับ type error** จึงต้องรัน `npm run build` (มี `tsc -b`) และ `npm run lint` ก่อน merge ทุกครั้ง เทสต์เน้นพฤติกรรมที่ผู้ใช้เห็น (render, interaction) ผ่าน Testing Library — query ด้วย role/text ไม่ผูกกับ implementation detail
