import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin, requirePartner } from '../../middleware/role.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './stocks.service';

const router = Router();
router.use(requireAuth);

// Paydas: kendi stogu
router.get(
  '/me',
  requirePartner,
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const stocks = await service.getPartnerStocks(partnerProfileId);
    res.json({ success: true, data: stocks });
  }),
);

router.get(
  '/me/movements',
  requirePartner,
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const movements = await service.getPartnerStockMovements(partnerProfileId);
    res.json({ success: true, data: movements });
  }),
);

// Admin: herhangi bir paydasin stogu
router.get(
  '/partner/:partnerProfileId',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const stocks = await service.getStocksForPartnerAdmin(req.params.partnerProfileId);
    res.json({ success: true, data: stocks });
  }),
);

export default router;
