import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin, requirePartner } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './payments.service';
import { createPaymentSchema, requestPaymentSchema, rejectPaymentSchema } from './payments.validation';

const router = Router();
router.use(requireAuth);

router.get(
  '/me',
  requirePartner,
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const status = req.query.status as 'PENDING' | 'PAID' | 'CANCELLED' | undefined;
    const payments = await service.listPayments({ partnerProfileId, status });
    res.json({ success: true, data: payments });
  }),
);

router.post(
  '/request',
  requirePartner,
  validateBody(requestPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const payment = await service.requestPayment(partnerProfileId, req.body.amount);
    res.status(201).json({ success: true, data: payment });
  }),
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = req.query.partnerProfileId as string | undefined;
    const status = req.query.status as 'PENDING' | 'PAID' | 'CANCELLED' | undefined;
    const payments = await service.listPayments({ partnerProfileId, status });
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

router.patch(
  '/:id/approve',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await service.approvePaymentRequest(req.params.id, req.user!.sub);
    res.json({ success: true, data: payment });
  }),
);

router.patch(
  '/:id/reject',
  requireAdmin,
  validateBody(rejectPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await service.rejectPaymentRequest(req.params.id, req.user!.sub, req.body.reason);
    res.json({ success: true, data: payment });
  }),
);

export default router;
