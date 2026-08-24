import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Ad en az 2 karakter olmalidir'),
    lastName: z.string().min(2, 'Soyad en az 2 karakter olmalidir'),
    username: z
      .string()
      .min(3, 'Kullanici adi en az 3 karakter olmalidir')
      .regex(/^[a-zA-Z0-9_.]+$/, 'Kullanici adi sadece harf, rakam, nokta ve alt cizgi icerebilir'),
    email: z.string().email('Gecerli bir e-posta adresi giriniz'),
    phone: z.string().min(10, 'Gecerli bir telefon numarasi giriniz'),
    city: z.string().min(2, 'Sehir zorunludur'),
    district: z.string().min(2, 'Ilce zorunludur'),
    address: z.string().min(5, 'Adres zorunludur'),
    password: z.string().min(8, 'Sifre en az 8 karakter olmalidir'),
    passwordConfirm: z.string(),
    iban: z
      .string()
      .regex(/^TR[0-9]{24}$|^TR[0-9 ]{24,32}$/i, 'Gecerli bir IBAN giriniz (TR ile baslamali)'),
    taxId: z.string().optional(),
    taxOffice: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    kvkkAccepted: z.literal(true, {
      errorMap: () => ({ message: 'KVKK / kullanim sartlarini onaylamalisiniz' }),
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Sifreler eslesmiyor',
    path: ['passwordConfirm'],
  });

export const loginSchema = z.object({
  // Not: "Ad Soyad" yerine sistemde tekil olan username veya email kabul edilir.
  identifier: z.string().min(3, 'Kullanici adi veya e-posta giriniz'),
  password: z.string().min(1, 'Sifre giriniz'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8, 'Sifre en az 8 karakter olmalidir'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Sifreler eslesmiyor',
    path: ['passwordConfirm'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
