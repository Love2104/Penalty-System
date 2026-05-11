import { Router } from 'express';
import {
  firebasePhoneLogin,
  getUsers,
  registerAdmin,
} from '../controllers/auth.controller';
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Firebase Phone Auth login (replaces email OTP /login + /verify-otp)
router.post('/firebase-phone-login', firebasePhoneLogin as any);

// Admin management (SuperAdmin only)
router.get('/users', requireAuth, requireSuperAdmin, getUsers as any);
router.post('/register', requireAuth, requireSuperAdmin, registerAdmin as any);

export default router;
