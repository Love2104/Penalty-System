import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { sendMail } from '../services/mailer';
import { hashPassword, verifyPassword } from '../lib/hash';

const OTP_EXPIRY_MINUTES = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 45;

const hashOtp = (email: string, otp: string) =>
  crypto.createHash('sha256').update(`${email.toLowerCase()}::${otp}`).digest('hex');

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const canRequestOtp = (createdAt: Date) => {
  const cooldownEnds = createdAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000;
  return Date.now() >= cooldownEnds;
};

const isAllowedEmail = (email: string) => email.endsWith('@iitk.ac.in');

const findAuthorizedUser = async (email: string) => prisma.user.findUnique({ where: { email } });

const issueJwtForUser = (user: { id: string; email: string; role: string }) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret is not configured');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'] },
  );

  return {
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
};

export const login = async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body?.email as string | undefined;
    const password = req.body?.password as string | undefined;

    if (!rawEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const email = normalizeEmail(rawEmail);

    if (!isAllowedEmail(email)) {
      return res.status(403).json({ error: 'Only approved @iitk.ac.in email addresses are allowed' });
    }

    const user = await findAuthorizedUser(email);
    if (!user) {
      return res.status(403).json({ error: 'Unauthorized email. Please contact lovec23@iitk.ac.in for access.' });
    }

    let isCorrect = false;
    if (user.password_hash) {
      isCorrect = verifyPassword(password, user.password_hash);
    } else {
      isCorrect = password === 'GE27@Scraped,,';
    }

    if (!isCorrect) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (!user.is_verified) {
      await prisma.user.update({
        where: { email },
        data: { is_verified: true },
      });
      user.is_verified = true;
    }

    const tokenData = issueJwtForUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.json(tokenData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to authenticate user' });
  }
};

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body?.email as string | undefined;
    const rawPassword = req.body?.password as string | undefined;
    const role = (req.body?.role as string | undefined) || 'ADMIN';

    if (!rawEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const email = normalizeEmail(rawEmail);

    if (!isAllowedEmail(email)) {
      return res.status(403).json({ error: 'Only approved @iitk.ac.in email addresses are allowed' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = rawPassword ? hashPassword(rawPassword) : hashPassword('GE27@Scraped,,');

    const user = await prisma.user.create({
      data: {
        email,
        role,
        is_verified: true,
        password_hash: passwordHash,
      },
    });

    return res.json({ message: 'Admin registered successfully', user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to register admin' });
  }
};

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
    });
    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};
