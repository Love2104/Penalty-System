import { Router } from 'express';
import { login, verifyOtp } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login as any);
router.post('/verify-otp', verifyOtp as any);

export default router;
