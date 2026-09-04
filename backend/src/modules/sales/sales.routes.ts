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
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const sales = await service.listSales({ partnerProfileId, year, month });
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
  asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const partnerProfileId = req.query.partnerProfileId as string | undefined;
    // Yil/ay veya paydas filtresi verilmisse sinir koyma (gecmise erisim tam olsun);
    // hicbir filtre yoksa varsayilan gorunumde performans icin son 200 kayitla sinirla.
    const take = year || partnerProfileId ? undefined : 200;
    const sales = await service.listSales({ take, year, month, partnerProfileId });
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
