import { z } from 'zod';

export const updateSettingsSchema = z.object({
  brandName: z.string().min(2).optional(),
  currency: z.string().min(2).optional(),
  defaultCommissionType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  defaultCommissionValue: z.coerce.number().positive().optional(), // yuzde ise "20", sabit ise TL
  defaultMinStockLevel: z.coerce.number().int().min(0).optional(),
});
