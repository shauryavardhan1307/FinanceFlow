import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Safe user id getter for populated or unpopulated user references
const getUserId = (userField) => {
  if (!userField) return '';
  if (userField._id) return userField._id.toString();
  return userField.toString();
};

const isMemberOrOwner = (wallet, userId) => {
  if (!wallet || !userId) return false;
  const targetId = userId.toString();
  if (wallet.owner && getUserId(wallet.owner) === targetId) return true;
  return (wallet.members || []).some(m => getUserId(m.user) === targetId);
};

/**
 * Computes exact Splitwise balances and simplified debt settlements
 */
export const computeWalletBalancesAndSettlements = (wallet, transactions) => {
  const memberMap = {};
  const balances = {};
  const totalPaidByMember = {};
  const totalShareByMember = {};

  (wallet.members || []).forEach(m => {
    const id = getUserId(m.user) || m._id?.toString();
    if (id) {
      balances[id] = 0;
      totalPaidByMember[id] = 0;
      totalShareByMember[id] = 0;
      memberMap[id] = m.user && typeof m.user === 'object' && m.user._id
        ? m.user
        : { _id: id, name: m.email ? m.email.split('@')[0] : 'Member', email: m.email || '' };
    }
  });

  let totalExpenses = 0;

  transactions.forEach(tx => {
    if (tx.type === 'expense') {
      const payerId = tx.userId ? (tx.userId._id ? tx.userId._id.toString() : tx.userId.toString()) : '';
      const amount = Number(tx.amount) || 0;
      totalExpenses += amount;

      if (balances[payerId] !== undefined) {
        totalPaidByMember[payerId] = (totalPaidByMember[payerId] || 0) + amount;
      }

      let split;
      try {
        split = typeof tx.note === 'string' ? JSON.parse(tx.note) : tx.note;
      } catch (e) {
        split = null;
      }

      const splitType = split?.type || 'equal';

      if (splitType === 'exact' && split?.amounts) {
        // Exact amounts per user
        Object.entries(split.amounts).forEach(([memberId, owed]) => {
          const owedAmount = Number(owed) || 0;
          if (balances[memberId] !== undefined) {
            totalShareByMember[memberId] = (totalShareByMember[memberId] || 0) + owedAmount;
            balances[memberId] -= owedAmount;
          }
        });
        if (balances[payerId] !== undefined) {
          balances[payerId] += amount;
        }
      } else if (splitType === 'percentage' && split?.percentages) {
        // Percentage split
        Object.entries(split.percentages).forEach(([memberId, pct]) => {
          const owedAmount = (Number(pct) / 100) * amount;
          if (balances[memberId] !== undefined) {
            totalShareByMember[memberId] = (totalShareByMember[memberId] || 0) + owedAmount;
            balances[memberId] -= owedAmount;
          }
        });
        if (balances[payerId] !== undefined) {
          balances[payerId] += amount;
        }
      } else if (splitType === 'shares' && split?.shares) {
        // Shares split
        const totalShares = Object.values(split.shares).reduce((acc, s) => acc + (Number(s) || 0), 0) || 1;
        Object.entries(split.shares).forEach(([memberId, sh]) => {
          const owedAmount = ((Number(sh) || 0) / totalShares) * amount;
          if (balances[memberId] !== undefined) {
            totalShareByMember[memberId] = (totalShareByMember[memberId] || 0) + owedAmount;
            balances[memberId] -= owedAmount;
          }
        });
        if (balances[payerId] !== undefined) {
          balances[payerId] += amount;
        }
      } else {
        // Equal split (optionally subset of members)
        const participatingMemberIds = (split?.members && split.members.length > 0)
          ? split.members.filter(mId => balances[mId] !== undefined)
          : Object.keys(balances);

        const memberCount = participatingMemberIds.length || 1;
        const splitAmount = amount / memberCount;

        participatingMemberIds.forEach(mId => {
          totalShareByMember[mId] = (totalShareByMember[mId] || 0) + splitAmount;
          balances[mId] -= splitAmount;
        });
        if (balances[payerId] !== undefined) {
          balances[payerId] += amount;
        }
      }
    } else if (tx.type === 'settlement') {
      let split;
      try {
        split = typeof tx.note === 'string' ? JSON.parse(tx.note) : tx.note;
      } catch (e) {
        split = null;
      }
      if (split && split.payeeId) {
        const payerId = tx.userId ? (tx.userId._id ? tx.userId._id.toString() : tx.userId.toString()) : '';
        const payeeId = split.payeeId.toString();
        const amt = Number(tx.amount) || 0;
        if (balances[payerId] !== undefined) balances[payerId] += amt;
        if (balances[payeeId] !== undefined) balances[payeeId] -= amt;
      }
    }
  });

  // Debt simplification algorithm
  const debtors = [];
  const creditors = [];

  Object.entries(balances).forEach(([id, bal]) => {
    const rounded = Math.round(bal * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ id, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ id, amount: rounded });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settledAmount = Math.min(debtor.amount, creditor.amount);

    const fromUser = memberMap[debtor.id];
    const toUser = memberMap[creditor.id];

    if (fromUser && toUser && settledAmount > 0) {
      const upiId = toUser.email ? `${toUser.email.split('@')[0]}@okhdfcbank` : 'payee@upi';
      const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(toUser.name || 'Member')}&am=${settledAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Splitwise Settle - ' + wallet.name)}`;

      settlements.push({
        fromUser: { id: fromUser._id || debtor.id, name: fromUser.name || 'Member', email: fromUser.email || '' },
        toUser: { id: toUser._id || creditor.id, name: toUser.name || 'Member', email: toUser.email || '' },
        amount: Math.round(settledAmount * 100) / 100,
        upiId,
        upiUri,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  const balanceList = Object.entries(balances).map(([id, net]) => ({
    userId: id,
    name: memberMap[id]?.name || 'Member',
    email: memberMap[id]?.email || '',
    netBalance: Math.round(net * 100) / 100,
    totalPaid: Math.round((totalPaidByMember[id] || 0) * 100) / 100,
    totalShare: Math.round((totalShareByMember[id] || 0) * 100) / 100,
  }));

  return {
    balances: balanceList,
    settlements,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
  };
};

/**
 * @desc    Create a wallet
 * @route   POST /api/v1/wallets
 * @access  Private
 */
export const createWallet = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const wallet = await Wallet.create({
      name,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, email: req.user.email, role: 'admin' }],
    });

    res.status(201).json({ success: true, data: wallet });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all wallets user is a member or owner of
 * @route   GET /api/v1/wallets
 * @access  Private
 */
export const getWallets = async (req, res, next) => {
  try {
    const wallets = await Wallet.find({
      $or: [
        { 'members.user': req.user._id },
        { owner: req.user._id }
      ]
    }).populate('members.user', 'name email avatar');

    res.status(200).json({ success: true, data: wallets });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single wallet
 * @route   GET /api/v1/wallets/:id
 * @access  Private
 */
export const getWallet = async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.id).populate('members.user', 'name email avatar');

    if (!wallet) {
      res.status(404);
      throw new Error('Wallet not found');
    }

    const isMember = isMemberOrOwner(wallet, req.user._id);
    if (!isMember) {
      res.status(403);
      throw new Error('Not authorized to access this wallet');
    }

    res.status(200).json({ success: true, data: wallet });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all transactions in a wallet
 * @route   GET /api/v1/wallets/:id/transactions
 * @access  Private
 */
export const getWalletTransactions = async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const isMember = isMemberOrOwner(wallet, req.user._id);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this wallet' });
    }

    const transactions = await Transaction.find({ walletId: wallet._id })
      .populate('userId', 'name email avatar')
      .sort({ date: -1, createdAt: -1 });

    // Enhance transactions with parsed split details & payee information
    const enhancedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const txObj = tx.toObject();
        let split = null;
        try {
          split = typeof tx.note === 'string' ? JSON.parse(tx.note) : tx.note;
        } catch (_) {}

        txObj.splitDetails = split;

        if (tx.type === 'settlement' && split?.payeeId) {
          const payee = await User.findById(split.payeeId).select('name email avatar');
          txObj.payee = payee;
        }

        return txObj;
      })
    );

    res.status(200).json({ success: true, data: enhancedTransactions });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a shared transaction (expense) to wallet
 * @route   POST /api/v1/wallets/:id/transactions
 * @access  Private
 */
