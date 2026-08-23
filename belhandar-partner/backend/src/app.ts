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

// --- Hata yonetimi ---
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
