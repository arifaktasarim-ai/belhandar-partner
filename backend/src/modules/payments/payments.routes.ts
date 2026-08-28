import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin, requirePartner } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './payments.service';
import { createPaymentSchema } from './payments.validation';

const router = Router();
router.use(requireAuth);

router.get(
  '/me',
  requirePartner,
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const payments = await service.listPayments({ partnerProfileId });
    res.json({ success: true, data: payments });
  }),
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = req.query.partnerProfileId as string | undefined;
    const payments = await service.listPayments({ partnerProfileId });
    res.json({ success: true, data: payments });
  }),
);

router.post(
  '/',
  requireAdmin,
  validateBody(createPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await service.createPayment(req.body, req.user!.sub);
    res.status(201).json({ success: true, data: payment });
  }),
);

export default router;
