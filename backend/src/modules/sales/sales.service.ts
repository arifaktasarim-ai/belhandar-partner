import { Prisma, CommissionType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { tlToCents, calcPercentageProfitCents } from '../../utils/money';
import { sendPushToUsers } from '../../utils/push';
import { calculateFeeForAmount } from '../shipping-rates/shipping-rates.service';

export async function getPartnerProfileIdForUser(userId: string): Promise<string> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Paydas profili bulunamadi.');
  return profile.id;
}

async function resolveCommissionPlan(partnerProfileId: string, tx: Prisma.TransactionClient) {
  const profile = await tx.partnerProfile.findUnique({
    where: { id: partnerProfileId },
    include: { commissionPlan: true },
  });
  if (profile?.commissionPlan && profile.commissionPlan.isActive) {
    return profile.commissionPlan;
  }
  // Paydasa ozel/gecerli plan yoksa sistem varsayilanini kullan (Settings)
  const settings = await tx.settings.findUnique({ where: { id: 'global' } });
  return {
    type: settings?.defaultCommissionType ?? CommissionType.PERCENTAGE,
    value: settings?.defaultCommissionValue ?? 2000,
  };
}

function computeUnitProfitCents(plan: { type: CommissionType; value: number }, unitPriceCents: number): number {
  return plan.type === CommissionType.PERCENTAGE
    ? calcPercentageProfitCents(unitPriceCents, plan.value)
    : plan.value; // FIXED: birim basina sabit kazanc (kurus)
}

export async function createSale(
  partnerProfileId: string,
  input: {
    channel: 'KARGO' | 'ELDEN';
    customerName?: string;
    customerPhone?: string;
    note?: string;
    saleDate?: string;
    shippingPaidByAdmin?: boolean;
    items: { variantId: string; quantity: number; unitPrice: number }[];
  },
  actorUserId: string,
) {
  const variantIds = input.items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds } } });
  if (variants.length !== variantIds.length) throw ApiError.badRequest('Bazi urunler bulunamadi.');
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  // Stok yeterliligini onceden kontrol et
  const stocks = await prisma.partnerStock.findMany({
    where: { partnerProfileId, variantId: { in: variantIds } },
  });
  const stockMap = new Map(stocks.map((s) => [s.variantId, s]));
  for (const item of input.items) {
    const current = stockMap.get(item.variantId)?.quantity ?? 0;
    if (current < item.quantity) {
      const variant = variantMap.get(item.variantId)!;
      throw ApiError.badRequest(`"${variant.sku}" icin yeterli stogunuz yok (mevcut: ${current}, istenen: ${item.quantity}).`);
    }
  }

  const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const plan = await resolveCommissionPlan(partnerProfileId, tx);

    let totalAmountCents = 0;
    let totalProfitCents = 0;
    const saleItemsData = input.items.map((item) => {
      const unitPriceCents = tlToCents(item.unitPrice);
      const unitProfitCents = computeUnitProfitCents(plan, unitPriceCents);
      totalAmountCents += unitPriceCents * item.quantity;
      totalProfitCents += unitProfitCents * item.quantity;
      return {
        variantId: item.variantId,
        quantity: item.quantity,
        unitPriceCents,
        unitProfitCents,
      };
    });

    // KARGO satislarda tutar araligina gore kargo ucreti otomatik hesaplanir (admin belirledigi tarifeye gore)
    const shippingFeeCents = input.channel === 'KARGO' ? await calculateFeeForAmount(totalAmountCents) : null;

    const created = await tx.sale.create({
      data: {
        partnerProfileId,
        channel: input.channel,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        note: input.note,
        saleDate: input.saleDate ? new Date(input.saleDate) : new Date(),
        totalAmountCents,
        totalProfitCents,
        shippingFeeCents,
        shippingPaidByAdmin: input.channel === 'KARGO' ? !!input.shippingPaidByAdmin : false,
        items: { create: saleItemsData },
      },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });

    // Stok dus + hareket kaydi
    for (const item of input.items) {
      await tx.partnerStock.update({
        where: { partnerProfileId_variantId: { partnerProfileId, variantId: item.variantId } },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          partnerProfileId,
          variantId: item.variantId,
          type: 'SALE',
          quantityChange: -item.quantity,
          reason: `Satis (${created.id})`,
          relatedSaleId: created.id,
          actorUserId,
        },
      });
    }

    // Kazanc kaydi
    await tx.earning.create({
      data: {
        partnerProfileId,
        saleId: created.id,
        amountCents: totalProfitCents,
        description: `Satis kazanci (${created.id})`,
      },
    });

    // Adminlere bildirim (yeni satis)
    const admins = await tx.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
      select: { id: true },
    });
    const partnerUser = await tx.partnerProfile.findUnique({
      where: { id: partnerProfileId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const productNames = created.items.map((i) => i.variant.product.name).join(', ');
    if (admins.length > 0 && partnerUser) {
      await tx.notification.createMany({
        data: admins.map((a: { id: string }) => ({
          userId: a.id,
          type: 'GENERIC' as const,
          title: 'Yeni satış',
          message: `${partnerUser.user.firstName} ${partnerUser.user.lastName}, ${productNames} sattı.`,
        })),
      });
    }

    return { created, adminIds: admins.map((a: { id: string }) => a.id), partnerUser, productNames };
  });

  await sendPushToUsers(sale.adminIds, {
    title: 'Yeni satış',
    body: sale.partnerUser
      ? `${sale.partnerUser.user.firstName} ${sale.partnerUser.user.lastName}, ${sale.productNames} sattı.`
      : 'Yeni bir satış yapıldı.',
    url: '/#/admin/sales',
  });

  return sale.created;
}

