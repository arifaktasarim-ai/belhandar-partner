import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './reports.service';

const router = Router();
router.use(requireAuth, requireAdmin);

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

router.get('/sales', asyncHandler(async (_req: Request, res: Response) => {
  sendCsv(res, `belhandar-satis-raporu-${Date.now()}.csv`, await service.buildSalesReportCsv());
}));

router.get('/partners', asyncHandler(async (_req: Request, res: Response) => {
  sendCsv(res, `belhandar-paydas-raporu-${Date.now()}.csv`, await service.buildPartnersReportCsv());
}));

router.get('/stock', asyncHandler(async (_req: Request, res: Response) => {
  sendCsv(res, `belhandar-stok-raporu-${Date.now()}.csv`, await service.buildStockReportCsv());
}));

router.get('/payments', asyncHandler(async (_req: Request, res: Response) => {
  sendCsv(res, `belhandar-odeme-raporu-${Date.now()}.csv`, await service.buildPaymentsReportCsv());
}));

router.get('/monthly-earnings', asyncHandler(async (_req: Request, res: Response) => {
  sendCsv(res, `belhandar-aylik-kazanc-raporu-${Date.now()}.csv`, await service.buildMonthlyEarningsReportCsv());
}));

export default router;
