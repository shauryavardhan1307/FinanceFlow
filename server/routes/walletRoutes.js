import express from 'express';
import {
  createWallet,
  getWallets,
  getWallet,
  addMember,
  removeMember,
  addWalletTransaction,
  getWalletTransactions,
  deleteWalletTransaction,
  getWalletBalances,
  getWalletSettlements,
  recordWalletSettlement,
} from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWallets)
  .post(createWallet);

router.route('/:id')
  .get(getWallet);

router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);

router.route('/:id/transactions')
  .get(getWalletTransactions)
  .post(addWalletTransaction);

router.delete('/:id/transactions/:transactionId', deleteWalletTransaction);

router.get('/:id/balances', getWalletBalances);
router.get('/:id/settlements', getWalletSettlements);
router.post('/:id/settle', recordWalletSettlement);

export default router;
