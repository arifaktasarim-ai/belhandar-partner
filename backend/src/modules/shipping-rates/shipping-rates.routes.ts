import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './shipping-rates.service';
import { createShippingRateSchema, updateShippingRateSchema } from './shipping-rates.validation';

const router = Router();
router.use(requireAuth);

// Paydaslar da (satis yaparken canli onizleme icin) aktif tarifeleri gorebilir
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    const includeInactive = isAdmin && req.query.all === 'true';
    const rates = await service.listRates(includeInactive);
    res.json({ success: true, data: rates });
  }),
);

router.post(
  '/',
  requireAdmin,
  validateBody(createShippingRateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const rate = await service.createRate(req.body, req.user!.sub);
    res.status(201).json({ success: true, data: rate });
  }),
);

router.put(
  '/:id',
  requireAdmin,
  validateBody(updateShippingRateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const rate = await service.updateRate(req.params.id, req.body, req.user!.sub);
    res.json({ success: true, data: rate });
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    await service.deleteRate(req.params.id, req.user!.sub);
    res.json({ success: true, message: 'Kargo ucret araligi silindi.' });
  }),
);

export default router;
