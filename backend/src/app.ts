import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';

import authRoutes from './modules/auth/auth.routes';
import adminPartnersRoutes from './modules/admin-partners/admin-partners.routes';
import productsRoutes from './modules/products/products.routes';
import commissionPlansRoutes from './modules/commission-plans/commission-plans.routes';
import stocksRoutes from './modules/stocks/stocks.routes';
import ordersRoutes from './modules/orders/orders.routes';
import salesRoutes from './modules/sales/sales.routes';
import earningsRoutes from './modules/earnings/earnings.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import reportsRoutes from './modules/reports/reports.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import settingsRoutes from './modules/settings/settings.routes';
import auditLogsRoutes from './modules/audit-logs/audit-logs.routes';
import usersRoutes from './modules/users/users.routes';
import customersRoutes from './modules/customers/customers.routes';
import pushRoutes from './modules/push/push.routes';

const app = express();

// --- Guvenlik & temel middleware'ler ---
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Genel API rate limiting (auth route'larinda ayrica daha siki limit var)
app.use(
  '/api',
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'belhandar-partner-backend', status: 'ok' });
});

// --- Route'lar ---
app.use('/api/auth', authRoutes);
app.use('/api/admin/partners', adminPartnersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/admin/commission-plans', commissionPlansRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin/audit-logs', auditLogsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin/customers', customersRoutes);
app.use('/api/push', pushRoutes);

// --- Hata yonetimi ---
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
