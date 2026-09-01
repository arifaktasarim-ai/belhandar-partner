import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { sendPushToUsers, sendPushToUser } from '../../utils/push';

async function generateOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.order.count({ where: { orderNumber: { startsWith: `BH-${year}-` } } });
  const next = String(count + 1).padStart(5, '0');
  return `BH-${year}-${next}`;
}

export async function getPartnerProfileIdForUser(userId: string): Promise<string> {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.notFound('Paydas profili bulunamadi.');
  return profile.id;
}

export async function createOrder(
  partnerProfileId: string,
  items: { variantId: string; quantity: number; testerQuantity?: number }[],
  actorUserId: string,
) {
  const variantIds = items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds } } });

  if (variants.length !== variantIds.length) {
    throw ApiError.badRequest('Bazi urunler bulunamadi.');
  }
  const inactive = variants.find((v) => !v.isActive);
  if (inactive) {
    throw ApiError.badRequest(`"${inactive.sku}" su an siparis edilemez (pasif).`);
  }

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  let totalAmountCents = 0;
  // Not: tester (numune) adedi ucretsizdir, siparis tutarina dahil edilmez - sadece bilgi amaclidir.
  const orderItemsData = items.map((item) => {
    const variant = variantMap.get(item.variantId)!;
    const lineTotal = variant.partnerPriceCents * item.quantity;
    totalAmountCents += lineTotal;
    return {
      variantId: item.variantId,
      quantity: item.quantity,
      unitPriceCents: variant.partnerPriceCents,
      testerQuantity: item.testerQuantity ?? 0,
    };
  });

  const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const orderNumber = await generateOrderNumber(tx);
    const created = await tx.order.create({
      data: {
        orderNumber,
        partnerProfileId,
        status: OrderStatus.PENDING_APPROVAL,
        totalAmountCents,
        items: { create: orderItemsData },
      },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: created.id,
        toStatus: OrderStatus.PENDING_APPROVAL,
        actorUserId,
        note: 'Siparis olusturuldu',
      },
    });

    // Adminlere bildirim
    const admins = await tx.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((a: { id: string }) => ({
          userId: a.id,
          type: 'NEW_ORDER_RECEIVED' as const,
          title: 'Yeni siparis',
          message: `${orderNumber} numarali yeni bir siparis alindi.`,
        })),
      });
    }

    return { created, adminIds: admins.map((a: { id: string }) => a.id) };
  });

  // Push bildirimi transaction disinda gonderilir (network cagrisi, DB islemini bekletmemeli)
  await sendPushToUsers(order.adminIds, {
    title: 'Yeni sipariş',
    body: `${order.created.orderNumber} numaralı yeni bir sipariş alındı.`,
    url: '/#/admin/orders',
  });

  return order.created;
}

export async function listOrders(filter: { partnerProfileId?: string; status?: OrderStatus }) {
  return prisma.order.findMany({
    where: {
      partnerProfileId: filter.partnerProfileId,
      status: filter.status,
    },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderDetail(orderId: string, partnerProfileId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      statusHistory: { include: { actor: { select: { firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      partnerProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!order) throw ApiError.notFound('Siparis bulunamadi.');
  if (partnerProfileId && order.partnerProfileId !== partnerProfileId) {
    throw ApiError.forbidden('Bu siparise erisim yetkiniz yok.');
  }
  return order;
}

export async function changeOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  actorUserId: string,
  extra: { note?: string; trackingNumber?: string; shippingCarrier?: string },
) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw ApiError.notFound('Siparis bulunamadi.');

  const wasAlreadyDelivered = order.status === OrderStatus.DELIVERED;

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        trackingNumber: extra.trackingNumber ?? order.trackingNumber,
        shippingCarrier: extra.shippingCarrier ?? order.shippingCarrier,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        actorUserId,
        note: extra.note,
      },
    });

    // Siparis DELIVERED durumuna gectiginde (ve daha once gecmediyse), paydas stogu otomatik artirilir (madde 8 & 11)
    if (newStatus === OrderStatus.DELIVERED && !wasAlreadyDelivered) {
      for (const item of order.items) {
        await tx.partnerStock.upsert({
          where: { partnerProfileId_variantId: { partnerProfileId: order.partnerProfileId, variantId: item.variantId } },
          update: { quantity: { increment: item.quantity } },
          create: { partnerProfileId: order.partnerProfileId, variantId: item.variantId, quantity: item.quantity },
        });

        await tx.stockMovement.create({
          data: {
            partnerProfileId: order.partnerProfileId,
            variantId: item.variantId,
            type: 'ORDER_RECEIVED',
            quantityChange: item.quantity,
            reason: `Siparis teslim edildi (${order.orderNumber})`,
            relatedOrderId: order.id,
            actorUserId,
          },
        });
      }
    }

    // Paydasa bildirim (tum durum degisiklikleri icin)
    const partner = await tx.partnerProfile.findUnique({ where: { id: order.partnerProfileId } });
    const statusMessages: Record<OrderStatus, string> = {
      PENDING_APPROVAL: 'Siparisiniz alindi, onay bekliyor.',
      APPROVED: 'Siparisiniz onaylandi.',
      REJECTED: 'Siparisiniz reddedildi.',
      IN_PRODUCTION_QUEUE: 'Siparisiniz uretim kuyruguna alindi.',
      IN_PRODUCTION: 'Siparisiniz uretime alindi.',
      QUALITY_CHECK: 'Siparisiniz kalite kontrolden geciyor.',
      READY: 'Siparisiniz hazir, kargoya verilmeyi bekliyor.',
      SHIPPED: 'Siparisiniz kargoya verildi.',
      DELIVERED: 'Siparisiniz teslim edildi, stoklariniza eklendi.',
      CANCELLED: 'Siparisiniz iptal edildi.',
    };
    let partnerUserId: string | null = null;
    if (partner) {
      partnerUserId = partner.userId;
      const notifTypeMap: Partial<Record<OrderStatus, 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'ORDER_APPROVED'>> = {
        SHIPPED: 'ORDER_SHIPPED',
        DELIVERED: 'ORDER_DELIVERED',
        APPROVED: 'ORDER_APPROVED',
      };
      await tx.notification.create({
        data: {
          userId: partner.userId,
          type: notifTypeMap[newStatus] ?? 'GENERIC',
          title: `Siparis ${order.orderNumber}`,
          message: statusMessages[newStatus],
        },
      });
    }

    return { result, partnerUserId, message: statusMessages[newStatus] };
  });

  if (updated.partnerUserId) {
    await sendPushToUser(updated.partnerUserId, {
      title: `Sipariş ${order.orderNumber}`,
      body: updated.message,
      url: '/#/partner/orders',
    });
  }

  return updated.result;
}
