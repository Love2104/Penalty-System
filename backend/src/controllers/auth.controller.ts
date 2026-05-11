import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { getFirebaseAdminAuth } from '../lib/firebaseAdmin';

/**
 * Normalise phone to E.164 format.
 * Accepts:  7240172161 | 917240172161 | +917240172161
 * Returns:  +917240172161
 */
const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/[\s\-()]/g, '');

  if (digits.startsWith('+')) {
    return digits;
  }

  // Indian numbers: 10 digits → prepend +91
  if (/^\d{10}$/.test(digits)) {
    return `+91${digits}`;
  }

  // Already has country code (91…)
  if (/^91\d{10}$/.test(digits)) {
    return `+${digits}`;
  }

  return `+${digits}`;
};

const isValidIndianPhoneInput = (raw: string) => /^(?:\+91|91)?[6-9]\d{9}$/.test(raw.replace(/[\s\-()]/g, ''));

const isSupportedRole = (value: string) => ['ADMIN', 'SUPERADMIN'].includes(value);

const findUserByPhone = async (phone: string) =>
  prisma.user.findUnique({ where: { phone } });

const issueJwtForUser = (user: { id: string; email: string; phone: string | null; role: string }) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret is not configured');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, phone: user.phone, role: user.role },
    jwtSecret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'] },
  );

  return {
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  };
};

/**
 * POST /auth/firebase-phone-login
 * Body: { idToken: string }
 *
 * 1. Verify the Firebase ID token from the client (Phone Auth)
 * 2. Extract the phone number
 * 3. Look up the user by phone in the DB
 * 4. Issue a backend JWT
 */
export const firebasePhoneLogin = async (req: Request, res: Response) => {
  try {
    const idToken = req.body?.idToken as string | undefined;

    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    // Verify the token using Firebase Admin SDK
    const auth = getFirebaseAdminAuth();
    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (verifyError) {
      console.error('Firebase token verification failed:', verifyError);
      return res.status(401).json({ error: 'Invalid or expired Firebase token' });
    }

    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Token does not contain a phone number' });
    }

    const normalizedPhone = normalizePhone(phoneNumber);

    // Look up user by phone number
    const user = await findUserByPhone(normalizedPhone);

    if (!user) {
      return res.status(403).json({
        error: 'Unauthorized phone number. Please contact the superadmin for access.',
      });
    }

    // Mark user as verified if not already
    if (!user.is_verified) {
      await prisma.user.update({
        where: { phone: normalizedPhone },
        data: { is_verified: true },
      });
    }

    return res.json(
      issueJwtForUser({
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      }),
    );
  } catch (error) {
    console.error('Firebase Phone Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * POST /auth/register
 * Body: { phone: string, email?: string, role?: string }
 * Requires: SUPERADMIN
 *
 * Register a new admin by phone number.
 */
export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const rawPhone = req.body?.phone as string | undefined;
    const rawEmail = req.body?.email as string | undefined;
    const role = (req.body?.role as string | undefined) || 'ADMIN';

    if (!rawPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!isValidIndianPhoneInput(rawPhone)) {
      return res.status(400).json({
        error: 'Enter a valid Indian mobile number in 10-digit, 91XXXXXXXXXX, or +91XXXXXXXXXX format.',
      });
    }

    if (!isSupportedRole(role)) {
      return res.status(400).json({ error: 'Role must be ADMIN or SUPERADMIN' });
    }

    const phone = normalizePhone(rawPhone);
    const email = rawEmail ? rawEmail.trim().toLowerCase() : `${phone.replace('+', '')}@phone.local`;

    // Check if phone already exists
    const existingByPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingByPhone) {
      return res.status(400).json({ error: 'User with this phone number already exists' });
    }

    // Check if email already exists
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        phone,
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

/**
 * GET /auth/users
 * Requires: SUPERADMIN
 */
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
