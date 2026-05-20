-- AlterTable
ALTER TABLE "BookingSeat" ADD COLUMN "lockedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "BookingSeat_tripId_lockedByUserId_idx" ON "BookingSeat"("tripId", "lockedByUserId");

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
