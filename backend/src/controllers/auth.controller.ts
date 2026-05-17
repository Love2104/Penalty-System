import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { sendMail } from '../services/mailer';

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

    if (!rawEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const email = normalizeEmail(rawEmail);

    if (!isAllowedEmail(email)) {
      return res.status(403).json({ error: 'Only approved @iitk.ac.in email addresses are allowed' });
    }

    const user = await findAuthorizedUser(email);
    if (!user) {
      return res.status(403).json({ error: 'Unauthorized email. Please contact lovec23@iitk.ac.in for access.' });
    }

    const existingOtp = await prisma.otpCode.findUnique({ where: { email } });
    if (existingOtp && !canRequestOtp(existingOtp.created_at)) {
      return res.status(429).json({
        error: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another OTP.`,
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpCode.upsert({
      where: { email },
      update: {
        otp_hash: hashOtp(email, otp),
        expires_at: expiresAt,
      },
      create: {
        email,
        otp_hash: hashOtp(email, otp),
        expires_at: expiresAt,
      },
    });

    console.log(`[LOCAL DEV] OTP for ${email} is ${otp}`);

    await sendMail({
      to: email,
      subject: 'Login OTP - EC Penalty System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #18181b;">
          <h2 style="margin-bottom: 12px;">Election Commission Penalty System</h2>
          <p>Your secure login OTP is:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.24em; margin: 18px 0;">${otp}</p>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
        </div>
      `,
      text: `Your OTP for the EC Penalty System is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    });

    return res.json({ message: 'OTP sent successfully. Please check your email.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body?.email as string | undefined;
    const otp = req.body?.otp as string | undefined;

    if (!rawEmail || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const email = normalizeEmail(rawEmail);
    const otpRecord = await prisma.otpCode.findUnique({ where: { email } });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (Date.now() > otpRecord.expires_at.getTime()) {
      await prisma.otpCode.delete({ where: { email } });
      return res.status(400).json({ error: 'OTP has expired' });
    }

    const incomingHash = hashOtp(email, otp);
    if (!safeCompare(otpRecord.otp_hash, incomingHash)) {
      return res.status(400).json({ error: 'Incorrect OTP' });
    }

    await prisma.otpCode.delete({ where: { email } });

    const user = await findAuthorizedUser(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.is_verified) {
      await prisma.user.update({
        where: { email },
        data: { is_verified: true },
      });
    }

    return res.json(
      issueJwtForUser({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body?.email as string | undefined;
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

    const user = await prisma.user.create({
      data: {
        email,
        role,
        is_verified: true,
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
