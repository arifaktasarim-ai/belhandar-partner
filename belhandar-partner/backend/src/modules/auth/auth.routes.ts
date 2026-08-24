import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateBody } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from './auth.validation';
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  meController,
} from './auth.controller';

const router = Router();

// Brute-force koruma: login/register gibi hassas endpointlerde daha siki limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Cok fazla deneme yaptiniz. Lutfen daha sonra tekrar deneyin.' },
});

router.post('/register', authLimiter, validateBody(registerSchema), registerController);
router.post('/login', authLimiter, validateBody(loginSchema), loginController);
router.post('/refresh', validateBody(refreshSchema.partial()), refreshController);
router.post('/logout', logoutController);
router.get('/me', requireAuth, meController);

export default router;
