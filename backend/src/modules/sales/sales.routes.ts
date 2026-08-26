import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin, requirePartner } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './sales.service';
import { createSaleSchema, voidSaleSchema } from './sales.validation';

const router = Router();
router.use(requireAuth);

router.post(
  '/',
  requirePartner,
  validateBody(createSaleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const sale = await service.createSale(partnerProfileId, req.body, req.user!.sub);
    res.status(201).json({ success: true, data: sale });
  }),
);

router.get(
  '/me',
  requirePartner,
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const sales = await service.listSales({ partnerProfileId });
    res.json({ success: true, data: sales });
  }),
);

router.patch(
  '/:id/void',
  requirePartner,
  validateBody(voidSaleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const sale = await service.voidSale(req.params.id, req.body.reason, req.user!.sub, partnerProfileId);
    res.json({ success: true, data: sale });
  }),
);

// --- Admin ---
router.get(
  '/',
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const sales = await service.listSales({ take: 200 });
    res.json({ success: true, data: sales });
  }),
);

router.patch(
  '/:id/admin-void',
  requireAdmin,
  validateBody(voidSaleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const sale = await service.voidSale(req.params.id, req.body.reason, req.user!.sub);
    res.json({ success: true, data: sale });
  }),
);

export default router;
