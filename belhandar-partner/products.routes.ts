import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './products.service';
import {
  createProductSchema,
  updateProductSchema,
  addVariantSchema,
  updateVariantSchema,
} from './products.validation';

const router = Router();

// Herhangi bir giris yapmis kullanici (admin veya paydas) aktif urunleri gorebilir
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    const showAll = includeInactive && req.query.all === 'true';
    const products = await service.listProducts(showAll);
    res.json({ success: true, data: products });
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const product = await service.getProduct(req.params.id);
    res.json({ success: true, data: product });
  }),
);

// --- Admin islemleri ---
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateBody(createProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const product = await service.createProduct(req.body, req.user!.sub);
    res.status(201).json({ success: true, data: product });
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  validateBody(updateProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const product = await service.updateProduct(req.params.id, req.body, req.user!.sub);
    res.json({ success: true, data: product });
  }),
);

router.post(
  '/:id/variants',
  requireAuth,
  requireAdmin,
  validateBody(addVariantSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const variant = await service.addVariant(req.params.id, req.body, req.user!.sub);
    res.status(201).json({ success: true, data: variant });
  }),
);

router.put(
  '/variants/:variantId',
  requireAuth,
  requireAdmin,
  validateBody(updateVariantSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const variant = await service.updateVariant(req.params.variantId, req.body, req.user!.sub);
    res.json({ success: true, data: variant });
  }),
);

export default router;
