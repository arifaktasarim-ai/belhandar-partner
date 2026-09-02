import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin, requirePartner } from '../../middleware/role.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './dashboard.service';
import { prisma } from '../../lib/prisma';

const router = Router();
router.use(requireAuth);

router.get(
  '/partner',
  requirePartner,
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await prisma.partnerProfile.findUnique({ where: { userId: req.user!.sub } });
    if (!profile) return res.status(404).json({ success: false, message: 'Paydas profili bulunamadi.' });
    const data = await service.getPartnerDashboard(profile.id);
    res.json({ success: true, data });
  }),
);

router.get(
  '/admin/badges',
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await service.getAdminBadgeCounts();
    res.json({ success: true, data });
  }),
);

router.get(
  '/admin',
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await service.getAdminDashboard();
    res.json({ success: true, data });
  }),
);

export default router;
