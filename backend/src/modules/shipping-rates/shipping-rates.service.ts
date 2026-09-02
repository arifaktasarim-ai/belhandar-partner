import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { tlToCents } from '../../utils/money';

export async function listRates(includeInactive: boolean) {
  return prisma.shippingRate.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { minAmountCents: 'asc' },
  });
}

export async function createRate(input: { minAmount: number; maxAmount?: number; fee: number }, actorUserId: string) {
  const created = await prisma.$transaction(async (tx) => {
    const rate = await tx.shippingRate.create({
      data: {
        minAmountCents: tlToCents(input.minAmount),
        maxAmountCents: input.maxAmount !== undefined ? tlToCents(input.maxAmount) : null,
        feeCents: tlToCents(input.fee),
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'SHIPPING_RATE_CREATED',
        entityType: 'ShippingRate',
        entityId: rate.id,
        afterData: { minAmountCents: rate.minAmountCents, feeCents: rate.feeCents },
      },
    });
    return rate;
  });
  return created;
}

export async function updateRate(id: string, input: {
  minAmount?: number; maxAmount?: number | null; fee?: number; isActive?: boolean;
}, actorUserId: string) {
  const existing = await prisma.shippingRate.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Kargo ucret araligi bulunamadi.');

  const updated = await prisma.$transaction(async (tx) => {
    const rate = await tx.shippingRate.update({
      where: { id },
      data: {
        minAmountCents: input.minAmount !== undefined ? tlToCents(input.minAmount) : undefined,
        maxAmountCents: input.maxAmount === null ? null : input.maxAmount !== undefined ? tlToCents(input.maxAmount) : undefined,
        feeCents: input.fee !== undefined ? tlToCents(input.fee) : undefined,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'SHIPPING_RATE_UPDATED',
        entityType: 'ShippingRate',
        entityId: id,
        beforeData: { minAmountCents: existing.minAmountCents, feeCents: existing.feeCents },
        afterData: { minAmountCents: rate.minAmountCents, feeCents: rate.feeCents },
      },
    });
    return rate;
  });
  return updated;
}

export async function deleteRate(id: string, actorUserId: string) {
  const existing = await prisma.shippingRate.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Kargo ucret araligi bulunamadi.');

  await prisma.$transaction(async (tx) => {
    await tx.shippingRate.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'SHIPPING_RATE_DELETED',
        entityType: 'ShippingRate',
        entityId: id,
        beforeData: { minAmountCents: existing.minAmountCents, feeCents: existing.feeCents },
      },
    });
  });
}

// Bir satis tutarina karsilik gelen kargo ucretini bulur (aktif araliklardan en uygun olani).
// Eslesme yoksa 0 doner (henuz tarife tanimlanmamis demektir).
export async function calculateFeeForAmount(amountCents: number): Promise<number> {
  const rates = await prisma.shippingRate.findMany({
    where: {
      isActive: true,
      minAmountCents: { lte: amountCents },
      OR: [{ maxAmountCents: null }, { maxAmountCents: { gte: amountCents } }],
    },
    orderBy: { minAmountCents: 'desc' },
    take: 1,
  });
  return rates[0]?.feeCents ?? 0;
}
