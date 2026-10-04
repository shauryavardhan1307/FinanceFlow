import express from 'express';
import {
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
} from '../controllers/alertController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getAlerts);
router.patch('/read-all', markAllAlertsAsRead);
router.patch('/:id/read', markAlertAsRead);
router.delete('/:id', deleteAlert);

export default router;
