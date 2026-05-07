import { Router } from 'express';
import {
  createFirebaseSession,
  getUsers,
  login,
  registerAdmin,
  requestFirebaseEmailLink,
  verifyOtp,
} from '../controllers/auth.controller';
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', login as any);
router.post('/verify-otp', verifyOtp as any);
router.post('/email-link/request', requestFirebaseEmailLink as any);
router.post('/firebase/session', createFirebaseSession as any);

router.get('/users', requireAuth, requireSuperAdmin, getUsers as any);
router.post('/register', requireAuth, requireSuperAdmin, registerAdmin as any);

export default router;
