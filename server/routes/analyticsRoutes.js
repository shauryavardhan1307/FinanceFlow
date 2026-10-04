import express from 'express';
import {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getPredictions,
  askFinancialCopilot,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/summary', getSummary);
router.get('/category-breakdown', getCategoryBreakdown);
router.get('/monthly-trend', getMonthlyTrend);
router.get('/predictions', getPredictions);
router.post('/chat', askFinancialCopilot);

export default router;
