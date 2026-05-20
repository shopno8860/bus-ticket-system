# EasyTrip Bus Ticket System — Full Project Summary

**EasyTrip** is a full-stack bus ticket booking platform for the Bangladesh market, with seat selection, SSLCommerz payment gateway integration, and a full admin dashboard.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Backend | **NestJS 11** (TypeScript), **Prisma 7** ORM, **PostgreSQL** |
| Frontend | **React 19**, **Vite 8**, **Tailwind CSS 3** + **DaisyUI 4** |
| Auth | Passport JWT (access + refresh tokens), bcrypt, role-based guards |
| Payments | **SSLCommerz** (Bangladesh gateway) |
| Scheduling | `@nestjs/schedule` cron jobs (trip generation, seat lock cleanup, payment expiry) |
| Docs | Swagger/OpenAPI at `/api/docs` |
| Testing | Jest + Supertest |

---

## 2. Database (10 models, 11 enums)

| Model | Purpose |
|---|---|
| **User** | Full profile, roles (ADMIN/USER), password reset tokens |
| **Bus** | Bus info, type (AC/NON_AC/SLEEPER), class (BUSINESS/ECONOMY), status |
| **Route** | origin↔destination (unique pair) |
| **Trip** | Links bus + route + schedule + price |
| **Seat** | Per-bus seat layout (row/col/seatNumber) |
| **Booking** | Booking reference, passenger info, total amount, status (PENDING/CONFIRMED/CANCELLED/EXPIRED) |
| **BookingSeat** | Concurrency guard — `@@unique([tripId, seatId])` prevents double-booking; status LOCKED/RESERVED/CANCELLED with lock expiry |
| **Payment** | SSLCommerz transaction data, status PENDING/SUCCESS/FAILED/REFUNDED |
| **Refund** | Admin approval flow, SSLCommerz refund integration |

### Enums

| Enum | Values |
|---|---|
| `UserRole` | `ADMIN`, `USER` |
| `Gender` | `MALE`, `FEMALE`, `OTHER` |
| `BusType` | `AC`, `NON_AC`, `SLEEPER` |
| `BusClass` | `BUSINESS`, `ECONOMY` |
| `BusStatus` | `ACTIVE`, `INACTIVE`, `MAINTENANCE` |
| `TripStatus` | `SCHEDULED`, `COMPLETED`, `CANCELLED` |
| `BookingStatus` | `PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED` |
| `BookingSeatStatus` | `LOCKED`, `RESERVED`, `CANCELLED` |
| `PaymentMethod` | `BKASH`, `NAGAD`, `CARD` |
| `PaymentStatus` | `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED` |
| `RefundStatus` | `PENDING`, `APPROVED`, `REJECTED`, `FAILED` |

---

## 3. Booking & Payment Flow

1. **Search** → `GET /trips?origin=...&destination=...&date=...`
2. **Select Seats** → `GET /trips/:id` returns bus layout with seat availability
3. **Lock Seats** → `POST /bookings` (no auth needed) → seats locked for 2 min
4. **Confirm Booking** → `PATCH /bookings/confirm` (JWT required) → calculates total (seat price + platform fee + insurance)
5. **Pay** → `POST /payments` initiates SSLCommerz session, returns gateway URL
6. **Callback** → SSLCommerz POSTs to `success`/`fail`/`cancel` → booking confirmed/cancelled accordingly
7. **Email** → Ticket PDF sent via Nodemailer

Seat locks and payment windows are enforced by **background cron jobs** (every 30s) and **Serializable Prisma transactions**.

---

## 4. API Endpoints (40+)

### Auth (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account, returns user + tokens |
| POST | `/auth/login` | No | Sign in, returns user + tokens |
| POST | `/auth/forgot-password` | No | Request password reset email |
| POST | `/auth/reset-password` | No | Complete password reset with token |
| POST | `/auth/refresh` | No | Rotate tokens |
| POST | `/auth/logout` | JWT | Invalidate refresh token |
| GET | `/auth/me` | JWT | Current user profile |
| GET | `/auth/admin` | JWT+Admin | Smoke test for admin access |

### Users (`/users`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | JWT | Current user details |
| PATCH | `/users/me` | JWT | Update profile |
| POST | `/users/change-password` | JWT | Change password |
| DELETE | `/users/delete-account` | JWT | Delete account |
| GET | `/users/admin/stats` | JWT | Dashboard stats |

