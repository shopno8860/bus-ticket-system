-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "boardingPointId" TEXT,
ADD COLUMN     "droppingPointId" TEXT;

-- CreateTable
CREATE TABLE "BoardingPoint" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardingPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DroppingPoint" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DroppingPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardingPoint_operatorId_idx" ON "BoardingPoint"("operatorId");

-- CreateIndex
CREATE INDEX "BoardingPoint_routeId_idx" ON "BoardingPoint"("routeId");

-- CreateIndex
CREATE INDEX "BoardingPoint_isActive_idx" ON "BoardingPoint"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BoardingPoint_routeId_name_key" ON "BoardingPoint"("routeId", "name");

-- CreateIndex
CREATE INDEX "DroppingPoint_operatorId_idx" ON "DroppingPoint"("operatorId");

-- CreateIndex
CREATE INDEX "DroppingPoint_routeId_idx" ON "DroppingPoint"("routeId");

-- CreateIndex
CREATE INDEX "DroppingPoint_isActive_idx" ON "DroppingPoint"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DroppingPoint_routeId_name_key" ON "DroppingPoint"("routeId", "name");

-- CreateIndex
CREATE INDEX "Booking_boardingPointId_idx" ON "Booking"("boardingPointId");

-- CreateIndex
CREATE INDEX "Booking_droppingPointId_idx" ON "Booking"("droppingPointId");

-- AddForeignKey
ALTER TABLE "BoardingPoint" ADD CONSTRAINT "BoardingPoint_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardingPoint" ADD CONSTRAINT "BoardingPoint_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DroppingPoint" ADD CONSTRAINT "DroppingPoint_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DroppingPoint" ADD CONSTRAINT "DroppingPoint_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boardingPointId_fkey" FOREIGN KEY ("boardingPointId") REFERENCES "BoardingPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_droppingPointId_fkey" FOREIGN KEY ("droppingPointId") REFERENCES "DroppingPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
