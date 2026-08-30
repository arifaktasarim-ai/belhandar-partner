-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_paidById_fkey";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestedByPartner" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "paidById" DROP NOT NULL,
ALTER COLUMN "paidAt" DROP NOT NULL,
ALTER COLUMN "paidAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
