import { Role, UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { hashPassword, verifyPassword, hashToken, compareToken } from '../../utils/password';
import { signAccessToken, generateOpaqueToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { RegisterInput, LoginInput } from './auth.validation';

const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 gun (env ile hizalanabilir)

function msFromDuration(): number {
  // JWT_REFRESH_EXPIRES_IN "30d" formatinda; basit parse (gun bazli varsayim).
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)d$/);
  if (match) return Number(match[1]) * 24 * 60 * 60 * 1000;
  return REFRESH_TOKEN_TTL_MS;
}

export async function registerPartner(input: RegisterInput, createdByIp?: string) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: input.username }, { email: input.email }] },
  });

  if (existing) {
    throw ApiError.conflict('Bu kullanici adi veya e-posta zaten kullaniliyor.');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const createdUser = await tx.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: Role.PARTNER,
        status: UserStatus.PENDING_APPROVAL,
        avatarUrl: input.avatarUrl,
        kvkkAcceptedAt: new Date(),
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
        actorUserId: createdUser.id,
        action: 'PARTNER_REGISTERED',
        entityType: 'User',
        entityId: createdUser.id,
        afterData: { username: createdUser.username, email: createdUser.email },
        ipAddress: createdByIp,
      },
    });

    // Adminlere bildirim icin: tum ADMIN/SUPER_ADMIN kullanicilarina Notification olustur
    const admins = await tx.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((a: { id: string }) => ({
          userId: a.id,
          type: 'NEW_PARTNER_REGISTERED',
          title: 'Yeni paydas kaydi',
          message: `${createdUser.firstName} ${createdUser.lastName} onay bekliyor.`,
        })),
      });
    }

    return createdUser;
  });

  const { passwordHash: _omit, ...safeUser } = user;
  return safeUser;
}

export async function login(input: LoginInput, createdByIp?: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: input.identifier }, { email: input.identifier }],
    },
    include: { partnerProfile: true },
  });

  if (!user) {
    throw ApiError.unauthorized('Kullanici adi/e-posta veya sifre hatali.');
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    throw ApiError.unauthorized('Kullanici adi/e-posta veya sifre hatali.');
  }

  if (user.status === UserStatus.PENDING_APPROVAL) {
    throw ApiError.forbidden('Hesabiniz henuz yonetici onayi bekliyor.');
  }
  if (user.status === UserStatus.REJECTED) {
    throw ApiError.forbidden('Kayit basvurunuz reddedildi. Detay icin destek ile iletisime gecin.');
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw ApiError.forbidden('Hesabiniz askiya alinmis durumda. Destek ile iletisime gecin.');
  }

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    partnerProfileId: user.partnerProfile?.id ?? null,
  });

  const refreshTokenPlain = generateOpaqueToken();
  const refreshTokenHash = await hashToken(refreshTokenPlain);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + msFromDuration()),
      createdByIp,
    },
  });

  const { passwordHash: _omit, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken: refreshTokenPlain };
}

export async function refreshTokens(refreshTokenPlain: string, createdByIp?: string) {
  // NOT: tokenHash bcrypt ile tutuldugundan direkt WHERE ile aranamaz;
  // aktif (revoke edilmemis, suresi gecmemis) tum tokenlar taranarak eslesme bulunur.
  // Prod olceginde bu, kullanici basina tutulan aktif refresh token sayisini dusuk
  // tutarak (login sirasinda eski suresi gecmis tokenlarin temizlenmesiyle) verimli tutulur.
  const candidates = await prisma.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: { include: { partnerProfile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  let matched: (typeof candidates)[number] | undefined;
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await compareToken(refreshTokenPlain, candidate.tokenHash)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    throw ApiError.unauthorized('Oturum gecersiz. Lutfen tekrar giris yapin.');
  }

  const user = matched.user;
  if (user.status !== UserStatus.ACTIVE) {
    throw ApiError.forbidden('Hesabiniz aktif degil.');
  }

  const newRefreshPlain = generateOpaqueToken();
  const newRefreshHash = await hashToken(newRefreshPlain);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date(), replacedByTokenHash: newRefreshHash },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshHash,
        expiresAt: new Date(Date.now() + msFromDuration()),
        createdByIp,
      },
    }),
  ]);

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    partnerProfileId: user.partnerProfile?.id ?? null,
  });

  return { accessToken, refreshToken: newRefreshPlain };
}

export async function logout(refreshTokenPlain: string) {
  const candidates = await prisma.refreshToken.findMany({
    where: { revokedAt: null },
    take: 500,
    orderBy: { createdAt: 'desc' },
  });

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await compareToken(refreshTokenPlain, candidate.tokenHash)) {
      await prisma.refreshToken.update({
        where: { id: candidate.id },
        data: { revokedAt: new Date() },
      });
      return;
    }
  }
  // Token bulunamasa da hata firlatmiyoruz; logout idempotent kabul edilir.
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { partnerProfile: true },
  });
  if (!user) throw ApiError.notFound('Kullanici bulunamadi.');
  const { passwordHash: _omit, ...safeUser } = user;
  return safeUser;
}
