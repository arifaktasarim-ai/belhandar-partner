import app from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

async function main() {
  await prisma.$connect();
  // eslint-disable-next-line no-console
  console.log('✔ Veritabani baglantisi kuruldu.');

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`✔ Belhandar Partner API ${env.PORT} portunda calisiyor (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} alindi, sunucu kapatiliyor...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Sunucu baslatilamadi:', err);
  process.exit(1);
});
