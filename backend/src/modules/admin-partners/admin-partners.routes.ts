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

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const partner = await service.getPartnerDetail(req.params.id);
    res.json({ success: true, data: partner });
  }),
);

const createPartnerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_.]+$/),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  city: z.string().min(2),
  district: z.string().min(2),
  address: z.string().min(5),
  iban: z.string().min(10),
  taxId: z.string().optional(),
  taxOffice: z.string().optional(),
  status: z.enum(['ACTIVE', 'PENDING_APPROVAL']).optional(),
});

router.post(
  '/',
  validateBody(createPartnerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const partner = await service.createPartner(req.body, req.user!.sub);
    res.status(201).json({ success: true, data: partner });
  }),
);

const updatePartnerSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  city: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  iban: z.string().min(10).optional(),
  taxId: z.string().optional(),
  taxOffice: z.string().optional(),
});

router.put(
  '/:id',
  validateBody(updatePartnerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const partner = await service.updatePartner(req.params.id, req.body, req.user!.sub);
    res.json({ success: true, data: partner });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await service.deletePartner(req.params.id, req.user!.sub);
    res.json({ success: true, message: 'Paydas silindi.' });
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

const assignCommissionSchema = z.object({
  commissionPlanId: z.string().min(1),
});

router.patch(
  '/:id/commission-plan',
  validateBody(assignCommissionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await service.assignCommissionPlan(req.params.id, req.body.commissionPlanId, req.user!.sub);
    res.json({ success: true, data: updated });
  }),
);

export default router;
