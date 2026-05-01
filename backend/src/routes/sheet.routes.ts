import { Router } from 'express';
import { 
  addRow,
  changeSheetStatus,
  createSheet,
  createSpreadsheet,
  deleteRow,
  deleteSheet,
  deleteSpreadsheet,
  discoverSpreadsheetTabs,
  downloadSheetCsv,
  getClauses,
  getDashboardStats,
  getGoogleIntegrationStatus,
  getSheetDetails,
  getSheets,
  getSpreadsheetDetails,
  getSpreadsheets,
  resendRowEmail,
  syncSheetToGoogle,
  updateGoogleIntegrationCredentials,
  updateRow,
} from '../controllers/sheet.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/dashboard-stats', getDashboardStats as any);
router.get('/clauses', getClauses as any);
router.get('/google/integration-status', getGoogleIntegrationStatus as any);
router.patch('/google/integration-status', updateGoogleIntegrationCredentials as any);
router.get('/spreadsheets', getSpreadsheets as any);
router.post('/spreadsheets', createSpreadsheet as any);
router.get('/spreadsheets/:id', getSpreadsheetDetails as any);
router.delete('/spreadsheets/:id', deleteSpreadsheet as any);
router.post('/spreadsheets/:id/discover-tabs', discoverSpreadsheetTabs as any);
router.post('/spreadsheets/:spreadsheetId/tabs', createSheet as any);

router.get('/', getSheets as any);
router.get('/tabs/:id', getSheetDetails as any);
router.delete('/tabs/:id', deleteSheet as any);
router.get('/tabs/:id/download', downloadSheetCsv as any);
router.post('/tabs/:id/rows', addRow as any);
router.put('/tabs/:id/rows/:rowId', updateRow as any);
router.delete('/tabs/:id/rows/:rowId', deleteRow as any);
router.post('/tabs/:id/rows/:rowId/resend-email', resendRowEmail as any);
router.post('/tabs/:id/status', changeSheetStatus as any);
router.post('/tabs/:id/sync-google', syncSheetToGoogle as any);

export default router;
