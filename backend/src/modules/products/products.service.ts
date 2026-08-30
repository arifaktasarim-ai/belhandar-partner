import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import { tlToCents } from '../../utils/money';

export async function listProducts(includeInactive: boolean) {
  return prisma.product.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { variants: { orderBy: { volumeMl: 'asc' } }, images: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { orderBy: { volumeMl: 'asc' } }, images: true },
  });
  if (!product) throw ApiError.notFound('Urun bulunamadi.');
  return product;
}

export async function createProduct(input: {
  name: string; productCode: string; perfumeType?: string; description?: string; imageUrl?: string;
  volumeMl: number; sku: string; barcode?: string;
  retailPrice: number; partnerPrice: number; centralStock: number; minStockLevel: number;
}, actorUserId: string) {
  const existingCode = await prisma.product.findUnique({ where: { productCode: input.productCode } });
  if (existingCode) throw ApiError.conflict('Bu urun kodu zaten kullaniliyor.');

  const existingSku = await prisma.productVariant.findUnique({ where: { sku: input.sku } });
  if (existingSku) throw ApiError.conflict('Bu SKU zaten kullaniliyor.');

  const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.product.create({
      data: {
        name: input.name,
        productCode: input.productCode,
        perfumeType: input.perfumeType,
        description: input.description,
        images: input.imageUrl ? { create: [{ url: input.imageUrl, sortOrder: 0 }] } : undefined,
        variants: {
          create: [{
            volumeMl: input.volumeMl,
            sku: input.sku,
            barcode: input.barcode,
            retailPriceCents: tlToCents(input.retailPrice),
            partnerPriceCents: tlToCents(input.partnerPrice),
            centralStock: input.centralStock,
            minStockLevel: input.minStockLevel,
          }],
        },
      },
      include: { variants: true, images: true },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: created.id,
        afterData: { name: created.name, productCode: created.productCode },
      },
    });

    return created;
  });

  return product;
}

export async function updateProduct(id: string, input: {
  name?: string; perfumeType?: string; description?: string; imageUrl?: string; isActive?: boolean;
}, actorUserId: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Urun bulunamadi.');

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.product.update({
      where: { id },
      data: {
        name: input.name,
        perfumeType: input.perfumeType,
        description: input.description,
        isActive: input.isActive,
      },
      include: { variants: true, images: true },
    });

    if (input.imageUrl) {
      // Tek bir ana gorsel mantigi: eskisini sil, yenisini ekle (ust uste birikmesin)
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productImage.create({ data: { productId: id, url: input.imageUrl, sortOrder: 0 } });
    }

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: id,
        beforeData: { name: existing.name, isActive: existing.isActive },
        afterData: { name: result.name, isActive: result.isActive },
      },
    });

    return result;
  });

  return updated;
}

export async function deleteProduct(productId: string, actorUserId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { variants: true } });
  if (!product) throw ApiError.notFound('Urun bulunamadi.');

  const variantIds = product.variants.map((v) => v.id);
  const [saleCount, orderCount, movementCount] = await Promise.all([
    prisma.saleItem.count({ where: { variantId: { in: variantIds } } }),
    prisma.orderItem.count({ where: { variantId: { in: variantIds } } }),
    prisma.stockMovement.count({ where: { variantId: { in: variantIds } } }),
  ]);

  if (saleCount > 0 || orderCount > 0 || movementCount > 0) {
    throw ApiError.conflict(
      'Bu urunun satis, siparis veya stok hareketi gecmisi oldugu icin silinemez. ' +
      'Kalici silme yerine urunu "Pasif" yapmanizi oneririz.',
    );
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.partnerStock.deleteMany({ where: { variantId: { in: variantIds } } });
    await tx.productImage.deleteMany({ where: { productId } });
    await tx.productVariant.deleteMany({ where: { productId } });
    await tx.product.delete({ where: { id: productId } });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PRODUCT_DELETED',
        entityType: 'Product',
        entityId: productId,
        beforeData: { name: product.name, productCode: product.productCode },
      },
    });
  });
}

