import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './notifications.service';

const router = Router();
router.use(requireAuth);

router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const unreadOnly = req.query.unreadOnly === 'true';
    const notifications = await service.listNotifications(req.user!.sub, unreadOnly);
    res.json({ success: true, data: notifications });
  }),
);

router.get(
  '/me/unread-count',
  asyncHandler(async (req: Request, res: Response) => {
    const count = await service.getUnreadCount(req.user!.sub);
    res.json({ success: true, data: { count } });
  }),
);

router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const notification = await service.markAsRead(req.params.id, req.user!.sub);
    res.json({ success: true, data: notification });
  }),
);

router.patch(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    await service.markAllAsRead(req.user!.sub);
    res.json({ success: true });
  }),
);

export default router;
