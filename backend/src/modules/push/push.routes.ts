import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';

const router = Router();

router.get(
  '/vapid-public-key',
  requireAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: { publicKey: env.VAPID_PUBLIC_KEY } });
  }),
);

const subscribeSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

router.post(
  '/subscribe',
  requireAuth,
  validateBody(subscribeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { endpoint, keys } = req.body;
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: req.user!.sub, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: req.user!.sub, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });
    res.status(201).json({ success: true });
  }),
);

const unsubscribeSchema = z.object({ endpoint: z.string().min(1) });

router.post(
  '/unsubscribe',
  requireAuth,
  validateBody(unsubscribeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: req.body.endpoint, userId: req.user!.sub } });
    res.json({ success: true });
  }),
);

export default router;
