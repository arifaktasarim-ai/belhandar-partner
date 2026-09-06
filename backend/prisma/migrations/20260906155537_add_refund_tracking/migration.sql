-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "returns" ADD COLUMN     "refundIban" TEXT,
ADD COLUMN     "refundNote" TEXT,
ADD COLUMN     "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "refundedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_refundedByUserId_fkey" FOREIGN KEY ("refundedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
