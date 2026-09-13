import { prisma } from '../../lib/prisma';
import { centsToTl } from '../../utils/money';
import { toCsv } from '../../utils/csv';
import { listCustomers } from '../customers/customers.service';

export async function buildSalesReportCsv(): Promise<string> {
  const sales = await prisma.sale.findMany({
    include: {
      partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { saleDate: 'desc' },
  });

  const rows: (string | number)[][] = [];
  for (const sale of sales) {
    for (const item of sale.items) {
      rows.push([
        sale.saleDate.toISOString().slice(0, 10),
        `${sale.partnerProfile.user.firstName} ${sale.partnerProfile.user.lastName}`,
        `${item.variant.product.name} (${item.variant.volumeMl}ml)`,
        item.quantity,
        centsToTl(item.unitPriceCents).toFixed(2),
        centsToTl(item.unitProfitCents * item.quantity).toFixed(2),
        sale.channel,
        sale.status,
      ]);
    }
  }

  return toCsv(
    ['Tarih', 'Paydas', 'Urun', 'Adet', 'Birim Fiyat (TL)', 'Kazanc (TL)', 'Kanal', 'Durum'],
    rows,
  );
}

export async function buildPartnersReportCsv(): Promise<string> {
  const partners = await prisma.partnerProfile.findMany({
    include: {
      user: true,
      commissionPlan: true,
      sales: { where: { status: 'COMPLETED' } },
      earnings: true,
    },
  });

  const rows = partners.map((p) => {
    const totalSalesRevenue = p.sales.reduce((s, x) => s + x.totalAmountCents, 0);
    const totalEarnings = p.earnings.reduce((s, x) => s + x.amountCents, 0);
    return [
      `${p.user.firstName} ${p.user.lastName}`,
      p.user.username,
      p.user.email,
      p.user.status,
      `${p.city} / ${p.district}`,
      p.commissionPlan?.name || 'Varsayilan',
      p.sales.length,
      centsToTl(totalSalesRevenue).toFixed(2),
      centsToTl(totalEarnings).toFixed(2),
      p.user.createdAt.toISOString().slice(0, 10),
    ];
  });

  return toCsv(
    ['Ad Soyad', 'Kullanici Adi', 'E-posta', 'Durum', 'Konum', 'Komisyon Plani', 'Toplam Satis Adedi', 'Toplam Ciro (TL)', 'Toplam Kazanc (TL)', 'Kayit Tarihi'],
    rows,
  );
}

export async function buildStockReportCsv(): Promise<string> {
  const variants = await prisma.productVariant.findMany({
    include: { product: true, partnerStocks: { include: { partnerProfile: { include: { user: true } } } } },
  });

  const rows: (string | number)[][] = [];
  for (const v of variants) {
    rows.push([
      v.product.name,
      `${v.volumeMl} ml`,
      v.sku,
      'MERKEZ',
      v.centralStock,
      v.minStockLevel,
    ]);
    for (const ps of v.partnerStocks) {
      rows.push([
        v.product.name,
        `${v.volumeMl} ml`,
        v.sku,
        `${ps.partnerProfile.user.firstName} ${ps.partnerProfile.user.lastName}`,
        ps.quantity,
        v.minStockLevel,
      ]);
    }
  }

  return toCsv(['Urun', 'Varyant', 'SKU', 'Konum', 'Stok Adedi', 'Minimum Seviye'], rows);
}

export async function buildPaymentsReportCsv(): Promise<string> {
  const payments = await prisma.payment.findMany({
    include: { partnerProfile: { include: { user: true } }, paidBy: true },
    orderBy: { paidAt: 'desc' },
  });

  const rows = payments.map((p) => [
    p.paidAt ? p.paidAt.toISOString().slice(0, 10) : '',
    `${p.partnerProfile.user.firstName} ${p.partnerProfile.user.lastName}`,
    centsToTl(p.amountCents).toFixed(2),
    p.iban,
    p.status,
    p.description || '',
    p.paidBy ? `${p.paidBy.firstName} ${p.paidBy.lastName}` : '',
  ]);

  return toCsv(['Tarih', 'Paydas', 'Tutar (TL)', 'IBAN', 'Durum', 'Aciklama', 'Odemeyi Yapan'], rows);
}

export async function buildMonthlyEarningsReportCsv(): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const earnings = await prisma.earning.findMany({
    where: { createdAt: { gte: monthStart } },
    include: { partnerProfile: { include: { user: true } } },
  });

  const byPartner = new Map<string, { name: string; total: number }>();
  for (const e of earnings) {
    const key = e.partnerProfileId;
    const name = `${e.partnerProfile.user.firstName} ${e.partnerProfile.user.lastName}`;
    const existing = byPartner.get(key) || { name, total: 0 };
    existing.total += e.amountCents;
    byPartner.set(key, existing);
  }

  const rows = Array.from(byPartner.values()).map((x) => [x.name, centsToTl(x.total).toFixed(2)]);
  return toCsv(['Paydas', `Bu Ay Kazanc (TL)`], rows);
}

