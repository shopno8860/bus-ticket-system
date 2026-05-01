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
```

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

## Testing and Code Quality

```bash
npm run test
npm run test:e2e
npm run test:cov
npm run lint
```

## Module Overview

- `auth`: login/register/token refresh/forgot-reset password
- `bookings`: booking creation, confirmation, cancellation, seat lock workflow
- `buses`: bus, route, trip, seat related management
- `payments`: payment initiation and callback/verification flows
- `refunds`: refund request and admin review actions
- `admin`: admin-level reporting and operations

## Notes

- Ensure frontend URL in backend (`FRONTEND_URL`) matches your frontend dev/prod host.
- Run migrations before starting the server on a new environment.
