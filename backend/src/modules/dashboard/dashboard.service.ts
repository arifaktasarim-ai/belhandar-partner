import { prisma } from '../../lib/prisma';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getPartnerDashboard(partnerProfileId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const [todaySales, monthSales, stocks, orderCounts, last30DaysSales, earningsAgg, yearAgg] = await Promise.all([
    prisma.saleItem.aggregate({
      where: { sale: { partnerProfileId, status: 'COMPLETED', saleDate: { gte: todayStart } } },
      _sum: { quantity: true },
    }),
    prisma.saleItem.aggregate({
      where: { sale: { partnerProfileId, status: 'COMPLETED', saleDate: { gte: monthStart } } },
      _sum: { quantity: true },
    }),
    prisma.partnerStock.aggregate({
      where: { partnerProfileId },
      _sum: { quantity: true },
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { partnerProfileId },
      _count: { _all: true },
    }),
    // 30 gunluk veri tek seferde cekilir; 7 gunluk gorunum bunun son 7 gunu kullanilarak turetilir
    prisma.sale.findMany({
      where: { partnerProfileId, status: 'COMPLETED', saleDate: { gte: thirtyDaysAgo } },
      select: {
        saleDate: true,
        totalAmountCents: true,
        totalProfitCents: true,
        items: { select: { quantity: true } },
      },
    }),
    prisma.earning.aggregate({ where: { partnerProfileId }, _sum: { amountCents: true } }),
    prisma.sale.aggregate({
      where: { partnerProfileId, status: 'COMPLETED', saleDate: { gte: yearStart } },
      _sum: { totalAmountCents: true, totalProfitCents: true },
      _count: { _all: true },
    }),
  ]);

  const pendingOrders = orderCounts.find((o) => o.status === 'PENDING_APPROVAL')?._count._all ?? 0;
  const preparingOrders = orderCounts
    .filter((o) => ['APPROVED', 'IN_PRODUCTION_QUEUE', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY'].includes(o.status))
    .reduce((sum, o) => sum + o._count._all, 0);
  const shippedOrders = orderCounts.find((o) => o.status === 'SHIPPED')?._count._all ?? 0;

  // Son 30 gunu gunluk toplam adet/ciro/kar olarak grupla
  type DayBucket = { units: number; revenueCents: number; profitCents: number };
  const dayBuckets: Record<string, DayBucket> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dayBuckets[d.toISOString().slice(0, 10)] = { units: 0, revenueCents: 0, profitCents: 0 };
  }
  for (const sale of last30DaysSales) {
    const key = sale.saleDate.toISOString().slice(0, 10);
    if (key in dayBuckets) {
      dayBuckets[key].units += sale.items.reduce((s, i) => s + i.quantity, 0);
      dayBuckets[key].revenueCents += sale.totalAmountCents;
      dayBuckets[key].profitCents += sale.totalProfitCents;
    }
  }

  const last30Days = Object.entries(dayBuckets).map(([date, v]) => ({ date, ...v }));
  const last7Days = last30Days.slice(-7);

  return {
    todaySalesUnits: todaySales._sum.quantity ?? 0,
    monthSalesUnits: monthSales._sum.quantity ?? 0,
    currentStock: stocks._sum.quantity ?? 0,
    totalEarnedCents: earningsAgg._sum.amountCents ?? 0,
    pendingOrders,
    preparingOrders,
    shippedOrders,
    last7Days,
    last30Days,
    yearToDate: {
      salesCount: yearAgg._count._all ?? 0,
      revenueCents: yearAgg._sum.totalAmountCents ?? 0,
      profitCents: yearAgg._sum.totalProfitCents ?? 0,
    },
  };
}

export async function getAdminBadgeCounts() {
  const [pendingPartners, pendingOrders, pendingPayments, pendingReturns, pendingRefunds] = await Promise.all([
    prisma.user.count({ where: { role: 'PARTNER', status: 'PENDING_APPROVAL' } }),
    prisma.order.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.return.count({ where: { status: 'PENDING' } }),
    prisma.return.count({ where: { status: 'APPROVED', refundStatus: 'PENDING' } }),
  ]);
  return { pendingPartners, pendingOrders, pendingPayments, pendingReturns, pendingRefunds };
}

export async function getAdminDashboard() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const [
    partnerCounts, totalProducts, totalCentralStock, todaySales, monthSales,
    pendingPaymentRequests, orderCounts,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['status'], where: { role: 'PARTNER' }, _count: { _all: true } }),
    prisma.productVariant.count({ where: { isActive: true } }),
    prisma.productVariant.aggregate({ _sum: { centralStock: true } }),
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: todayStart } },
      _sum: { totalAmountCents: true },
    }),
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', saleDate: { gte: monthStart } },
      _sum: { totalAmountCents: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'PENDING' },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const activePartners = partnerCounts.find((p) => p.status === 'ACTIVE')?._count._all ?? 0;
  const pendingPartners = partnerCounts.find((p) => p.status === 'PENDING_APPROVAL')?._count._all ?? 0;
  const totalPartners = partnerCounts.reduce((s, p) => s + p._count._all, 0);

  const pendingOrders = orderCounts.find((o) => o.status === 'PENDING_APPROVAL')?._count._all ?? 0;
  const inProductionOrders = orderCounts
    .filter((o) => ['IN_PRODUCTION_QUEUE', 'IN_PRODUCTION', 'QUALITY_CHECK'].includes(o.status))
    .reduce((sum, o) => sum + o._count._all, 0);
  const shippedOrders = orderCounts.find((o) => o.status === 'SHIPPED')?._count._all ?? 0;

  return {
    totalPartners,
    activePartners,
    pendingPartners,
    totalProducts,
    totalCentralStock: totalCentralStock._sum.centralStock ?? 0,
    todaySalesRevenueCents: todaySales._sum.totalAmountCents ?? 0,
    monthSalesRevenueCents: monthSales._sum.totalAmountCents ?? 0,
    pendingPaymentRequestsCents: pendingPaymentRequests._sum.amountCents ?? 0,
    pendingPaymentRequestsCount: pendingPaymentRequests._count._all ?? 0,
    pendingOrders,
    inProductionOrders,
    shippedOrders,
  };
}
