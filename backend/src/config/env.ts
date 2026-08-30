import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().default('http://localhost:4000'),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL zorunludur'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL zorunludur (Supabase/pooler kullaniyorsaniz migrate icin gerekli)'),

  VAPID_PUBLIC_KEY: z.string().min(1, 'VAPID_PUBLIC_KEY zorunludur (push bildirimleri icin)'),
  VAPID_PRIVATE_KEY: z.string().min(1, 'VAPID_PRIVATE_KEY zorunludur (push bildirimleri icin)'),
  VAPID_SUBJECT: z.string().default('mailto:destek@belhandar.com'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET en az 16 karakter olmalidir'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET en az 16 karakter olmalidir'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Gecersiz environment degiskenleri:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment dogrulamasi basarisiz oldu. .env dosyanizi kontrol edin.');
}

export const env = parsed.data;
