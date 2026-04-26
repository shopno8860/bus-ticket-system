-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "refundAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "refundAmount" DECIMAL(10,2),
ADD COLUMN     "refundStatus" TEXT;
