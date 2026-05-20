# EasyTrip Bus Ticket System — Agent Guide

## Monorepo layout

No root workspace — `backend/` and `frontend/` are independent packages.
Each has its own `package.json`, `node_modules/`, and scripts.

## Quick start

```bash
# Backend (NestJS 11 + Prisma 7 + PostgreSQL)
cd backend
cp .env.example .env   # then edit DATABASE_URL and secrets
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run start:dev       # http://localhost:3000

# Frontend (React 19 + Vite 8 + Tailwind 3 + DaisyUI 4)
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## Dev commands

| Scope | Command | Description |
|-------|---------|-------------|
| backend | `npm run test` | Jest unit tests (`src/**/*.spec.ts`) |
| backend | `npm run test:e2e` | E2E tests (`test/**/*.e2e-spec.ts`) |
| backend | `npm run test:cov` | With coverage |
| backend | `npm run lint` | ESLint with `--fix` |
| backend | `npm run format` | Prettier (singleQuote, trailingComma all) |
| backend | `npm run prisma:generate` | Prisma client generation |
| backend | `npm run prisma:migrate:dev` | Dev migration |
| backend | `npm run prisma:migrate:deploy` | Prod migration |
| backend | `npm run prisma:studio` | DB browser |
| backend | `npm run build && npm run start:prod` | Production |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | Production build |
| frontend | `npm run preview` | Preview production build |

**No frontend tests.** Frontend has no test runner configured.

## Role architecture

4 roles: `ADMIN` (platform owner), `OPERATOR` (bus company), `STAFF` (operator employee), `USER` (passenger).

| Role | Dashboard | Can manage |
|------|-----------|------------|
| ADMIN | `/admin/*` | Global: operators, all bookings, all buses, all trips |
| OPERATOR | `/operator/*` | Own buses, routes, trips, bookings, payments, refunds, staff |
| STAFF | `/staff/*` | Own bookings only (book tickets, view history) |
| USER | Public site | Personal bookings only |

JWT payload includes `operatorId` for OPERATOR/STAFF users. Suspended operators block all logins.

## Architecture

- **Backend**: NestJS modules, Controllers → Services pattern, `class-validator` DTOs with global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`).
- **Admin endpoints**: Centralized in `modules/admin/`. Guarded by `Roles('ADMIN')`.
- **Operator endpoints**: `modules/operators/` with `Roles('OPERATOR', 'STAFF')`.
- **Prisma 7**: Uses `prisma.config.ts` with `defineConfig`. Run `prisma:generate` after schema changes.
- **Critical DB ops** (booking, payment, refund) use Prisma `$transaction({isolationLevel: 'Serializable'})` with `maxWait: 15000`.
- **Cron jobs**: Trip generation (midnight + on startup), seat lock cleanup (30s), payment expiry (30s).
- **Swagger**: `/api/docs`, JWT auth via Authorize button with `Bearer <token>`.

## Multi-operator rules

- Every `Bus`, `Route`, `Trip`, `Booking`, `Payment`, `Refund` belongs to exactly one `Operator` via `operatorId`.
- `Route` has `@@unique([operatorId, origin, destination])` so each operator has their own routes.
- Public trip search excludes trips from `SUSPENDED` operators.
- `operatorName` was removed from `Bus` — use `Bus → Operator` relation instead.
- Seed creates 3 operators (Alhamra, Orin, Hanif) with routes, buses, seats, and trips.

## Domain quirks

- **Seat locking**: Lock seats (no auth) → confirm booking (JWT) → pay. Locks auto-release after `SEAT_SELECTION_LOCK_MINUTES` (default 2). Payment window after confirm is `BOOKING_PAYMENT_TIMEOUT_MINUTES` (default 2).
- **Concurrency guard**: `BookingSeat` has `@@unique([tripId, seatId])` — prevents double-booking at DB level.
- **Payment**: SSLCommerz with dual env var fallback (`SSL_STORE_ID`/`SSL_STORE_PASS` fall back to `STORE_ID`/`STORE_PASSWORD`; `SSL_REFUND_URL` derived from `SSL_BASE_URL` if unset).
- **Refund policy**: 90% (>24h), 50% (6-24h), 25% (2-6h), none (<2h before departure).
- **CORS**: Hardcoded to `http://localhost:5173` and `https://easytrip-beta.vercel.app` plus `FRONTEND_URL` env var.

## Backend entry points

- `backend/src/main.ts` — NestJS bootstrap, Swagger setup, CORS, ValidationPipe
- `backend/prisma/schema.prisma` — 11 models (added Operator), 12 enums (added OperatorStatus)
- `backend/prisma.config.ts` — Prisma 7 config
- `backend/prisma/seed.ts` — DB seed (`npm run prisma:seed` via ts-node)

## Frontend entry points

- `frontend/src/app/main.jsx` — React root, BrowserRouter, AuthProvider
- `frontend/src/app/App.jsx` — Route definitions
- `frontend/src/services/api.js` — Fetch wrapper with auto JWT attachment
- `frontend/src/services/endpoints.js` — Centralized API paths
- `frontend/src/features/operator/` — Operator dashboard pages
- `frontend/src/features/staff/` — Staff dashboard pages
- `frontend/src/features/admin/pages/OperatorsPage.jsx` — Admin operator management
- `frontend/vercel.json` — SPA rewrites for Vercel deployment
