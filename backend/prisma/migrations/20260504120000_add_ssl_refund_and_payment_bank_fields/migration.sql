-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "valId" TEXT,
ADD COLUMN     "bankTranId" TEXT;

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "bankTranId" TEXT,
ADD COLUMN     "sslRefundRefId" TEXT,
ADD COLUMN     "refundTransId" TEXT,
ADD COLUMN     "sslGatewayStatus" TEXT,
ADD COLUMN     "sslRawResponse" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundTransId_key" ON "Refund"("refundTransId");
