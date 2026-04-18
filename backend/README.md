# EasyTrip Backend System 🚌

A robust and scalable backend for the **EasyTrip Bus Ticket System**. Built entirely with **NestJS**, **Prisma ORM**, and **PostgreSQL**.

---

## 🏗 System Architecture & Domain Logic

The backend is built around a complex and tightly coupled relational data model to ensure a flawless ticketing experience. Below is the detailed breakdown of our business entities and rules derived from the Prisma Schema:

### 1. 🚍 Bus & Route Management

- **Buses**: Each bus has strict definitions including `seatCapacity`, registration identifiers, and types (`AC`, `NON_AC`, `SLEEPER`). Buses can be flagged as `ACTIVE`, `INACTIVE`, or under `MAINTENANCE`.
- **Routes**: Defines the A to B pathways (`origin` to `destination`). The system prevents duplicate redundant routes.
- **Trips**: The core engine of operations. A Trip forcefully maps a specific `Bus` to a `Route`. It establishes `departureTime`, `arrivalTime`, and explicit base `price`. A trip lifecycle runs through `SCHEDULED`, `COMPLETED`, or `CANCELLED`.
- **Seats**: An explicit blueprint for buses. Each seat has strict mapping (e.g., `A1`, `B2`) with optional logic for Rows and Columns.

### 2. 🎟 Booking & Seat Locking (Critical Workflow)

- **Booking Strategy**: To prevent double-booking, the backend utilizes `BookingSeat` which creates a composite absolute unique lock (`tripId` + `seatId`).
- **The Locking Flow**:
  1. User selects a seat -> System generates a `BookingSeat` with `LOCKED` status.
  2. A temporary `lockExpiresAt` timer begins.
  3. If payment clears in time -> State changes to `RESERVED` directly tying it to the `Booking`.
  4. If payment fails/expires -> System drops the lock or sets it to `CANCELLED`, freeing it for other users.
- **Bookings**: Tracks the end user, passenger details (`passengerName`, `passengerPhone`), and total computational amount logically before generating a permanent `bookingReference`.

### 3. 💳 Payments & Financials

- **Payments**: The gateway architecture supports `BKASH`, `NAGAD`, and `CARD`. Every payment triggers state transitions linking the transaction ID exactly to the pending booking.
- **Refunds**: Built-in administrative logic where users/admins can log `REJECTED` or `APPROVED` refunds against specific failed or manually cancelled `paymentIds` securely.

### 4. 👤 Users & Roles

- **Users**: Secured via bcrypt password hashing and validated JWT tokens. Users can be standardized `USER` clients or high-access `ADMIN` accounts capable of enforcing refund actions and scheduling logic.

---

## 🛠 Tech Stack

- **Framework**: NestJS (TypeScript, Node.js)
- **Database**: PostgreSQL
- **ORM**: Prisma Client v7
- **Validation Rules**: `class-validator` & `class-transformer`
- **Security Checkers**: `passport-jwt` + `bcrypt`

---

## 📦 Setting Up Your Environment

Create a `.env` file at the root of the backend folder using the provided example format:

```bash
cp .env.example .env
```

Define the minimal core variables inside `.env`:

```env
PORT=3000
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bus_ticket_system?schema=public"
JWT_SECRET="YOUR_ULTRA_SECURE_SECRET_TOKEN"
```

---

## 🗄️ Database Provisioning

To inject the exact database shapes to your Postgres application, run the schema tools securely:

```bash
# 1. Scaffolds our TypeScript interface library linked to the schema
npm run prisma:generate

# 2. Replicates the schema to your local DB natively safely
npm run prisma:migrate:dev

# 3. Access a beautiful web-UI browser of your active database contents
npm run prisma:studio
```

---

## 🚦 Running the Application Locally

```bash
# Force install all deep NestJS modules securely
npm install

# Start the application continuously in Development Watch Mode
npm run start:dev

# If moving to production server
npm run build
npm run start:prod
```

## 🧪 Testing Strategies

Our backend supports robust validation rules:

```bash
npm run test          # Jest Unit tests scanning deep logic
npm run test:e2e      # End to End HTTP verification tests
npm run test:cov      # Check test-suite coverage mappings
npm run lint          # ESLint code standardization
```