export const addWalletTransaction = async (req, res, next) => {
  try {
    const { amount, category, description, type, splitLogic, paidBy, date } = req.body;

    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error('Wallet not found');
    }

    const isMember = isMemberOrOwner(wallet, req.user._id);
    if (!isMember) {
      res.status(403);
      throw new Error('Not a member of this wallet');
    }

    // Payer can be explicitly selected (e.g., friend paid) or default to current user
    let payerId = req.user._id;
    if (paidBy && isMemberOrOwner(wallet, paidBy)) {
      payerId = paidBy;
    }

    const transaction = await Transaction.create({
      userId: payerId,
      walletId: wallet._id,
      type: type || 'expense',
      amount: Number(amount),
      category: category || 'General',
      description: description || 'Group Expense',
      date: date ? new Date(date) : new Date(),
      note: typeof splitLogic === 'string' ? splitLogic : JSON.stringify(splitLogic)
    });

    const populated = await Transaction.findById(transaction._id).populate('userId', 'name email avatar');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a transaction from wallet
 * @route   DELETE /api/v1/wallets/:id/transactions/:transactionId
 * @access  Private
 */
export const deleteWalletTransaction = async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const isMember = isMemberOrOwner(wallet, req.user._id);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this wallet' });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.transactionId,
      walletId: wallet._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isOwner = getUserId(wallet.owner) === req.user._id.toString();
    const isPayer = getUserId(transaction.userId) === req.user._id.toString();
    const memberRecord = wallet.members.find(m => getUserId(m.user) === req.user._id.toString());
    const isAdmin = memberRecord?.role === 'admin';

    if (!isOwner && !isPayer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the payer or wallet admin can delete this transaction' });
    }

    await Transaction.deleteOne({ _id: transaction._id });

    res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add member to wallet
 * @route   POST /api/v1/wallets/:id/members
 * @access  Private
 */
export const addMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400);
      throw new Error('Please provide an email');
    }

    const wallet = await Wallet.findById(req.params.id);

    if (!wallet) {
      res.status(404);
      throw new Error('Wallet not found');
    }

    const isOwner = getUserId(wallet.owner) === req.user._id.toString();
    const memberRecord = wallet.members.find(m => getUserId(m.user) === req.user._id.toString());
    if (!isOwner && (!memberRecord || memberRecord.role !== 'admin')) {
      res.status(403);
      throw new Error('Only admins can add members');
    }

    const userToAdd = await User.findOne({ email });

    if (!userToAdd) {
      res.status(404);
      throw new Error('User not found in the system');
    }

    // Check if already a member
    if (wallet.members.some(m => getUserId(m.user) === userToAdd._id.toString())) {
      res.status(400);
      throw new Error('User is already a member');
    }

    wallet.members.push({ user: userToAdd._id, email: userToAdd.email, role: 'member' });
    await wallet.save();

    const updated = await Wallet.findById(req.params.id).populate('members.user', 'name email avatar');
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove member from wallet
 * @route   DELETE /api/v1/wallets/:id/members/:memberId
 * @access  Private
 */
