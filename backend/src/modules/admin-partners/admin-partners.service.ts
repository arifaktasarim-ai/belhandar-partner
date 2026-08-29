import { Role, UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { hashPassword } from '../../utils/password';

export async function getPartnerDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      partnerProfile: {
        include: {
          commissionPlan: true,
          _count: { select: { sales: true, orders: true, payments: true } },
        },
      },
      approvedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!user || user.role !== Role.PARTNER) throw ApiError.notFound('Paydas bulunamadi.');
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}

export async function createPartner(input: {
  firstName: string; lastName: string; username: string; email: string; phone: string;
  password: string; city: string; district: string; address: string; iban: string;
  taxId?: string; taxOffice?: string; status?: 'ACTIVE' | 'PENDING_APPROVAL';
}, actorUserId: string) {
  const existing = await prisma.user.findFirst({ where: { OR: [{ username: input.username }, { email: input.email }] } });
  if (existing) throw ApiError.conflict('Bu kullanici adi veya e-posta zaten kullaniliyor.');

  const passwordHash = await hashPassword(input.password);
  const status = input.status || 'ACTIVE';

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: Role.PARTNER,
        status,
        kvkkAcceptedAt: new Date(),
        approvedById: status === 'ACTIVE' ? actorUserId : null,
        approvedAt: status === 'ACTIVE' ? new Date() : null,
        partnerProfile: {
          create: {
            city: input.city,
            district: input.district,
            address: input.address,
            iban: input.iban.toUpperCase().replace(/\s/g, ''),
            taxId: input.taxId,
            taxOffice: input.taxOffice,
          },
        },
      },
      include: { partnerProfile: true },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PARTNER_CREATED_BY_ADMIN',
        entityType: 'User',
        entityId: user.id,
        afterData: { username: user.username },
      },
    });

    return user;
  });

  const { passwordHash: _omit, ...safe } = created;
  return safe;
}

export async function updatePartner(userId: string, input: {
  firstName?: string; lastName?: string; email?: string; phone?: string;
  city?: string; district?: string; address?: string; iban?: string; taxId?: string; taxOffice?: string;
}, actorUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { partnerProfile: true } });
  if (!user || user.role !== Role.PARTNER || !user.partnerProfile) throw ApiError.notFound('Paydas bulunamadi.');

  if (input.email && input.email !== user.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailTaken) throw ApiError.conflict('Bu e-posta zaten kullaniliyor.');
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        partnerProfile: {
          update: {
            city: input.city,
            district: input.district,
            address: input.address,
            iban: input.iban ? input.iban.toUpperCase().replace(/\s/g, '') : undefined,
            taxId: input.taxId,
            taxOffice: input.taxOffice,
          },
        },
      },
      include: { partnerProfile: true },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PARTNER_UPDATED_BY_ADMIN',
        entityType: 'User',
        entityId: userId,
        beforeData: { email: user.email, phone: user.phone },
        afterData: { email: result.email, phone: result.phone },
      },
    });

    return result;
  });

  const { passwordHash: _omit, ...safe } = updated;
  return safe;
}

export async function deletePartner(userId: string, actorUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { partnerProfile: true } });
  if (!user || user.role !== Role.PARTNER) throw ApiError.notFound('Paydas bulunamadi.');
  if (!user.partnerProfile) throw ApiError.notFound('Paydas profili bulunamadi.');

  const [saleCount, orderCount, paymentCount, earningCount] = await Promise.all([
    prisma.sale.count({ where: { partnerProfileId: user.partnerProfile.id } }),
    prisma.order.count({ where: { partnerProfileId: user.partnerProfile.id } }),
    prisma.payment.count({ where: { partnerProfileId: user.partnerProfile.id } }),
    prisma.earning.count({ where: { partnerProfileId: user.partnerProfile.id } }),
  ]);

  if (saleCount > 0 || orderCount > 0 || paymentCount > 0 || earningCount > 0) {
    throw ApiError.conflict(
      'Bu paydasin satis, siparis, odeme veya kazanc kaydi oldugu icin silinemez. ' +
      'Veri butunlugunu korumak amaciyla, kalici silme yerine "Askiya Al" secenegini kullanmanizi oneririz.',
    );
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Bu kullaniciya ait, silmeyi engelleyecek referanslari (kendi kaydi gibi) temizle
    await tx.auditLog.updateMany({ where: { actorUserId: userId }, data: { actorUserId: null } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.refreshToken.deleteMany({ where: { userId } });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PARTNER_DELETED',
        entityType: 'User',
        entityId: userId,
        beforeData: { username: user.username, email: user.email },
      },
    });

    await tx.user.delete({ where: { id: userId } }); // partnerProfile onDelete:Cascade ile birlikte silinir
  });
}

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
