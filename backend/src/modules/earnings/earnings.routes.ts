import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePartner } from '../../middleware/role.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './earnings.service';

const router = Router();
router.use(requireAuth, requirePartner);

router.get(
  '/me/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const summary = await service.getEarningsSummary(partnerProfileId);
    res.json({ success: true, data: summary });
  }),
);

router.get(
  '/me/history',
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const history = await service.getEarningsHistory(partnerProfileId);
    res.json({ success: true, data: history });
  }),
);

export default router;
