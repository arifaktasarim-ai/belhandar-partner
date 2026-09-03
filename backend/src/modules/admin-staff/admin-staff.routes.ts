import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin, requireSuperAdmin } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './admin-staff.service';
import { createStaffSchema, staffStatusSchema } from './admin-staff.validation';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const staff = await service.listStaff();
    res.json({ success: true, data: staff });
  }),
);

// Yeni yonetici olusturma ve durum degistirme sadece Super Admin yetkisinde (madde 2)
router.post(
  '/',
  requireSuperAdmin,
  validateBody(createStaffSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const staff = await service.createStaff(req.body, req.user!.sub);
    res.status(201).json({ success: true, data: staff });
  }),
);

router.patch(
  '/:id/status',
  requireSuperAdmin,
  validateBody(staffStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const staff = await service.updateStaffStatus(req.params.id, req.body.action, req.user!.sub);
    res.json({ success: true, data: staff });
  }),
);

export default router;
