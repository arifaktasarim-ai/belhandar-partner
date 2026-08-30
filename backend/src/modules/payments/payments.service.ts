import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { tlToCents } from '../../utils/money';
import { sendPushToUsers, sendPushToUser } from '../../utils/push';

export async function getPartnerProfileIdForUser(userId: string): Promise<string> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Paydas profili bulunamadi.');
  return profile.id;
}

// --- Admin: daha once elden/havale ile yapilmis bir odemeyi sisteme kaydeder (dogrudan PAID) ---
export async function createPayment(
  input: { partnerProfileId: string; amount: number; iban?: string; description?: string },
  actorUserId: string,
) {
  const partner = await prisma.partnerProfile.findUnique({ where: { id: input.partnerProfileId } });
  if (!partner) throw ApiError.notFound('Paydas bulunamadi.');

  const payment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.payment.create({
      data: {
        partnerProfileId: input.partnerProfileId,
        amountCents: tlToCents(input.amount),
        iban: input.iban || partner.iban,
        description: input.description,
        paidById: actorUserId,
        paidAt: new Date(),
        status: 'PAID',
        requestedByPartner: false,
      },
    });

    await tx.notification.create({
      data: {
        userId: partner.userId,
        type: 'PAYMENT_MADE',
        title: 'Odemeniz gerceklesti',
        message: `${(created.amountCents / 100).toLocaleString('tr-TR')} TL tutarinda odemeniz hesabiniza yansitildi.`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PAYMENT_RECORDED',
        entityType: 'Payment',
        entityId: created.id,
        afterData: { amountCents: created.amountCents, partnerProfileId: input.partnerProfileId },
      },
    });

    return created;
  });

  return payment;
}

// --- Paydas: kazancindan odeme talep eder (PENDING olusturur, admin onayi bekler) ---
export async function requestPayment(partnerProfileId: string, amount: number) {
  const partner = await prisma.partnerProfile.findUnique({ where: { id: partnerProfileId } });
  if (!partner) throw ApiError.notFound('Paydas profili bulunamadi.');

  const amountCents = tlToCents(amount);
  if (amountCents <= 0) throw ApiError.badRequest('Talep tutari pozitif olmalidir.');

  const [earnedAgg, paidAgg, pendingRequestAgg] = await Promise.all([
    prisma.earning.aggregate({ where: { partnerProfileId }, _sum: { amountCents: true } }),
    prisma.payment.aggregate({ where: { partnerProfileId, status: 'PAID' }, _sum: { amountCents: true } }),
    prisma.payment.aggregate({ where: { partnerProfileId, status: 'PENDING' }, _sum: { amountCents: true } }),
  ]);

  const totalEarned = earnedAgg._sum.amountCents ?? 0;
  const totalPaid = paidAgg._sum.amountCents ?? 0;
  const alreadyRequested = pendingRequestAgg._sum.amountCents ?? 0;
  const availableToRequest = totalEarned - totalPaid - alreadyRequested;

  if (amountCents > availableToRequest) {
    throw ApiError.badRequest(
      `Talep edebileceginiz maksimum tutar ${(availableToRequest / 100).toLocaleString('tr-TR')} TL. ` +
      'Bu tutari asan bir talep olusturamazsiniz.',
    );
  }

  const payment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.payment.create({
      data: {
        partnerProfileId,
        amountCents,
        iban: partner.iban,
        status: 'PENDING',
        requestedByPartner: true,
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
          title: 'Yeni odeme talebi',
          message: `Bir paydas ${(amountCents / 100).toLocaleString('tr-TR')} TL tutarinda odeme talep etti.`,
        })),
      });
    }

    return { created, adminIds: admins.map((a: { id: string }) => a.id) };
  });

  await sendPushToUsers(payment.adminIds, {
    title: 'Yeni ödeme talebi',
    body: `Bir paydaş ${(amountCents / 100).toLocaleString('tr-TR')} TL tutarında ödeme talep etti.`,
    url: '/#/admin/payments',
  });

  return payment.created;
}

export async function approvePaymentRequest(paymentId: string, actorUserId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { partnerProfile: true } });
  if (!payment) throw ApiError.notFound('Odeme talebi bulunamadi.');
  if (payment.status !== 'PENDING') throw ApiError.badRequest('Bu talep zaten islenmis.');

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', paidById: actorUserId, paidAt: new Date() },
    });

    await tx.notification.create({
      data: {
        userId: payment.partnerProfile.userId,
        type: 'PAYMENT_MADE',
        title: 'Odeme talebiniz onaylandi',
        message: `${(payment.amountCents / 100).toLocaleString('tr-TR')} TL tutarindaki odemeniz gerceklesti.`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PAYMENT_REQUEST_APPROVED',
        entityType: 'Payment',
        entityId: paymentId,
        afterData: { amountCents: payment.amountCents },
      },
    });

    return result;
  });

  await sendPushToUser(payment.partnerProfile.userId, {
    title: 'Ödeme talebiniz onaylandı',
    body: `${(payment.amountCents / 100).toLocaleString('tr-TR')} TL tutarındaki ödemeniz gerçekleşti.`,
    url: '/#/partner/dashboard',
  });

  return updated;
}

export async function rejectPaymentRequest(paymentId: string, actorUserId: string, reason?: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { partnerProfile: true } });
  if (!payment) throw ApiError.notFound('Odeme talebi bulunamadi.');
  if (payment.status !== 'PENDING') throw ApiError.badRequest('Bu talep zaten islenmis.');

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'CANCELLED', rejectionReason: reason },
    });

    await tx.notification.create({
      data: {
        userId: payment.partnerProfile.userId,
        type: 'GENERIC',
        title: 'Odeme talebiniz reddedildi',
        message: reason || 'Odeme talebiniz yonetici tarafindan reddedildi.',
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PAYMENT_REQUEST_REJECTED',
        entityType: 'Payment',
        entityId: paymentId,
        afterData: { reason },
      },
    });

    return result;
  });

  await sendPushToUser(payment.partnerProfile.userId, {
    title: 'Ödeme talebiniz reddedildi',
    body: reason || 'Ödeme talebiniz yönetici tarafından reddedildi.',
    url: '/#/partner/dashboard',
  });

  return updated;
}

export async function listPayments(filter: { partnerProfileId?: string; status?: 'PENDING' | 'PAID' | 'CANCELLED' }) {
  return prisma.payment.findMany({
    where: { partnerProfileId: filter.partnerProfileId, status: filter.status },
    include: { partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
}
