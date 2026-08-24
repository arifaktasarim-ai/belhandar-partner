import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authService from './auth.service';

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.registerPartner(req.body, req.ip);
  res.status(201).json({
    success: true,
    message: 'Kaydiniz alindi. Hesabiniz yonetici onayindan sonra aktif olacaktir.',
    data: user,
  });
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, req.ip);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: '/api/auth',
  });

  res.status(200).json({
    success: true,
    data: { user, accessToken, refreshToken },
  });
});

export const refreshController = asyncHandler(async (req: Request, res: Response) => {
  const tokenFromCookie = req.cookies?.refreshToken;
  const tokenFromBody = req.body?.refreshToken;
  const refreshTokenPlain = tokenFromCookie || tokenFromBody;

  if (!refreshTokenPlain) {
    return res.status(401).json({ success: false, message: 'Refresh token bulunamadi.' });
  }

  const { accessToken, refreshToken } = await authService.refreshTokens(refreshTokenPlain, req.ip);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: '/api/auth',
  });

  res.status(200).json({ success: true, data: { accessToken, refreshToken } });
});

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  const refreshTokenPlain = req.cookies?.refreshToken || req.body?.refreshToken;
  if (refreshTokenPlain) {
    await authService.logout(refreshTokenPlain);
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.status(200).json({ success: true, message: 'Cikis yapildi.' });
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.sub);
  res.status(200).json({ success: true, data: user });
});