export async function listSales(filter: { partnerProfileId?: string; take?: number; year?: number; month?: number }) {
  let saleDateFilter: { gte: Date; lt: Date } | undefined;
  if (filter.year) {
    const startMonth = filter.month ? filter.month - 1 : 0;
    const endMonth = filter.month ? filter.month : 12;
    saleDateFilter = {
      gte: new Date(filter.year, startMonth, 1),
      lt: new Date(filter.year, endMonth, 1),
    };
  }

  return prisma.sale.findMany({
    where: {
      partnerProfileId: filter.partnerProfileId,
      saleDate: saleDateFilter,
    },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { saleDate: 'desc' },
    take: filter.take,
  });
}

export async function voidSale(saleId: string, reason: string, actorUserId: string, partnerProfileId?: string) {
  const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { items: true } });
  if (!sale) throw ApiError.notFound('Satis bulunamadi.');
  if (partnerProfileId && sale.partnerProfileId !== partnerProfileId) {
    throw ApiError.forbidden('Bu satisa erisim yetkiniz yok.');
  }
  if (sale.status === 'VOID') throw ApiError.badRequest('Bu satis zaten iptal edilmis.');

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.sale.update({
      where: { id: saleId },
      data: { status: 'VOID', voidedAt: new Date(), voidReason: reason },
    });

    // Stogu geri ekle + hareket kaydi
    for (const item of sale.items) {
      await tx.partnerStock.upsert({
        where: { partnerProfileId_variantId: { partnerProfileId: sale.partnerProfileId, variantId: item.variantId } },
        update: { quantity: { increment: item.quantity } },
        create: { partnerProfileId: sale.partnerProfileId, variantId: item.variantId, quantity: item.quantity },
      });
      await tx.stockMovement.create({
        data: {
          partnerProfileId: sale.partnerProfileId,
          variantId: item.variantId,
          type: 'CANCELLED_REVERT',
          quantityChange: item.quantity,
          reason: `Satis iptali: ${reason}`,
          relatedSaleId: sale.id,
          actorUserId,
        },
      });
    }

    // Kazanci ters kayitla notr hale getir (fiziksel silme yok - madde 27)
    await tx.earning.create({
      data: {
        partnerProfileId: sale.partnerProfileId,
        amountCents: -sale.totalProfitCents,
        description: `Satis iptali (${sale.id}): ${reason}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'SALE_VOIDED',
        entityType: 'Sale',
        entityId: sale.id,
        beforeData: { status: sale.status },
        afterData: { status: 'VOID', reason },
      },
    });

    return result;
  });

  return updated;
}
