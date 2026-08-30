import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './commission-plans.service';
import { createCommissionPlanSchema, updateCommissionPlanSchema } from './commission-plans.validation';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const plans = await service.listPlans();
    res.json({ success: true, data: plans });
  }),
);

router.post(
  '/',
  validateBody(createCommissionPlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await service.createPlan(req.body, req.user!.sub);
    res.status(201).json({ success: true, data: plan });
  }),
);

router.put(
  '/:id',
  validateBody(updateCommissionPlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await service.updatePlan(req.params.id, req.body, req.user!.sub);
    res.json({ success: true, data: plan });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await service.deletePlan(req.params.id, req.user!.sub);
    res.json({ success: true, message: 'Plan silindi.' });
  }),
);

export default router;
