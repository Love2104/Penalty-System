import { Router } from 'express';
import {
  getUsers,
  login,
  registerAdmin,
  verifyOtp,
} from '../controllers/auth.controller';
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', login as any);
router.post('/verify-otp', verifyOtp as any);

router.get('/users', requireAuth, requireSuperAdmin, getUsers as any);
router.post('/register', requireAuth, requireSuperAdmin, registerAdmin as any);

export default router;
