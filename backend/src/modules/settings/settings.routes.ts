import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './settings.service';
import { updateSettingsSchema } from './settings.validation';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = await service.getSettings();
    res.json({ success: true, data: settings });
  }),
);

router.put(
  '/',
  requireAdmin,
  validateBody(updateSettingsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const settings = await service.updateSettings(req.body, req.user!.sub);
    res.json({ success: true, data: settings });
  }),
);

export default router;
