import { z } from 'zod';

export const createStaffSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_.]+$/),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  role: z.enum(['ADMIN']), // guvenlik: yeni SUPER_ADMIN yalnizca veritabanindan elle atanir
});

export const staffStatusSchema = z.object({
  action: z.enum(['suspend', 'activate']),
});
