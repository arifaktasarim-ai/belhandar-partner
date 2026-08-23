import { PrismaClient, Role, UserStatus, CommissionType, SaleChannel, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log('Seed baslatiliyor...');

  // --- Settings ---
  await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      brandName: 'Belhandar',
      currency: 'TRY',
      defaultCommissionType: CommissionType.PERCENTAGE,
      defaultCommissionValue: 2000, // %20
      defaultMinStockLevel: 10,
    },
  });

  // --- Commission Plans (madde 7) ---
  const [planA, planB, planC, planVip] = await Promise.all([
    prisma.commissionPlan.upsert({
      where: { name: 'Standart %20' },
      update: {},
      create: { name: 'Standart %20', type: CommissionType.PERCENTAGE, value: 2000, isDefault: true },
    }),
    prisma.commissionPlan.upsert({
      where: { name: 'Gelismis %25' },
      update: {},
      create: { name: 'Gelismis %25', type: CommissionType.PERCENTAGE, value: 2500 },
    }),
    prisma.commissionPlan.upsert({
      where: { name: 'Kidemli %30' },
      update: {},
      create: { name: 'Kidemli %30', type: CommissionType.PERCENTAGE, value: 3000 },
    }),
    prisma.commissionPlan.upsert({
      where: { name: 'VIP %35' },
      update: {},
      create: { name: 'VIP %35', type: CommissionType.PERCENTAGE, value: 3500 },
    }),
  ]);

  // --- Users: Super Admin + Admin ---
  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      firstName: 'Belhandar',
      lastName: 'Super Admin',
      username: 'superadmin',
      email: 'superadmin@belhandar.com',
      phone: '5550000001',
      passwordHash: await hash('SuperAdmin123!'),
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      kvkkAcceptedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      firstName: 'Belhandar',
      lastName: 'Admin',
      username: 'admin',
      email: 'admin@belhandar.com',
      phone: '5550000002',
      passwordHash: await hash('Admin123!'),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      kvkkAcceptedAt: new Date(),
    },
  });

  // --- 5 Paydas ---
  const partnerSeeds = [
    { username: 'ahmet.yilmaz', first: 'Ahmet', last: 'Yilmaz', city: 'Istanbul', district: 'Kadikoy', plan: planA.id, status: UserStatus.ACTIVE },
    { username: 'zeynep.kaya', first: 'Zeynep', last: 'Kaya', city: 'Ankara', district: 'Cankaya', plan: planB.id, status: UserStatus.ACTIVE },
    { username: 'mehmet.demir', first: 'Mehmet', last: 'Demir', city: 'Izmir', district: 'Bornova', plan: planC.id, status: UserStatus.ACTIVE },
    { username: 'elif.sahin', first: 'Elif', last: 'Sahin', city: 'Bursa', district: 'Nilufer', plan: planVip.id, status: UserStatus.ACTIVE },
    { username: 'can.arslan', first: 'Can', last: 'Arslan', city: 'Antalya', district: 'Muratpasa', plan: planA.id, status: UserStatus.PENDING_APPROVAL },
  ];

  const partners = [];
  for (const p of partnerSeeds) {
    const user = await prisma.user.upsert({
      where: { username: p.username },
      update: {},
      create: {
        firstName: p.first,
        lastName: p.last,
        username: p.username,
        email: `${p.username}@example.com`,
        phone: '5551112233',
        passwordHash: await hash('Partner123!'),
        role: Role.PARTNER,
        status: p.status,
        kvkkAcceptedAt: new Date(),
        approvedById: p.status === UserStatus.ACTIVE ? superAdmin.id : null,
        approvedAt: p.status === UserStatus.ACTIVE ? new Date() : null,
        partnerProfile: {
          create: {
            city: p.city,
            district: p.district,
            address: `${p.district} Mah. Ornek Sk. No:1`,
            iban: 'TR330006100519786457841326',
            commissionPlanId: p.plan,
          },
        },
      },
      include: { partnerProfile: true },
    });
    partners.push(user);
  }

  // --- 10 Urun (varyant) ---
  const productDefs = [
    { name: 'Belhandar Noir', code: 'BH-NOIR', type: 'Eau de Parfum', ml: 50, retail: 100000, partner: 70000 },
    { name: 'Belhandar Noir', code: 'BH-NOIR-100', type: 'Eau de Parfum', ml: 100, retail: 170000, partner: 120000 },
    { name: 'Belhandar Blanc', code: 'BH-BLANC', type: 'Eau de Toilette', ml: 50, retail: 85000, partner: 60000 },
    { name: 'Belhandar Rouge', code: 'BH-ROUGE', type: 'Eau de Parfum', ml: 50, retail: 110000, partner: 78000 },
    { name: 'Belhandar Ambre', code: 'BH-AMBRE', type: 'Eau de Parfum', ml: 75, retail: 130000, partner: 92000 },
    { name: 'Belhandar Ocean', code: 'BH-OCEAN', type: 'Eau de Toilette', ml: 100, retail: 95000, partner: 66000 },
    { name: 'Belhandar Velvet', code: 'BH-VELVET', type: 'Eau de Parfum', ml: 50, retail: 120000, partner: 85000 },
    { name: 'Belhandar Gold', code: 'BH-GOLD', type: 'Parfum', ml: 30, retail: 150000, partner: 105000 },
    { name: 'Belhandar Fresh', code: 'BH-FRESH', type: 'Eau de Toilette', ml: 100, retail: 80000, partner: 55000 },
    { name: 'Belhandar Mystic', code: 'BH-MYSTIC', type: 'Eau de Parfum', ml: 50, retail: 105000, partner: 74000 },
  ];

  const variants = [];
  for (const p of productDefs) {
    const product = await prisma.product.upsert({
      where: { productCode: p.code },
      update: {},
      create: {
        name: p.name,
        productCode: p.code,
        perfumeType: p.type,
        description: `${p.name} - premium Belhandar kolleksiyonu, ${p.ml}ml.`,
        isActive: true,
      },
    });

    const variant = await prisma.productVariant.upsert({
      where: { sku: `${p.code}-${p.ml}` },
      update: {},
      create: {
        productId: product.id,
        volumeMl: p.ml,
        sku: `${p.code}-${p.ml}`,
        retailPriceCents: p.retail,
        partnerPriceCents: p.partner,
        centralStock: 500,
        minStockLevel: 10,
      },
    });
    variants.push(variant);
  }

  // --- Ornek paydas stoklari ---
  for (const partner of partners) {
    if (!partner.partnerProfile) continue;
    for (const v of variants.slice(0, 4)) {
      await prisma.partnerStock.upsert({
        where: { partnerProfileId_variantId: { partnerProfileId: partner.partnerProfile.id, variantId: v.id } },
        update: {},
        create: {
          partnerProfileId: partner.partnerProfile.id,
          variantId: v.id,
          quantity: Math.floor(Math.random() * 20) + 5,
        },
      });

      await prisma.stockMovement.create({
        data: {
          partnerProfileId: partner.partnerProfile.id,
          variantId: v.id,
          type: 'ORDER_RECEIVED',
          quantityChange: 20,
          reason: 'Baslangic stogu (seed)',
          actorUserId: superAdmin.id,
        },
      });
    }
  }

  // --- Ornek siparis ---
  const firstPartner = partners[0];
  if (firstPartner.partnerProfile) {
    const variant = variants[0];
    const qty = 10;
    const order = await prisma.order.create({
      data: {
        orderNumber: 'BH-2026-00001',
        partnerProfileId: firstPartner.partnerProfile.id,
        status: OrderStatus.PENDING_APPROVAL,
        totalAmountCents: variant.partnerPriceCents * qty,
        items: {
          create: [{ variantId: variant.id, quantity: qty, unitPriceCents: variant.partnerPriceCents }],
        },
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        toStatus: OrderStatus.PENDING_APPROVAL,
        actorUserId: firstPartner.id,
        note: 'Siparis olusturuldu (seed)',
      },
    });
  }

  // --- Ornek satis + kazanc ---
  if (firstPartner.partnerProfile) {
    const variant = variants[0];
    const qty = 2;
    const unitProfit = variant.retailPriceCents - variant.partnerPriceCents;

    const sale = await prisma.sale.create({
      data: {
        partnerProfileId: firstPartner.partnerProfile.id,
        channel: SaleChannel.ELDEN,
        customerName: 'Ornek Musteri',
        totalAmountCents: variant.retailPriceCents * qty,
        totalProfitCents: unitProfit * qty,
        items: {
          create: [
            {
              variantId: variant.id,
              quantity: qty,
              unitPriceCents: variant.retailPriceCents,
              unitProfitCents: unitProfit,
            },
          ],
        },
      },
    });

    await prisma.earning.create({
      data: {
        partnerProfileId: firstPartner.partnerProfile.id,
        saleId: sale.id,
        amountCents: unitProfit * qty,
        description: 'Satis kazanci (seed)',
      },
    });
  }

  // --- Ornek odeme ---
  if (firstPartner.partnerProfile) {
    await prisma.payment.create({
      data: {
        partnerProfileId: firstPartner.partnerProfile.id,
        amountCents: 500000,
        iban: firstPartner.partnerProfile.iban,
        description: 'Gecmis donem odemesi (seed)',
        paidById: superAdmin.id,
      },
    });
  }

  console.log('Seed tamamlandi ✔');
  console.log('Giris bilgileri:');
  console.log('  superadmin / SuperAdmin123!');
  console.log('  admin / Admin123!');
  console.log('  ahmet.yilmaz / Partner123! (ACTIVE)');
  console.log('  can.arslan / Partner123! (PENDING_APPROVAL)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
