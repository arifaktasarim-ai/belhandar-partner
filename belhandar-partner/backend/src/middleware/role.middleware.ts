import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/apiError';

/**
 * Belirtilen rollerden birine sahip kullanicilarin devam etmesine izin verir.
 * requireAuth middleware'inden SONRA kullanilmalidir.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Bu islem icin yeterli yetkiniz yok.'));
    }
    return next();
  };
}

export const requireAdmin = requireRole(Role.SUPER_ADMIN, Role.ADMIN);
export const requireSuperAdmin = requireRole(Role.SUPER_ADMIN);
export const requirePartner = requireRole(Role.PARTNER);
