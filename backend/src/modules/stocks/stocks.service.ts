import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';

export async function getPartnerStocks(partnerProfileId: string) {
  return prisma.partnerStock.findMany({
    where: { partnerProfileId },
    include: { variant: { include: { product: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getPartnerStockMovements(partnerProfileId: string, take = 50) {
  return prisma.stockMovement.findMany({
    where: { partnerProfileId },
    include: { variant: { include: { product: true } }, actor: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export async function getPartnerProfileIdForUser(userId: string): Promise<string> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Paydas profili bulunamadi.');
  return profile.id;
}

// Admin: herhangi bir paydasin stogunu goruntuleme
export async function getStocksForPartnerAdmin(partnerProfileId: string) {
  const profile = await prisma.partnerProfile.findUnique({ where: { id: partnerProfileId } });
  if (!profile) throw ApiError.notFound('Paydas bulunamadi.');
  return getPartnerStocks(partnerProfileId);
}
