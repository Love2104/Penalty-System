import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { sendMail } from '../services/mailer';

import dotenv from 'dotenv';
dotenv.config();

// In-memory OTP store for simplicity. In prod, use Redis or DB.
const otpStore = new Map<string, { otp: string, expiresAt: number }>();

export const login = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!email.endsWith('@iitk.ac.in') && !email.endsWith('@gmail.com')) {
      return res.status(403).json({ error: 'Only @iitk.ac.in or @gmail.com emails allowed' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(403).json({ error: 'Unauthorized email. Please contact CEO for access.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
    otpStore.set(email, { otp, expiresAt });

    // In a real scenario, we send it via email.
    // For local testing, we'll just log it to console as well to make it easy.
    console.log(`[LOCAL DEV] OTP for ${email} is ${otp}`);

    await sendMail({
      to: email,
      subject: 'Login OTP - EC Penalty System',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Election Commission Penalty System</h2>
          <p>Your OTP for login is: <strong style="font-size: 24px;">${otp}</strong></p>
          <p>This OTP will expire in 5 minutes.</p>
        </div>
      `,
      text: `Your OTP for the EC Penalty System is ${otp}. It will expire in 5 minutes.`
    });

    res.json({ message: 'OTP sent successfully. Please check your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Incorrect OTP' });
    }

    // OTP matched
    otpStore.delete(email);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mark as verified if first time
    if (!user.is_verified) {
      await prisma.user.update({
        where: { email },
        data: { is_verified: true }
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!email.endsWith('@iitk.ac.in') && !email.endsWith('@gmail.com')) {
      return res.status(403).json({ error: 'Only @iitk.ac.in or @gmail.com emails allowed' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        role: role || 'ADMIN',
        is_verified: true
      }
    });

    res.json({ message: 'Admin registered successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register admin' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