export const removeMember = async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.id);

    if (!wallet) {
      res.status(404);
      throw new Error('Wallet not found');
    }

    const isOwner = getUserId(wallet.owner) === req.user._id.toString();
    const memberRecord = wallet.members.find(m => getUserId(m.user) === req.user._id.toString());
    
    // User can remove themselves, or admin can remove others
    if (!isOwner && (!memberRecord || (memberRecord.role !== 'admin' && req.user._id.toString() !== req.params.memberId))) {
      res.status(403);
      throw new Error('Not authorized to remove members');
    }

    // Prevent removing the owner
    if (wallet.owner && getUserId(wallet.owner) === req.params.memberId) {
      res.status(400);
      throw new Error('Cannot remove the wallet owner');
    }

    wallet.members = wallet.members.filter(m => getUserId(m.user) !== req.params.memberId && m._id?.toString() !== req.params.memberId);
    await wallet.save();

    const updated = await Wallet.findById(req.params.id).populate('members.user', 'name email avatar');
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get wallet balances (who owes whom)
 * @route   GET /api/v1/wallets/:id/balances
 * @access  Private
 */
export const getWalletBalances = async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.id).populate('members.user', 'name email avatar');
    if (!wallet) {
      res.status(404);
      throw new Error('Wallet not found');
    }

    const isMember = isMemberOrOwner(wallet, req.user._id);
    if (!isMember) {
      res.status(403);
      throw new Error('Not authorized to access this wallet');
    }

    const transactions = await Transaction.find({ walletId: wallet._id });
    const { balances, totalExpenses } = computeWalletBalancesAndSettlements(wallet, transactions);

    res.status(200).json({ success: true, data: balances, totalExpenses });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get simplified pairwise settlements with UPI payment details
 * @route   GET /api/v1/wallets/:id/settlements
 * @access  Private
 */
export const getWalletSettlements = async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.id).populate('members.user', 'name email avatar');
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const isMember = isMemberOrOwner(wallet, req.user._id);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this wallet' });
    }

    const transactions = await Transaction.find({ walletId: wallet._id });
    const { settlements, balances, totalExpenses } = computeWalletBalancesAndSettlements(wallet, transactions);

    res.status(200).json({
      success: true,
      data: {
        settlements,
        balances,
        totalExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record a settlement payment between members
 * @route   POST /api/v1/wallets/:id/settle
 * @access  Private
 */
export const recordWalletSettlement = async (req, res, next) => {
  try {
    const { payeeId, payerId, amount, date, notes } = req.body;
    const wallet = await Wallet.findById(req.params.id);

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const isMember = isMemberOrOwner(wallet, req.user._id);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to record settlement in this wallet' });
    }

    if (!payeeId || !amount) {
      return res.status(400).json({ success: false, message: 'Payee and amount are required' });
    }

    const actualPayerId = payerId || req.user._id;

    const transaction = await Transaction.create({
      userId: actualPayerId,
      walletId: wallet._id,
      type: 'settlement',
      amount: Number(amount),
      category: 'Settlement',
      description: 'Settlement Payment',
      date: date ? new Date(date) : new Date(),
      note: JSON.stringify({ payeeId, notes }),
    });

    const populated = await Transaction.findById(transaction._id).populate('userId', 'name email avatar');

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Settlement recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};
