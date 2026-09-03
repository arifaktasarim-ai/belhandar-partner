import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { hashPassword } from '../../utils/password';

export async function listStaff() {
  const users = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
    orderBy: { createdAt: 'asc' },
  });
  return users.map(({ passwordHash: _omit, ...safe }) => safe);
}

export async function createStaff(input: {
  firstName: string; lastName: string; username: string; email: string; phone: string; password: string;
}, actorUserId: string) {
  const existing = await prisma.user.findFirst({ where: { OR: [{ username: input.username }, { email: input.email }] } });
  if (existing) throw ApiError.conflict('Bu kullanici adi veya e-posta zaten kullaniliyor.');

  const passwordHash = await hashPassword(input.password);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        kvkkAcceptedAt: new Date(),
        approvedById: actorUserId,
        approvedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'ADMIN_STAFF_CREATED',
        entityType: 'User',
        entityId: user.id,
        afterData: { username: user.username, role: user.role },
      },
    });

    return user;
  });

  const { passwordHash: _omit, ...safe } = created;
  return safe;
}

export async function updateStaffStatus(userId: string, action: 'suspend' | 'activate', actorUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    throw ApiError.notFound('Yonetici hesabi bulunamadi.');
  }
  if (user.role === Role.SUPER_ADMIN) {
    throw ApiError.forbidden('Super Admin hesabinin durumu buradan degistirilemez.');
  }
  if (user.id === actorUserId) {
    throw ApiError.badRequest('Kendi hesabinizi askiya alamazsiniz.');
  }

  const newStatus = action === 'suspend' ? UserStatus.SUSPENDED : UserStatus.ACTIVE;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({ where: { id: userId }, data: { status: newStatus } });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: `ADMIN_STAFF_${action.toUpperCase()}`,
        entityType: 'User',
        entityId: userId,
        beforeData: { status: user.status },
        afterData: { status: newStatus },
      },
    });
    return result;
  });

  const { passwordHash: _omit, ...safe } = updated;
  return safe;
}
