import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
  partnerProfileId?: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

// Refresh token: opak bir random string olarak uretilir (imzali JWT DEGIL),
// DB'de hash'lenerek saklanir ve rotate edilir. Bu sayede tekil iptal (revoke)
// ve calinma tespiti (reuse detection) mumkun olur.
export function generateOpaqueToken(): string {
  // 256 bit rastgelelik
  return require('crypto').randomBytes(32).toString('hex');
}
