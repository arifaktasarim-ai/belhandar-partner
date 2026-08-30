import webpush from 'web-push';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Bir kullanicinin kayitli tum cihazlarina push bildirimi gonderir.
 * Gecersiz/suresi dolmus abonelikleri (410/404 hatasi) otomatik temizler.
 * Bu fonksiyon asla hata firlatmaz - bildirim basarisiz olsa da ana islemi bozmamalidir.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
          );
        } catch (err: any) {
          // 404/410: abonelik artik gecerli degil (kullanici izni kaldirmis, tarayici verisini silmis vb.)
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      }),
    );
  } catch {
    // Push bildirimi opsiyoneldir; hata ana is akisini asla durdurmamali.
  }
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}
