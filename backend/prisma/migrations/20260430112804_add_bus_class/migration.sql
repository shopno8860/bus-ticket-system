-- CreateEnum
CREATE TYPE "BusClass" AS ENUM ('BUSINESS', 'ECONOMY');

-- AlterTable
ALTER TABLE "Bus" ADD COLUMN     "busClass" "BusClass" NOT NULL DEFAULT 'ECONOMY';
