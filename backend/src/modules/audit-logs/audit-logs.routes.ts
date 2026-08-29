import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const entityType = req.query.entityType as string | undefined;
    const logs = await prisma.auditLog.findMany({
      where: entityType ? { entityType } : undefined,
      include: { actor: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: logs });
  }),
);

export default router;
