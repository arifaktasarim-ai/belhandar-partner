import { z } from 'zod';

// Fiyatlar TL olarak (ondalikli) alinir, service katmaninda kurusa cevrilir.
export const createProductSchema = z.object({
  name: z.string().min(2, 'Urun adi en az 2 karakter olmalidir'),
  productCode: z.string().min(2, 'Urun kodu zorunludur'),
  perfumeType: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.union([
  z.string().url(),
  z.literal(''),
]).optional(),

  // Ilk varyant bilgileri (urun olustururken en az 1 varyant zorunlu)
  volumeMl: z.coerce.number().int().positive('Hacim (ml) pozitif olmalidir'),
  sku: z.string().min(2, 'SKU zorunludur'),
  barcode: z.string().optional(),
  retailPrice: z.coerce.number().positive('Satis fiyati pozitif olmalidir'),
  partnerPrice: z.coerce.number().positive('Paydas fiyati pozitif olmalidir'),
  centralStock: z.coerce.number().int().min(0).default(0),
  minStockLevel: z.coerce.number().int().min(0).default(10),
}).refine((data) => data.partnerPrice < data.retailPrice, {
  message: 'Paydas fiyati, satis fiyatindan dusuk olmalidir',
  path: ['partnerPrice'],
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  perfumeType: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.union([
  z.string().url(),
  z.literal(''),
]).optional(),
  isActive: z.boolean().optional(),
});

export const addVariantSchema = z.object({
  volumeMl: z.coerce.number().int().positive(),
  sku: z.string().min(2),
  barcode: z.string().optional(),
  retailPrice: z.coerce.number().positive(),
  partnerPrice: z.coerce.number().positive(),
  centralStock: z.coerce.number().int().min(0).default(0),
  minStockLevel: z.coerce.number().int().min(0).default(10),
}).refine((data) => data.partnerPrice < data.retailPrice, {
  message: 'Paydas fiyati, satis fiyatindan dusuk olmalidir',
  path: ['partnerPrice'],
});

export const updateVariantSchema = z.object({
  retailPrice: z.coerce.number().positive().optional(),
  partnerPrice: z.coerce.number().positive().optional(),
  centralStock: z.coerce.number().int().min(0).optional(),
  minStockLevel: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
