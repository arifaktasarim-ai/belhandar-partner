import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin, requirePartner } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './returns.service';
import { createReturnSchema, rejectReturnSchema } from './returns.validation';

const router = Router();
router.use(requireAuth);

router.post(
  '/',
  requirePartner,
  validateBody(createReturnSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const ret = await service.createReturn(partnerProfileId, req.body, req.user!.sub);
    res.status(201).json({ success: true, data: ret });
  }),
);

router.get(
  '/me',
  requirePartner,
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
    const returns = await service.listReturns({ partnerProfileId, status });
    res.json({ success: true, data: returns });
  }),
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
    const returns = await service.listReturns({ status });
    res.json({ success: true, data: returns });
  }),
);

router.patch(
  '/:id/approve',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const ret = await service.approveReturn(req.params.id, req.user!.sub);
    res.json({ success: true, data: ret });
  }),
);

router.patch(
  '/:id/reject',
  requireAdmin,
  validateBody(rejectReturnSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const ret = await service.rejectReturn(req.params.id, req.user!.sub, req.body.reviewNote);
    res.json({ success: true, data: ret });
  }),
);

export default router;
