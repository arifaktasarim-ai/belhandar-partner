-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "shippingFeeCents" INTEGER,
ADD COLUMN     "shippingPaidByAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" TEXT NOT NULL,
    "minAmountCents" INTEGER NOT NULL,
    "maxAmountCents" INTEGER,
    "feeCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);
