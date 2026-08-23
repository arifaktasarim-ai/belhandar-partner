import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserStatus } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './admin-partners.service';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as UserStatus | undefined;
    const search = req.query.search as string | undefined;
    const partners = await service.listPartners(status, search);
    res.json({ success: true, data: partners });
  }),
);

const statusChangeSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'activate']),
  reason: z.string().optional(),
});

router.patch(
  '/:id/status',
  validateBody(statusChangeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await service.changePartnerStatus(
      req.params.id,
      req.body.action,
      req.user!.sub,
      req.body.reason,
    );
    res.json({ success: true, data: updated });
  }),
);

export default router;
