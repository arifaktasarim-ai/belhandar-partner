import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './customers.service';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const customers = await service.listCustomers();
    res.json({ success: true, data: customers });
  }),
);

router.get(
  '/:key/sales',
  asyncHandler(async (req: Request, res: Response) => {
    const sales = await service.getCustomerDetail(decodeURIComponent(req.params.key));
    res.json({ success: true, data: sales });
  }),
);

export default router;
