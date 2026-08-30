import { prisma } from '../../lib/prisma';

interface CustomerAgg {
  key: string;
  name: string;
  phone: string | null;
  totalOrders: number;
  totalSpentCents: number;
  lastPurchaseDate: Date;
  partnerNames: Set<string>;
  productNames: Set<string>;
}

function customerKey(name: string | null, phone: string | null): string | null {
  if (phone && phone.trim()) return `phone:${phone.trim()}`;
  if (name && name.trim()) return `name:${name.trim().toLowerCase()}`;
  return null;
}

export async function listCustomers() {
  const sales = await prisma.sale.findMany({
    where: {
      status: 'COMPLETED',
      OR: [{ customerPhone: { not: null } }, { customerName: { not: null } }],
    },
    include: {
      partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { saleDate: 'desc' },
  });

  const map = new Map<string, CustomerAgg>();

  for (const sale of sales) {
    const key = customerKey(sale.customerName, sale.customerPhone);
    if (!key) continue;

    const existing = map.get(key) ?? {
      key,
      name: sale.customerName || 'İsimsiz Müşteri',
      phone: sale.customerPhone,
      totalOrders: 0,
      totalSpentCents: 0,
      lastPurchaseDate: sale.saleDate,
      partnerNames: new Set<string>(),
      productNames: new Set<string>(),
    };

    existing.totalOrders += 1;
    existing.totalSpentCents += sale.totalAmountCents;
    if (sale.saleDate > existing.lastPurchaseDate) existing.lastPurchaseDate = sale.saleDate;
    if (!existing.phone && sale.customerPhone) existing.phone = sale.customerPhone;
    existing.partnerNames.add(`${sale.partnerProfile.user.firstName} ${sale.partnerProfile.user.lastName}`);
    for (const item of sale.items) {
      existing.productNames.add(`${item.variant.product.name} (${item.variant.volumeMl}ml)`);
    }

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((c) => ({
      key: c.key,
      name: c.name,
      phone: c.phone,
      totalOrders: c.totalOrders,
      totalSpentCents: c.totalSpentCents,
      lastPurchaseDate: c.lastPurchaseDate,
      partners: Array.from(c.partnerNames),
      products: Array.from(c.productNames),
    }))
    .sort((a, b) => b.lastPurchaseDate.getTime() - a.lastPurchaseDate.getTime());
}

export async function getCustomerDetail(key: string) {
  const [type, ...rest] = key.split(':');
  const value = rest.join(':');

  const where = type === 'phone'
    ? { customerPhone: value }
    : { customerName: { equals: value, mode: 'insensitive' as const } };

  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED', ...where },
    include: {
      partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { saleDate: 'desc' },
  });

  return sales;
}
