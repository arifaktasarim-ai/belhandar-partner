import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// Dev ortaminda hot-reload sirasinda birden fazla PrismaClient instance'i
// olusmasini onlemek icin global singleton kullaniyoruz.
export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV === 'development') {
  global.__prisma__ = prisma;
}
