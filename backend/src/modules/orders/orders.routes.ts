import { Router, Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin, requirePartner } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './orders.service';
import { createOrderSchema, changeOrderStatusSchema } from './orders.validation';

const router = Router();
router.use(requireAuth);

// --- Paydas ---
router.post(
  '/',
  requirePartner,
  validateBody(createOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const order = await service.createOrder(partnerProfileId, req.body.items, req.user!.sub);
    res.status(201).json({ success: true, data: order });
  }),
);

router.get(
  '/me',
  requirePartner,
  asyncHandler(async (req: Request, res: Response) => {
    const partnerProfileId = await service.getPartnerProfileIdForUser(req.user!.sub);
    const status = req.query.status as OrderStatus | undefined;
    const orders = await service.listOrders({ partnerProfileId, status });
    res.json({ success: true, data: orders });
  }),
);

// --- Admin ---
router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as OrderStatus | undefined;
    const orders = await service.listOrders({ status });
    res.json({ success: true, data: orders });
  }),
);

// Detay: paydas sadece kendi siparisini, admin herhangi birini gorebilir
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    const partnerProfileId = isAdmin ? undefined : await service.getPartnerProfileIdForUser(req.user!.sub);
    const order = await service.getOrderDetail(req.params.id, partnerProfileId);
    res.json({ success: true, data: order });
  }),
);

router.patch(
  '/:id/status',
  requireAdmin,
  validateBody(changeOrderStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, note, trackingNumber, shippingCarrier } = req.body;
    const order = await service.changeOrderStatus(req.params.id, status, req.user!.sub, { note, trackingNumber, shippingCarrier });
    res.json({ success: true, data: order });
  }),
);

export default router;
