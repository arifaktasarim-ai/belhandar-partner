import { z } from 'zod';

export const createShippingRateSchema = z.object({
  minAmount: z.coerce.number().min(0, 'Minimum tutar 0 veya uzeri olmalidir'), // TL
  maxAmount: z.coerce.number().positive().optional(), // TL, bos = sinirsiz
  fee: z.coerce.number().min(0, 'Kargo ucreti 0 veya uzeri olmalidir'), // TL
}).refine((data) => data.maxAmount === undefined || data.maxAmount > data.minAmount, {
  message: 'Maksimum tutar, minimum tutardan buyuk olmalidir',
  path: ['maxAmount'],
});

export const updateShippingRateSchema = z.object({
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().positive().nullable().optional(),
  fee: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});
