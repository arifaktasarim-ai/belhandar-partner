import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { tlToCents } from '../../utils/money';

export async function getPartnerProfileIdForUser(userId: string): Promise<string> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Paydas profili bulunamadi.');
  return profile.id;
}

export async function createPayment(
  input: { partnerProfileId: string; amount: number; iban?: string; description?: string },
  actorUserId: string,
) {
  const partner = await prisma.partnerProfile.findUnique({ where: { id: input.partnerProfileId } });
  if (!partner) throw ApiError.notFound('Paydas bulunamadi.');

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        partnerProfileId: input.partnerProfileId,
        amountCents: tlToCents(input.amount),
        iban: input.iban || partner.iban,
        description: input.description,
        paidById: actorUserId,
        status: 'PAID',
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

export async function listPayments(filter: { partnerProfileId?: string }) {
  return prisma.payment.findMany({
    where: { partnerProfileId: filter.partnerProfileId },
    include: { partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { paidAt: 'desc' },
  });
}
