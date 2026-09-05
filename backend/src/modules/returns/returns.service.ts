import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { sendPushToUsers, sendPushToUser } from '../../utils/push';

export async function getPartnerProfileIdForUser(userId: string): Promise<string> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Paydas profili bulunamadi.');
  return profile.id;
}

export async function createReturn(
  partnerProfileId: string,
  input: { saleId: string; saleItemId: string; quantity: number; reason: string },
  actorUserId: string,
) {
  const saleItem = await prisma.saleItem.findUnique({
    where: { id: input.saleItemId },
    include: { sale: true, variant: { include: { product: true } } },
  });

  if (!saleItem || saleItem.saleId !== input.saleId) {
    throw ApiError.notFound('Satis kalemi bulunamadi.');
  }
  if (saleItem.sale.partnerProfileId !== partnerProfileId) {
    throw ApiError.forbidden('Bu satisa erisim yetkiniz yok.');
  }
  if (saleItem.sale.status === 'VOID') {
    throw ApiError.badRequest('Iptal edilmis bir satis icin iade talep edilemez.');
  }

  // Daha once bu kalem icin onaylanmis/bekleyen iade adedini dus, asim kontrolu yap
  const existingReturns = await prisma.return.findMany({
    where: { saleItemId: input.saleItemId, status: { in: ['PENDING', 'APPROVED'] } },
  });
  const alreadyRequested = existingReturns.reduce((sum, r) => sum + r.quantity, 0);
  if (alreadyRequested + input.quantity > saleItem.quantity) {
    throw ApiError.badRequest(
      `Bu kalem icin en fazla ${saleItem.quantity - alreadyRequested} adet daha iade talep edebilirsiniz.`,
    );
  }

  const refundAmountCents = saleItem.unitPriceCents * input.quantity;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.return.create({
      data: {
        saleId: input.saleId,
        saleItemId: input.saleItemId,
        partnerProfileId,
        quantity: input.quantity,
        reason: input.reason,
        refundAmountCents,
        requestedByUserId: actorUserId,
      },
    });

    const admins = await tx.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((a: { id: string }) => ({
          userId: a.id,
          type: 'GENERIC' as const,
          title: 'Yeni iade talebi',
          message: `${saleItem.variant.product.name} icin ${input.quantity} adet iade talebi olusturuldu.`,
        })),
      });
    }

    return { created, adminIds: admins.map((a: { id: string }) => a.id) };
  });

  await sendPushToUsers(result.adminIds, {
    title: 'Yeni iade talebi',
    body: `${saleItem.variant.product.name} icin ${input.quantity} adet iade talebi olusturuldu.`,
    url: '/#/admin/returns',
  });

  return result.created;
}

export async function listReturns(filter: { partnerProfileId?: string; status?: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
  return prisma.return.findMany({
    where: { partnerProfileId: filter.partnerProfileId, status: filter.status },
    include: {
      saleItem: { include: { variant: { include: { product: true } } } },
      sale: { select: { customerName: true, customerPhone: true, saleDate: true } },
      partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
      requestedBy: { select: { firstName: true, lastName: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function approveReturn(returnId: string, actorUserId: string) {
  const ret = await prisma.return.findUnique({
    where: { id: returnId },
    include: { saleItem: true, partnerProfile: true },
  });
  if (!ret) throw ApiError.notFound('Iade talebi bulunamadi.');
  if (ret.status !== 'PENDING') throw ApiError.badRequest('Bu talep zaten islenmis.');

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.return.update({
      where: { id: returnId },
      data: { status: 'APPROVED', reviewedByUserId: actorUserId, reviewedAt: new Date() },
    });

    // Stok geri eklenir (urun saglam kabul edilip yeniden satisa hazir varsayilir)
    await tx.partnerStock.upsert({
      where: { partnerProfileId_variantId: { partnerProfileId: ret.partnerProfileId, variantId: ret.saleItem.variantId } },
      update: { quantity: { increment: ret.quantity } },
      create: { partnerProfileId: ret.partnerProfileId, variantId: ret.saleItem.variantId, quantity: ret.quantity },
    });
    await tx.stockMovement.create({
      data: {
        partnerProfileId: ret.partnerProfileId,
        variantId: ret.saleItem.variantId,
        type: 'RETURN_IN',
        quantityChange: ret.quantity,
        reason: `Iade kabul edildi (${returnId})`,
        relatedSaleId: ret.saleId,
        actorUserId,
      },
    });

    // Kazanc duzeltmesi: iade edilen adetin kazanci geri alinir.
    // NOT: Earning.saleId benzersiz oldugu icin bu duzeltme kaydinda saleId bos birakilir.
    const profitToReverse = ret.saleItem.unitProfitCents * ret.quantity;
    await tx.earning.create({
      data: {
        partnerProfileId: ret.partnerProfileId,
        amountCents: -profitToReverse,
        description: `Iade nedeniyle kazanc duzeltmesi (${returnId})`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'RETURN_APPROVED',
        entityType: 'Return',
        entityId: returnId,
        afterData: { quantity: ret.quantity, refundAmountCents: ret.refundAmountCents },
      },
    });

    return result;
  });

  await sendPushToUser(ret.partnerProfile.userId, {
    title: 'İade talebiniz onaylandı',
    body: `${ret.quantity} adet ürün iadesi onaylandı, stoğunuza eklendi.`,
    url: '/#/partner/returns',
  });

  return updated;
}

export async function rejectReturn(returnId: string, actorUserId: string, reviewNote?: string) {
  const ret = await prisma.return.findUnique({ where: { id: returnId }, include: { partnerProfile: true } });
  if (!ret) throw ApiError.notFound('Iade talebi bulunamadi.');
  if (ret.status !== 'PENDING') throw ApiError.badRequest('Bu talep zaten islenmis.');

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.return.update({
      where: { id: returnId },
      data: { status: 'REJECTED', reviewedByUserId: actorUserId, reviewedAt: new Date(), reviewNote },
    });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'RETURN_REJECTED',
        entityType: 'Return',
        entityId: returnId,
        afterData: { reviewNote },
      },
    });
    return result;
  });

  await sendPushToUser(ret.partnerProfile.userId, {
    title: 'İade talebiniz reddedildi',
    body: reviewNote || 'İade talebiniz yönetici tarafından reddedildi.',
    url: '/#/partner/returns',
  });

  return updated;
}
