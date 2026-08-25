import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    variantId: z.string().min(1),
    quantity: z.coerce.number().int().positive('Adet pozitif olmalidir'),
  })).min(1, 'En az 1 urun eklemelisiniz'),
});

export const changeOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PRODUCTION_QUEUE',
    'IN_PRODUCTION', 'QUALITY_CHECK', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED',
  ]),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingCarrier: z.string().optional(),
});
