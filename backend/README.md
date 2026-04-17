# Backend Setup

This backend uses Prisma with PostgreSQL and reads its database connection from environment variables.

## Environment

Create a local `.env` file from the example and update the database URL for your machine:

```bash
cp .env.example .env
```

```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bus_ticket_system?schema=public"
```

## Prisma commands

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
```

## Run the backend

```bash
npm install
npm run prisma:generate
npm run start:dev
```

## Initial schema

The initial Prisma schema includes the main entities for the bus ticket domain:

- `User`
- `Bus`
- `Route`
- `Trip`
- `Booking`

It also includes enums for user roles, trip status, and booking status.
