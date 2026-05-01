import { Router } from 'express';
import { searchStudents, addStudent, getStudentFilters } from '../controllers/student.controller';
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/filters', requireAuth, getStudentFilters as any);
router.get('/search', requireAuth, searchStudents as any);
router.post('/', requireAuth, requireSuperAdmin, addStudent as any);

export default router;
