# Frontend — Procurement & Vendor Management UI

React SPA for a procurement system (Purchase Request → Approval → Purchase Order → Goods Receipt) with Budget Control and a Dashboard — Thai-language UI with dark mode support

> This is the **web client** that talks to the [backend API](../backend/README.md) over REST — to run the whole stack with a single Docker command, see [`../README.md`](../README.md)

## Tech Stack

| Area | Tool |
|---|---|
| Framework | React 19 + TypeScript (built with Vite 8) |
| Routing | React Router 7 (`react-router-dom`) |
| Server state | TanStack Query 5 (`@tanstack/react-query`) |
| HTTP | `axios` (shared instance + interceptor) |
| Forms | React Hook Form 7 + Zod 4 (`@hookform/resolvers`) |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix primitives) + `lucide-react` icons |
| Charts | ApexCharts (`react-apexcharts`) |
| Theme | `next-themes` (light/dark) |
| Toast | `sonner` |
| Font | IBM Plex Sans Thai + IBM Plex Mono (`@fontsource`) |
| Testing | Vitest 4 + Testing Library + jsdom |

## Structure (`src/`)

Organized as **feature folders** — each feature's baseline is `api.ts` + `pages/`, then adds `hooks/` / `components/` / `lib/` / `types.ts` as complexity grows (auth/settings are small features with just `api.ts` + `pages/`; settings adds a `layout/`)

| Folder | Responsibility |
|---|---|
| `app/` | `providers.tsx` (QueryClient + theme + toaster) · `router.tsx` (routes + `ProtectedRoute`) |
| `features/auth` | login + `/auth/me` API (`api.ts` + `LoginPage`); token attached/removed in the `shared/lib/axios` interceptor |
| `features/dashboard` | overview — stat cards, donut, recent PRs, budget summary, attention list |
| `features/purchase-requests` | PR list/detail/form + status badge + filter |
| `features/purchase-orders` | PO list/detail/form + budget preview + vendor rating |
| `features/goods-receipts` | GRN (goods receipt) list/detail/form |
| `features/vendors` | vendor list/detail/form + categories + blacklist + rating |
| `features/budgets` | budget list/detail/form + breakdown bar + transactions |
| `features/users` | user management (procurement_officer only) |
| `features/settings` | profile + change password |
| `shared/components` | shared composite UI (`AppLayout`, `Sidebar`, `PageHeader`, `ProtectedRoute`, `ListSearchPrompt` + `List*`, `DateField`, `ConfirmDialog`, `StarRating`, `ThemeToggle`) |
| `shared/components/ui` | shadcn/ui primitives (button, card, table, dialog, select, form, ...) |
| `shared/hooks` | `useCurrentUser` · `usePagination` · `useUrlFilters` (sync filters ↔ URL) |
| `shared/lib` | `axios` (API client) · `utils` (`cn`, `formatCurrency`) · `buddhistDate` · `getApiErrorMessage` · `safeNum` |

## Connecting to the backend

- the dev server proxies `/api/*` → `http://localhost:3000` (configured in [`vite.config.ts`](vite.config.ts)) → you can call the API with relative paths like `/api/v1/...` with no base URL to configure
- **no frontend environment variables** — the base path comes from the proxy (dev) or nginx (prod, in Docker)
- import via the `@` alias → `src/` (e.g. `@/shared/components/ui/button`)

## Local development (run the frontend standalone)

The backend must be running on `:3000` first (see [backend README](../backend/README.md)) because the proxy points there

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxy /api → :3000)
```

## npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server (Vite, HMR) on `:5173` |
| `npm run build` | type-check (`tsc -b`) + production build → `dist/` |
| `npm run preview` | serve the built `dist/` for a quick look |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (`--write` in `src/`) |
| `npm run test` | unit tests (Vitest, watch) |
| `npm run test:run` | unit tests, single run (used in CI) |

## Key patterns

- **Server state = TanStack Query** — every data fetch goes through a custom hook (`useXxx`) wrapping `useQuery`/`useMutation`; mutations `invalidateQueries` so list/detail refetch themselves — no server data in a global store
- **Forms = RHF + Zod** — schema validation must **match the backend DTO** (login = required-only, register/change-password = min 8); the submit button is disabled until `isDirty`/`isValid`
- **Search-first list pages** — list pages start with `ListSearchPrompt` (query `enabled` once `hasSearched`) instead of loading the whole table upfront
- **Filters-in-URL** — `useUrlFilters` syncs filters/page ↔ query string on every list page (refresh/share links work, back/forward work)
- **Role-based UI** — `ProtectedRoute` + `useCurrentUser`; buttons/menus/pages render by role (employee / manager / procurement_officer)
- **Thai-first UI** — Thai labels/text, Buddhist-era dates (`buddhistDate`), amounts via `formatCurrency`
- **Error handling** — interceptor in `shared/lib/axios.ts` + `getApiErrorMessage` turns errors into messages + `sonner` toast

## Testing

```bash
npm run test:run     # Vitest (jsdom + Testing Library)
```

Note: Vitest (transform) **does not catch type errors**, so run `npm run build` (which runs `tsc -b`) and `npm run lint` before every merge. Tests focus on user-visible behavior (render, interaction) via Testing Library — querying by role/text, not tied to implementation details
