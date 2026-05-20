-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingSource" TEXT NOT NULL DEFAULT 'USER_BOOKING',
ADD COLUMN     "discountAmount" DECIMAL(10,2),
ADD COLUMN     "discountType" TEXT,
ADD COLUMN     "discountValue" DECIMAL(10,2),
ADD COLUMN     "finalAmount" DECIMAL(10,2);
