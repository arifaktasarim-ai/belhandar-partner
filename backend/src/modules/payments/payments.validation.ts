import { z } from 'zod';

export const createPaymentSchema = z.object({
  partnerProfileId: z.string().min(1, 'Paydas seciniz'),
  amount: z.coerce.number().positive('Tutar pozitif olmalidir'), // TL cinsinden
  iban: z.string().min(10, 'Gecerli bir IBAN giriniz').optional(),
  description: z.string().optional(),
});

export const requestPaymentSchema = z.object({
  amount: z.coerce.number().positive('Tutar pozitif olmalidir'),
});

export const rejectPaymentSchema = z.object({
  reason: z.string().optional(),
});
