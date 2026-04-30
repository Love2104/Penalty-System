import { Router } from 'express';
import { 
  createSheet, getSheets, getSheetDetails, 
  addRow, updateRow, deleteRow, changeSheetStatus,
  getClauses
} from '../controllers/sheet.controller';
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', createSheet as any);
router.get('/', getSheets as any);
router.get('/clauses', getClauses as any);
router.get('/:id', getSheetDetails as any);

router.post('/:id/rows', addRow as any);
router.put('/:id/rows/:rowId', updateRow as any);
router.delete('/:id/rows/:rowId', deleteRow as any);

router.post('/:id/status', changeSheetStatus as any);

export default router;