### Buses (`/buses`, `/admin/buses`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/buses` | Public | List all buses |
| GET | `/buses/:id` | Public | Bus detail |
| POST | `/admin/buses` | JWT+Admin | Create bus (audit logged) |
| PATCH | `/admin/buses/:id` | JWT+Admin | Update bus (audit logged) |
| DELETE | `/admin/buses/:id` | JWT+Admin | Delete bus (audit logged) |
| POST | `/admin/buses/:busId/seats` | JWT+Admin | Generate/regenerate seats |

### Routes (`/routes`, `/admin/routes`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/routes` | Public | List all routes |
| GET | `/routes/:id` | Public | Route detail |
| POST | `/admin/routes` | JWT+Admin | Create route (audit logged) |
| PATCH | `/admin/routes/:id` | JWT+Admin | Update route (audit logged) |
| DELETE | `/admin/routes/:id` | JWT+Admin | Delete route (audit logged) |

### Trips (`/trips`, `/admin/trips`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/trips` | Public | Search trips (origin, destination, date, busType, busClass, price range) |
| GET | `/trips/:id` | Public | Trip details with seats |
| POST | `/admin/trips` | JWT+Admin | Create trip (audit logged) |
| PATCH | `/admin/trips/:id` | JWT+Admin | Update trip (audit logged) |
| PATCH | `/admin/trips/:id/cancel` | JWT+Admin | Cancel trip + auto refunds (audit logged) |
| GET | `/admin/trips` | JWT+Admin | Admin trip listing with filters |

### Seats (`/buses/:busId/seats`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/buses/:busId/seats` | Public | List seats for a bus |

### Bookings (`/bookings`, `/admin/bookings`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/bookings` | No | Lock seats (create PENDING booking, returns lockExpiresAt) |
| PATCH | `/bookings/confirm` | JWT | Confirm booking (attach user, set payment deadline, calculate total with fees) |
| GET | `/bookings/my-bookings` | JWT | List current user's bookings |
| GET | `/bookings/:id` | JWT | Booking detail (owner or admin) |
| PATCH | `/bookings/:id/cancel` | JWT | Request cancellation (creates PENDING refund) |
| GET | `/bookings/admin` | JWT+Admin | Admin booking listing with filters |
| PATCH | `/bookings/:id/cancel` | JWT+Admin | Admin force-cancel booking |

### Payments (`/payments`, `/admin/payments`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments` | JWT | Create payment, initiate SSLCommerz session (returns gateway URL) |
| POST/GET | `/payments/success` | Public | SSLCommerz success callback |
| POST/GET | `/payments/fail` | Public | SSLCommerz fail callback |
| POST/GET | `/payments/cancel` | Public | SSLCommerz cancel callback |
| POST | `/payments/:bookingId/send-confirmation-email` | JWT | Email ticket PDF |
| GET | `/admin/payments` | JWT+Admin | Admin payment listing |

### Refunds (`/refunds`, `/admin/refunds`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/refunds` | JWT | Request refund for a confirmed booking |
| GET | `/refunds/status/:refundRefId` | JWT | Check SSLCommerz refund status for owner |
| GET | `/admin/refunds` | JWT+Admin | Admin refund listing |
| PATCH | `/admin/refunds/:id/approve` | JWT+Admin | Approve refund (may call SSLCommerz refund API) |
| PATCH | `/admin/refunds/:id/reject` | JWT+Admin | Reject refund |
| POST | `/admin/refunds/:id/ssl-sync` | JWT+Admin | Re-query SSLCommerz refund status |

### Admin Dashboard (`/admin`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/dashboard/stats` | JWT+Admin | Dashboard KPIs (users, buses, trips, bookings, revenue, trends) |
| GET | `/admin/users` | JWT+Admin | User list (paginated) |
| PATCH | `/admin/users/:id/role` | JWT+Admin | Change user role |

---

## 5. Cancellation / Refund Policy

| Time Before Departure | Refund % |
|---|---|
| 24+ hours | 90% |
| 6–24 hours | 50% |
| 2–6 hours | 25% |
| < 2 hours | No cancellation |

---

## 6. Frontend Features

- **React 19** with Vite, React Router v7, Tailwind + DaisyUI
- **AuthContext** + localStorage for JWT management
- **Protected routes** with role-based gating (USER / ADMIN)
- **Feature-based folder structure** — each domain has own pages, components, services
- **Admin dashboard** with sidebarnav, Recharts stats, CRUD for users/bookings/payments/refunds/trips/buses/routes
- **Client-side PDF generation** via html2canvas + jsPDF
- **QR codes** on tickets via `qrcode.react`
- **Toast notifications** via `react-hot-toast`

