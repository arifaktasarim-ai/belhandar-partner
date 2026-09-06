import { z } from 'zod';

export const createReturnSchema = z.object({
  saleId: z.string().min(1),
  saleItemId: z.string().min(1),
  quantity: z.coerce.number().int().positive('Adet pozitif olmalidir'),
  reason: z.string().min(3, 'Iade gerekcesi zorunludur'),
});

export const rejectReturnSchema = z.object({
  reviewNote: z.string().optional(),
});

export const completeRefundSchema = z.object({
  refundIban: z.string().min(10).optional(),
  refundNote: z.string().optional(),
});