// ============================================================================
// Analiz / Istatistik verileri (Raporlar sayfasindaki pasta/tablo widget'lari icin)
// ============================================================================

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: 'Onay Bekliyor', APPROVED: 'Onaylandı', REJECTED: 'Reddedildi',
  IN_PRODUCTION_QUEUE: 'Üretim Bekliyor', IN_PRODUCTION: 'Üretimde', QUALITY_CHECK: 'Kalite Kontrol',
  READY: 'Hazır', SHIPPED: 'Kargoda', DELIVERED: 'Teslim Edildi', CANCELLED: 'İptal',
};
const PAYMENT_STATUS_LABELS: Record<string, string> = { PENDING: 'Bekliyor', PAID: 'Ödendi', CANCELLED: 'Reddedildi' };
const RETURN_STATUS_LABELS: Record<string, string> = { PENDING: 'Onay Bekliyor', APPROVED: 'Onaylandı', REJECTED: 'Reddedildi' };
const SALE_STATUS_LABELS: Record<string, string> = { COMPLETED: 'Tamamlandı', VOID: 'İptal' };

export async function buildAnalytics() {
  const [completedSales, orderGroups, paymentGroups, saleGroups, returnGroups, partners, variants, customers] = await Promise.all([
    prisma.sale.findMany({
      where: { status: 'COMPLETED' },
      include: {
        partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        items: { include: { variant: { include: { product: true } } } },
      },
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.sale.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.return.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.partnerProfile.findMany({ include: { commissionPlan: true } }),
    prisma.productVariant.findMany({ where: { isActive: true } }),
    listCustomers(),
  ]);

  // --- En cok satan paydaslar ---
  const partnerMap = new Map<string, { partnerProfileId: string; name: string; unitsSold: number; revenueCents: number; profitCents: number }>();
  for (const s of completedSales) {
    const key = s.partnerProfileId;
    const cur = partnerMap.get(key) ?? {
      partnerProfileId: key,
      name: `${s.partnerProfile.user.firstName} ${s.partnerProfile.user.lastName}`,
      unitsSold: 0, revenueCents: 0, profitCents: 0,
    };
    cur.unitsSold += s.items.reduce((a, i) => a + i.quantity, 0);
    cur.revenueCents += s.totalAmountCents;
    cur.profitCents += s.totalProfitCents;
    partnerMap.set(key, cur);
  }
  const topPartners = Array.from(partnerMap.values()).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5);

  // --- En cok satilan urunler (varyantlar birlestirilip urun bazinda toplanir) ---
  const productMap = new Map<string, { productId: string; name: string; unitsSold: number; revenueCents: number }>();
  for (const s of completedSales) {
    for (const item of s.items) {
      const pid = item.variant.productId;
      const cur = productMap.get(pid) ?? { productId: pid, name: item.variant.product.name, unitsSold: 0, revenueCents: 0 };
      cur.unitsSold += item.quantity;
      cur.revenueCents += item.unitPriceCents * item.quantity;
      productMap.set(pid, cur);
    }
  }
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);

  // --- En cok alisveris yapan musteriler ---
  const topCustomers = [...customers].sort((a, b) => b.totalSpentCents - a.totalSpentCents).slice(0, 5)
    .map((c) => ({ key: c.key, name: c.name, phone: c.phone, totalOrders: c.totalOrders, totalSpentCents: c.totalSpentCents }));

  // --- Satis kanali dagilimi (Kargo/Elden) ---
  const channelCounts: Record<string, number> = { KARGO: 0, ELDEN: 0 };
  for (const s of completedSales) channelCounts[s.channel] = (channelCounts[s.channel] ?? 0) + 1;
  const channelDistribution = [
    { key: 'KARGO', label: 'Kargo', count: channelCounts.KARGO },
    { key: 'ELDEN', label: 'Elden', count: channelCounts.ELDEN },
  ];

  // --- Komisyon plani dagilimi ---
  const planCounts = new Map<string, number>();
  for (const p of partners) {
    const label = p.commissionPlan?.name || 'Varsayılan';
    planCounts.set(label, (planCounts.get(label) ?? 0) + 1);
  }
  const commissionPlanDistribution = Array.from(planCounts.entries()).map(([label, count]) => ({ key: label, label, count }));

  // --- Stok durumu dagilimi ---
  let sufficient = 0, low = 0, out = 0;
  for (const v of variants) {
    if (v.centralStock === 0) out += 1;
    else if (v.centralStock <= v.minStockLevel) low += 1;
    else sufficient += 1;
  }
  const stockLevelDistribution = [
    { key: 'SUFFICIENT', label: 'Yeterli', count: sufficient },
    { key: 'LOW', label: 'Düşük', count: low },
    { key: 'OUT', label: 'Tükendi', count: out },
  ];

  const orderStatusDistribution = orderGroups.map((o) => ({ key: o.status, label: ORDER_STATUS_LABELS[o.status] || o.status, count: o._count._all }));
  const paymentStatusDistribution = paymentGroups.map((p) => ({ key: p.status, label: PAYMENT_STATUS_LABELS[p.status] || p.status, count: p._count._all }));
  const saleStatusDistribution = saleGroups.map((s) => ({ key: s.status, label: SALE_STATUS_LABELS[s.status] || s.status, count: s._count._all }));
  const returnStatusDistribution = returnGroups.map((r) => ({ key: r.status, label: RETURN_STATUS_LABELS[r.status] || r.status, count: r._count._all }));

  return {
    topPartners, topProducts, topCustomers,
    channelDistribution, commissionPlanDistribution, stockLevelDistribution,
    orderStatusDistribution, paymentStatusDistribution, saleStatusDistribution, returnStatusDistribution,
  };
}
