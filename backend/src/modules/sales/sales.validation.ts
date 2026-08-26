import { z } from 'zod';

export const createSaleSchema = z.object({
  channel: z.enum(['KARGO', 'ELDEN']),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  note: z.string().optional(),
  saleDate: z.string().optional(), // ISO string; verilmezse "simdi" kullanilir
  items: z.array(z.object({
    variantId: z.string().min(1),
    quantity: z.coerce.number().int().positive('Adet pozitif olmalidir'),
    unitPrice: z.coerce.number().positive('Satis fiyati pozitif olmalidir'),
  })).min(1, 'En az 1 urun eklemelisiniz'),
});

export const voidSaleSchema = z.object({
  reason: z.string().min(3, 'Iptal gerekcesi zorunludur'),
});