export async function deleteVariant(variantId: string, actorUserId: string) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw ApiError.notFound('Varyant bulunamadi.');

  const [saleCount, orderCount, movementCount, siblingCount] = await Promise.all([
    prisma.saleItem.count({ where: { variantId } }),
    prisma.orderItem.count({ where: { variantId } }),
    prisma.stockMovement.count({ where: { variantId } }),
    prisma.productVariant.count({ where: { productId: variant.productId } }),
  ]);

  if (saleCount > 0 || orderCount > 0 || movementCount > 0) {
    throw ApiError.conflict(
      'Bu varyantin satis, siparis veya stok hareketi gecmisi oldugu icin silinemez. ' +
      'Kalici silme yerine varyanti "Pasif" yapmanizi oneririz.',
    );
  }
  if (siblingCount <= 1) {
    throw ApiError.badRequest('Bir urunun en az 1 varyanti olmalidir. Once yeni bir varyant ekleyin ya da urunun tamamini silin.');
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.partnerStock.deleteMany({ where: { variantId } });
    await tx.productVariant.delete({ where: { id: variantId } });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'VARIANT_DELETED',
        entityType: 'ProductVariant',
        entityId: variantId,
        beforeData: { sku: variant.sku, volumeMl: variant.volumeMl },
      },
    });
  });
}

export async function addVariant(productId: string, input: {
  volumeMl: number; sku: string; barcode?: string;
  retailPrice: number; partnerPrice: number; centralStock: number; minStockLevel: number;
}, actorUserId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Urun bulunamadi.');

  const existingSku = await prisma.productVariant.findUnique({ where: { sku: input.sku } });
  if (existingSku) throw ApiError.conflict('Bu SKU zaten kullaniliyor.');

  const variant = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.productVariant.create({
      data: {
        productId,
        volumeMl: input.volumeMl,
        sku: input.sku,
        barcode: input.barcode,
        retailPriceCents: tlToCents(input.retailPrice),
        partnerPriceCents: tlToCents(input.partnerPrice),
        centralStock: input.centralStock,
        minStockLevel: input.minStockLevel,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'VARIANT_ADDED',
        entityType: 'ProductVariant',
        entityId: created.id,
        afterData: { sku: created.sku, volumeMl: created.volumeMl },
      },
    });

    return created;
  });

  return variant;
}

export async function updateVariant(id: string, input: {
  retailPrice?: number; partnerPrice?: number; centralStock?: number; minStockLevel?: number; isActive?: boolean;
}, actorUserId: string) {
  const existing = await prisma.productVariant.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Varyant bulunamadi.');

  const newRetail = input.retailPrice !== undefined ? tlToCents(input.retailPrice) : existing.retailPriceCents;
  const newPartner = input.partnerPrice !== undefined ? tlToCents(input.partnerPrice) : existing.partnerPriceCents;
  if (newPartner >= newRetail) {
    throw ApiError.badRequest('Paydas fiyati, satis fiyatindan dusuk olmalidir.');
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.productVariant.update({
      where: { id },
      data: {
        retailPriceCents: newRetail,
        partnerPriceCents: newPartner,
        centralStock: input.centralStock,
        minStockLevel: input.minStockLevel,
        isActive: input.isActive,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'VARIANT_UPDATED',
        entityType: 'ProductVariant',
        entityId: id,
        beforeData: {
          retailPriceCents: existing.retailPriceCents,
          partnerPriceCents: existing.partnerPriceCents,
          centralStock: existing.centralStock,
        },
        afterData: {
          retailPriceCents: result.retailPriceCents,
          partnerPriceCents: result.partnerPriceCents,
          centralStock: result.centralStock,
        },
      },
    });

    return result;
  });

  return updated;
}
