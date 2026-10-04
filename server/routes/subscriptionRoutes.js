import express from 'express';
import {
  getSubscriptions,
  detectSubscriptions,
  createSubscription,
  deleteSubscription,
} from '../controllers/subscriptionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSubscriptions)
  .post(createSubscription);

router.post('/detect', detectSubscriptions);
router.delete('/:id', deleteSubscription);

export default router;
