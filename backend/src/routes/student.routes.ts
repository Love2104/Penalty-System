import { Router } from 'express';
import { searchStudents, addStudent } from '../controllers/student.controller';
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/search', requireAuth, searchStudents as any);
router.post('/', requireAuth, requireSuperAdmin, addStudent as any);

export default router;
