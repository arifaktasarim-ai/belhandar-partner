import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';

export async function getPartnerProfileIdForUser(userId: string): Promise<string> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Paydas profili bulunamadi.');
  return profile.id;
}

function monthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return { start, end };
}

export async function getEarningsSummary(partnerProfileId: string) {
  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);

  const [totalAgg, thisMonthAgg, lastMonthAgg, paidAgg] = await Promise.all([
    prisma.earning.aggregate({ where: { partnerProfileId }, _sum: { amountCents: true } }),
    prisma.earning.aggregate({
      where: { partnerProfileId, createdAt: { gte: thisMonth.start, lt: thisMonth.end } },
      _sum: { amountCents: true },
    }),
    prisma.earning.aggregate({
      where: { partnerProfileId, createdAt: { gte: lastMonth.start, lt: lastMonth.end } },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { partnerProfileId, status: 'PAID' },
      _sum: { amountCents: true },
    }),
  ]);

  const totalEarnedCents = totalAgg._sum.amountCents ?? 0;
  const thisMonthCents = thisMonthAgg._sum.amountCents ?? 0;
  const lastMonthCents = lastMonthAgg._sum.amountCents ?? 0;
  const paidCents = paidAgg._sum.amountCents ?? 0;
  const pendingCents = totalEarnedCents - paidCents;

  const changePct = lastMonthCents !== 0
    ? Math.round(((thisMonthCents - lastMonthCents) / Math.abs(lastMonthCents)) * 1000) / 10
    : null;

  return {
    totalEarnedCents,
    thisMonthCents,
    lastMonthCents,
    changePct,
    paidCents,
    pendingCents,
  };
}

export async function getEarningsHistory(partnerProfileId: string, take = 50) {
  return prisma.earning.findMany({
    where: { partnerProfileId },
    include: { sale: { include: { items: { include: { variant: { include: { product: true } } } } } } },
    orderBy: { createdAt: 'desc' },
    take,
  });
}
