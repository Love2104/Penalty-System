import { Router } from 'express';
import { searchStudents } from '../controllers/student.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/search', requireAuth, searchStudents as any);

export default router;
