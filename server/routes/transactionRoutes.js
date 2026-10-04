import express from 'express';
import multer from 'multer';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportCSV,
  parseTransaction,
  confirmTransaction,
  parseReceipt,
  parseSMS,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
});

router.use(protect); // All routes protected

// AI Parsing routes
router.post('/parse', parseTransaction);
router.post('/confirm', confirmTransaction);
router.post('/ocr', upload.single('receipt'), parseReceipt);
router.post('/parse-sms', parseSMS);

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.get('/export/csv', exportCSV);

router.route('/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

export default router;
