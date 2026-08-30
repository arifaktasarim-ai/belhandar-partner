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
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [todaySales, monthSales, stocks, orderCounts, last7DaysSales, earningsAgg] = await Promise.all([
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
    prisma.sale.findMany({
      where: { partnerProfileId, status: 'COMPLETED', saleDate: { gte: sevenDaysAgo } },
      select: { saleDate: true, items: { select: { quantity: true } } },
    }),
    prisma.earning.aggregate({ where: { partnerProfileId }, _sum: { amountCents: true } }),
  ]);

  const pendingOrders = orderCounts.find((o) => o.status === 'PENDING_APPROVAL')?._count._all ?? 0;
  const preparingOrders = orderCounts
    .filter((o) => ['APPROVED', 'IN_PRODUCTION_QUEUE', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY'].includes(o.status))
    .reduce((sum, o) => sum + o._count._all, 0);
  const shippedOrders = orderCounts.find((o) => o.status === 'SHIPPED')?._count._all ?? 0;

  // Son 7 gunu gunluk toplam adet olarak grupla
  const dayBuckets: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    dayBuckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const sale of last7DaysSales) {
    const key = sale.saleDate.toISOString().slice(0, 10);
    if (key in dayBuckets) {
      dayBuckets[key] += sale.items.reduce((s, i) => s + i.quantity, 0);
    }
  }

  return {
    todaySalesUnits: todaySales._sum.quantity ?? 0,
    monthSalesUnits: monthSales._sum.quantity ?? 0,
    currentStock: stocks._sum.quantity ?? 0,
    totalEarnedCents: earningsAgg._sum.amountCents ?? 0,
    pendingOrders,
    preparingOrders,
    shippedOrders,
    last7Days: Object.entries(dayBuckets).map(([date, units]) => ({ date, units })),
  };
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
