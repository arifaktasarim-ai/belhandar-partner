import { z } from 'zod';

export const createPaymentSchema = z.object({
  partnerProfileId: z.string().min(1, 'Paydas seciniz'),
  amount: z.coerce.number().positive('Tutar pozitif olmalidir'), // TL cinsinden
  iban: z.string().min(10, 'Gecerli bir IBAN giriniz').optional(),
  description: z.string().optional(),
});
