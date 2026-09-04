import { prisma } from '../../lib/prisma';
import { centsToTl } from '../../utils/money';
import { toCsv } from '../../utils/csv';

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
