import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { hashPassword, verifyPassword } from '../../utils/password';

export async function updateProfile(userId: string, input: {
  phone?: string; avatarUrl?: string; city?: string; district?: string; address?: string; iban?: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { partnerProfile: true } });
  if (!user) throw ApiError.notFound('Kullanici bulunamadi.');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      partnerProfile: user.partnerProfile
        ? {
            update: {
              city: input.city,
              district: input.district,
              address: input.address,
              iban: input.iban ? input.iban.toUpperCase().replace(/\s/g, '') : undefined,
            },
          }
        : undefined,
    },
    include: { partnerProfile: true },
  });

  const { passwordHash: _omit, ...safe } = updated;
  return safe;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Kullanici bulunamadi.');

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest('Mevcut sifre hatali.');

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  // Sifre degisince tum refresh token'lari iptal et (guvenlik - diger oturumlar kapansin)
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
