import { Router } from 'express';
import multer from 'multer';
import {
  getRoleStudentFullInfo,
  getRoleStudentHistory,
  getRoleStudentInfo,
  uploadRoleJson,
} from '../controllers/role.controller';
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

router.use(requireAuth);

router.post('/upload-json', requireSuperAdmin, upload.single('file'), uploadRoleJson as any);
router.get('/student/:roll/history', getRoleStudentHistory as any);
router.get('/student/:roll/full-info', getRoleStudentFullInfo as any);
router.get('/student/:roll', getRoleStudentInfo as any);

export default router;
