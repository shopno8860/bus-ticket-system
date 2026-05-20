-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum - add new roles
ALTER TYPE "UserRole" ADD VALUE 'OPERATOR';
ALTER TYPE "UserRole" ADD VALUE 'STAFF';

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "description" TEXT,
    "status" "OperatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_companyName_key" ON "Operator"("companyName");
CREATE UNIQUE INDEX "Operator_slug_key" ON "Operator"("slug");
CREATE INDEX "Operator_status_idx" ON "Operator"("status");
CREATE INDEX "Operator_slug_idx" ON "Operator"("slug");

-- AlterTable - Bus
ALTER TABLE "Bus" DROP COLUMN "operatorName",
ADD COLUMN "operatorId" TEXT NOT NULL;

-- AlterTable - Route
ALTER TABLE "Route" ADD COLUMN "operatorId" TEXT NOT NULL;
DROP INDEX IF EXISTS "Route_origin_destination_idx";
CREATE INDEX "Route_origin_destination_idx" ON "Route"("origin", "destination");

-- AlterTable - Trip
ALTER TABLE "Trip" ADD COLUMN "operatorId" TEXT NOT NULL;

-- AlterTable - Booking
ALTER TABLE "Booking" ADD COLUMN "operatorId" TEXT NOT NULL;

-- AlterTable - Payment
ALTER TABLE "Payment" ADD COLUMN "operatorId" TEXT NOT NULL;

-- AlterTable - Refund
ALTER TABLE "Refund" ADD COLUMN "operatorId" TEXT NOT NULL;

-- AlterTable - User
ALTER TABLE "User" ADD COLUMN "operatorId" TEXT;

-- CreateIndex
CREATE INDEX "User_operatorId_idx" ON "User"("operatorId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Bus_operatorId_idx" ON "Bus"("operatorId");
CREATE INDEX "Bus_operatorId_status_idx" ON "Bus"("operatorId", "status");
CREATE INDEX "Route_operatorId_idx" ON "Route"("operatorId");
CREATE INDEX "Trip_operatorId_idx" ON "Trip"("operatorId");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX "Booking_operatorId_idx" ON "Booking"("operatorId");
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");
CREATE INDEX "Payment_operatorId_idx" ON "Payment"("operatorId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Refund_bookingId_idx" ON "Refund"("bookingId");
CREATE INDEX "Refund_operatorId_idx" ON "Refund"("operatorId");
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- Drop old Route unique constraint and create new scoped one
ALTER TABLE "Route" DROP CONSTRAINT IF EXISTS "Route_origin_destination_key";
ALTER TABLE "Route" ADD CONSTRAINT "Route_operatorId_origin_destination_key" UNIQUE ("operatorId", "origin", "destination");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bus" ADD CONSTRAINT "Bus_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Route" ADD CONSTRAINT "Route_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
