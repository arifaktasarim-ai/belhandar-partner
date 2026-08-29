import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './users.service';
import { updateProfileSchema, changePasswordSchema } from './users.validation';

const router = Router();
router.use(requireAuth);

router.put(
  '/me',
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await service.updateProfile(req.user!.sub, req.body);
    res.json({ success: true, data: user });
  }),
);

router.post(
  '/me/change-password',
  validateBody(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await service.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, message: 'Sifreniz guncellendi. Guvenlik icin tekrar giris yapmaniz gerekebilir.' });
  }),
);

export default router;
