import { z } from 'zod';

export const createCommissionPlanSchema = z.object({
  name: z.string().min(3, 'Plan adi en az 3 karakter olmalidir'),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  // PERCENTAGE: yuzde deger (orn 20 => %20). FIXED: TL tutar (orn 300 => 300 TL)
  value: z.coerce.number().positive('Deger pozitif olmalidir'),
  isDefault: z.boolean().optional(),
});

export const updateCommissionPlanSchema = z.object({
  name: z.string().min(3).optional(),
  value: z.coerce.number().positive().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const assignCommissionPlanSchema = z.object({
  commissionPlanId: z.string().min(1, 'Komisyon plani zorunludur'),
});