---

## 7. Cron Jobs / Background Tasks

| Job | Frequency | What it does |
|---|---|---|
| Trip Generation | Midnight daily | Creates trips for next day (5 schedule slots) |
| Trip Sync | On startup | Generates trips for next 4 days |
| Seat Lock Cleanup | Every 30s | Releases orphaned expired LOCKED seats |
| Payment Expiry | Every 30s | Marks PENDING bookings as EXPIRED |

---

## 8. Directory Layout (Monorepo)

```
bus-ticket-system/
├── backend/              # NestJS API
│   ├── prisma/           # Schema, migrations, seed
│   ├── src/
│   │   ├── main.ts       # Entry point
│   │   ├── app.module.ts # Root module
│   │   ├── auth/         # Passport JWT auth module
│   │   ├── config/       # Configuration module
│   │   ├── common/       # Shared utilities (cancellation policy)
│   │   ├── mail/         # Nodemailer SMTP service
│   │   ├── prisma/       # Prisma client module
│   │   └── modules/
│   │       ├── admin/    # Admin dashboard + audit logs
│   │       ├── bookings/ # Booking CRUD, seat locks, PDF
│   │       ├── buses/    # Bus CRUD + seat generation
│   │       ├── notifications/ # Notification abstraction
│   │       ├── payments/ # SSLCommerz integration
│   │       ├── refunds/  # Refund requests + gateway sync
│   │       ├── routes/   # Route CRUD
│   │       ├── seats/    # Seat generation
│   │       ├── trips/    # Trip search, CRUD, auto-generator
│   │       └── users/    # User profile, stats
│   └── test/             # E2E tests
│
└── frontend/             # React SPA
    └── src/
        ├── app/          # App.jsx, main.jsx, AppRoutes.jsx
        ├── components/   # Shared UI (Navbar, Footer, Modal, Loader, etc.)
        ├── config/       # Environment config
        ├── hooks/        # useDebounce, useFetch
        ├── layouts/      # MainLayout, AdminLayout
        ├── pages/        # TicketPage
        ├── routes/       # Route definitions
        ├── services/     # API client + endpoints
        ├── store/        # Auth pub/sub store
        ├── utils/        # formatDate, helpers, pdf, toastHelper
        └── features/     # Feature-based organization
            ├── admin/    # Dashboard pages, sidebar, topbar
            ├── auth/     # Login, Register, Forgot/Reset Password, ProtectedRoute
            ├── bookings/ # BookingPage, MyTickets
            ├── buses/    # Bus components
            ├── home/     # Hero, SearchForm, Destinations, Operators
            ├── payments/ # Payment pages + callbacks
            ├── refunds/  # Refund request page
            ├── routes/   # Route services
            ├── seats/    # Seat selection page + components
            ├── trips/    # SearchResults, TripCard, FilterSidebar
            └── users/    # ProfilePage, hooks
```

---

## 9. Key Architectural Patterns

### Backend
- **Module-based feature organization** — each domain is a self-contained NestJS module with controller + service
- **Controllers + Services** — thin controllers handle HTTP/validation, services contain business logic
- **Admin/User separation** — admin endpoints are in `*.admin.controller.ts` or centralized admin module
- **Serializable transactions** — critical booking/payment/refund ops use Prisma `$transaction({isolationLevel: 'Serializable'})`
- **DTO validation** — `class-validator` with global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`)
- **Cron scheduling** — trip auto-generation, expired lock/payment cleanup

### Frontend
- **Feature-based folder structure** — each feature has `pages/`, `components/`, `services/`, `hooks/`
- **Centralized API layer** — `api.js` fetch wrapper with auto JWT attachment; `endpoints.js` centralizes all paths
- **Protected routing** — `ProtectedRoute` with `allowedRoles` prop for admin gating

---

## 10. Environment Variables

### Backend `.env`
```
PORT=3000
DATABASE_URL="postgresql://..."
JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM_EMAIL / SMTP_FROM_NAME
SSL_STORE_ID / SSL_STORE_PASS / SSL_BASE_URL / SSL_REFUND_URL
STORE_ID / STORE_PASSWORD / SSLCOMMERZ_URL
BACKEND_URL="http://localhost:3000"
SEAT_SELECTION_LOCK_MINUTES=2
BOOKING_PAYMENT_TIMEOUT_MINUTES=2
```

### Frontend `.env`
```
VITE_API_BASE_URL="http://localhost:3000"
```
