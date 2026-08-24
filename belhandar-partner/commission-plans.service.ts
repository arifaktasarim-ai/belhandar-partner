import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import { tlToCents, centsToTl } from '../../utils/money';

// PERCENTAGE plan: DB'de value = yuzde*100 (orn %20.00 -> 2000)
// FIXED plan: DB'de value = kurus (TL tutar * 100)
function toStoredValue(type: 'PERCENTAGE' | 'FIXED', value: number): number {
  return type === 'PERCENTAGE' ? Math.round(value * 100) : tlToCents(value);
}

function toDisplayValue(type: string, value: number): number {
  return type === 'PERCENTAGE' ? value / 100 : centsToTl(value);
}

function serialize(plan: any) {
  return { ...plan, displayValue: toDisplayValue(plan.type, plan.value) };
}

export async function listPlans() {
  const plans = await prisma.commissionPlan.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { partners: true } } },
  });
  return plans.map(serialize);
}

export async function createPlan(input: { name: string; type: 'PERCENTAGE' | 'FIXED'; value: number; isDefault?: boolean }, actorUserId: string) {
  const existing = await prisma.commissionPlan.findUnique({ where: { name: input.name } });
  if (existing) throw ApiError.conflict('Bu isimde bir komisyon plani zaten var.');

  const plan = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (input.isDefault) {
      await tx.commissionPlan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    const created = await tx.commissionPlan.create({
      data: {
        name: input.name,
        type: input.type,
        value: toStoredValue(input.type, input.value),
        isDefault: !!input.isDefault,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'COMMISSION_PLAN_CREATED',
        entityType: 'CommissionPlan',
        entityId: created.id,
        afterData: { name: created.name, type: created.type, value: created.value },
      },
    });
    return created;
  });

  return serialize(plan);
}

export async function updatePlan(id: string, input: { name?: string; value?: number; isDefault?: boolean; isActive?: boolean }, actorUserId: string) {
  const existing = await prisma.commissionPlan.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Komisyon plani bulunamadi.');

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (input.isDefault) {
      await tx.commissionPlan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    const result = await tx.commissionPlan.update({
      where: { id },
      data: {
        name: input.name,
        value: input.value !== undefined ? toStoredValue(existing.type, input.value) : undefined,
        isDefault: input.isDefault,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'COMMISSION_PLAN_UPDATED',
        entityType: 'CommissionPlan',
        entityId: id,
        beforeData: { name: existing.name, value: existing.value, isActive: existing.isActive },
        afterData: { name: result.name, value: result.value, isActive: result.isActive },
      },
    });
    return result;
  });

  return serialize(updated);
}
