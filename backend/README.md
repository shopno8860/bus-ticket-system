# EasyTrip Backend

NestJS + Prisma based API server for the EasyTrip Bus Ticket System.

## Tech Stack

- NestJS 11 (TypeScript)
- Prisma ORM 7 + PostgreSQL
- JWT auth with Passport
- Nodemailer (mail/OTP/reset flows)

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+ (or compatible npm version)
- PostgreSQL database instance

## Environment Setup

Create `.env` from the template:

```bash
cp .env.example .env
```

Current `.env.example` includes:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bus_ticket_system"
JWT_ACCESS_SECRET="change-me-access-secret"
JWT_REFRESH_SECRET="change-me-refresh-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-gmail@gmail.com"
SMTP_PASS="your-gmail-app-password"
SMTP_FROM_EMAIL="your-gmail@gmail.com"
SMTP_FROM_NAME="EasyTrip Support"
```

Optional payment gateway variables (used in payment flow):

```env
STORE_ID=""
STORE_PASSWORD=""
SSLCOMMERZ_URL=""
BACKEND_URL="http://localhost:3000"
```

SSLCommerz refunds and order validation (sandbox or live) also support:

```env
SSL_STORE_ID=""
SSL_STORE_PASS=""
SSL_BASE_URL="https://sandbox.sslcommerz.com"
SSL_REFUND_URL="https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php"
```

If `SSL_STORE_ID` / `SSL_STORE_PASS` are unset, the backend falls back to `STORE_ID` / `STORE_PASSWORD`. If `SSL_REFUND_URL` is unset, the refund client builds the URL from `SSL_BASE_URL` or from the origin of `SSLCOMMERZ_URL`. Successful payment callbacks should include `val_id` when possible so the server can validate the order and persist `bankTranId` for API refunds.

## Installation

```bash
npm install
```

## Database Commands

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

Optional:

```bash
npm run prisma:studio
```

## Run the Server

Development:

```bash
npm run start:dev
```

Production:

```bash
npm run build
npm run start:prod
```

Default API URL: `http://localhost:3000`

## Interactive API docs (Swagger)

With the server running, open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) for the OpenAPI UI. Raw JSON: `http://localhost:3000/api/docs-json`. Authenticated routes: click **Authorize**, enter `Bearer <accessToken>` or just the token depending on the UI, after `POST /auth/login`.

## Testing and Code Quality

```bash
npm run test
npm run test:e2e
npm run test:cov
npm run lint
```

## Module Overview

- `auth`: login/register/token refresh/forgot-reset password
- `bookings`: booking creation, confirmation, **user cancel sends a pending refund request** (ticket stays confirmed until admin approves the refund), seat lock workflow
- `buses`: bus, route, trip, seat related management
- `payments`: payment initiation and callback/verification flows
- `refunds`: user refund request (`POST /refunds`) and admin approve/reject; on approve, SSLCommerz refund runs when `bankTranId` and store credentials exist. `GET /refund/status/:refundRefId` returns stored + live gateway status for the owner.
- `admin`: admin-level reporting and operations

## Notes

- Ensure frontend URL in backend (`FRONTEND_URL`) matches your frontend dev/prod host.
- Run migrations before starting the server on a new environment.
