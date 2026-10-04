import express from 'express';
import {
  getBudgets,
  createBudget,
  deleteBudget,
  getBudgetSummary,
  generateAIBudgets,
  batchReplaceBudgets,
} from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/ai-generate', generateAIBudgets);
router.post('/batch-replace', batchReplaceBudgets);

router.get('/summary', getBudgetSummary);

router.route('/')
  .get(getBudgets)
  .post(createBudget);

router.route('/:id')
  .delete(deleteBudget);

export default router;
