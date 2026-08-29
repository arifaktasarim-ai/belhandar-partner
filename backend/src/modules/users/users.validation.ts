import { z } from 'zod';

export const updateProfileSchema = z.object({
  phone: z.string().min(10).optional(),
  avatarUrl: z.string().url().optional(),
  city: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  iban: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Yeni sifre en az 8 karakter olmalidir'),
});
