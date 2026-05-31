import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

import prisma from '../lib/prisma';

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let user = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' }
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: 'lovec23@iitk.ac.in' }
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'lovec23@iitk.ac.in',
          role: 'SUPERADMIN',
          is_verified: true,
        }
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    console.error('Bypass auth middleware error:', error);
    return res.status(500).json({ error: 'Internal Auth Bypass Error' });
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Forbidden: Requires SuperAdmin privileges' });
  }
  next();
};
