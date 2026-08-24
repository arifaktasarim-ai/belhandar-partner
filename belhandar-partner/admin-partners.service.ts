import { Role, UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';

export async function assignCommissionPlan(targetUserId: string, commissionPlanId: string, actorUserId: string) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, include: { partnerProfile: true } });
  if (!target || target.role !== Role.PARTNER || !target.partnerProfile) {
    throw ApiError.notFound('Paydas bulunamadi.');
  }

  const plan = await prisma.commissionPlan.findUnique({ where: { id: commissionPlanId } });
  if (!plan || !plan.isActive) {
    throw ApiError.badRequest('Gecerli bir komisyon plani seciniz.');
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.partnerProfile.update({
      where: { id: target.partnerProfile!.id },
      data: { commissionPlanId },
      include: { commissionPlan: true },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PARTNER_COMMISSION_CHANGED',
        entityType: 'PartnerProfile',
        entityId: target.partnerProfile!.id,
        beforeData: { commissionPlanId: target.partnerProfile!.commissionPlanId },
        afterData: { commissionPlanId },
      },
    });

    return result;
  });

  return updated;
}

export async function listPartners(status?: UserStatus, search?: string) {
  const where: Prisma.UserWhereInput = { role: Role.PARTNER };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { partnerProfile: { city: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return prisma.user.findMany({
    where,
    include: { partnerProfile: { include: { commissionPlan: true } } },
    orderBy: { createdAt: 'desc' },
    // Not: iban/passwordHash gibi hassas alanlar bilerek select ile kisitlanabilir;
    // burada partnerProfile.iban yalnizca admin/superadmin route'unda dondugu icin izinlidir (madde 25).
  });
}

type StatusAction = 'approve' | 'reject' | 'suspend' | 'activate';

const actionToStatus: Record<StatusAction, UserStatus> = {
  approve: UserStatus.ACTIVE,
  reject: UserStatus.REJECTED,
  suspend: UserStatus.SUSPENDED,
  activate: UserStatus.ACTIVE,
};

export async function changePartnerStatus(
  targetUserId: string,
  action: StatusAction,
  actorUserId: string,
  reason?: string,
) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || target.role !== Role.PARTNER) {
    throw ApiError.notFound('Paydas bulunamadi.');
  }

  const newStatus = actionToStatus[action];

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.user.update({
      where: { id: targetUserId },
      data: {
        status: newStatus,
        approvedById: action === 'approve' ? actorUserId : target.approvedById,
        approvedAt: action === 'approve' ? new Date() : target.approvedAt,
        rejectionReason: action === 'reject' ? reason ?? null : target.rejectionReason,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: `PARTNER_STATUS_${action.toUpperCase()}`,
        entityType: 'User',
        entityId: targetUserId,
        beforeData: { status: target.status },
        afterData: { status: newStatus },
      },
    });

    await tx.notification.create({
      data: {
        userId: targetUserId,
        type: 'GENERIC',
        title: 'Hesap durumunuz guncellendi',
        message:
          action === 'approve'
            ? 'Hesabiniz onaylandi, artik sisteme giris yapabilirsiniz.'
            : action === 'reject'
              ? `Kayit basvurunuz reddedildi. ${reason ?? ''}`.trim()
              : action === 'suspend'
                ? 'Hesabiniz askiya alindi.'
                : 'Hesabiniz yeniden aktif edildi.',
      },
    });

    return result;
  });

  const { passwordHash: _omit, ...safe } = updated;
  return safe;
}
