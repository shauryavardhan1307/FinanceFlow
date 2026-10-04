import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import Modal from '../components/ui/Modal';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';
import { 
  HiOutlinePlus, 
  HiOutlineUserGroup, 
  HiOutlineArrowLeft, 
  HiOutlineTrash, 
  HiOutlineCurrencyDollar,
  HiOutlineUsers,
  HiOutlineQrCode,
  HiOutlineCheckCircle,
  HiOutlineReceiptPercent,
  HiOutlineScale,
  HiOutlineCalendarDays,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineArrowPath,
  HiOutlineSparkles,
  HiOutlineBanknotes
} from 'react-icons/hi2';

const CATEGORIES = [
  { id: 'Food & Dining', label: 'Food & Dining', icon: '🍔' },
  { id: 'Groceries', label: 'Groceries', icon: '🛒' },
  { id: 'Transportation', label: 'Transportation', icon: '🚕' },
  { id: 'Entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'Rent & Living', label: 'Rent & Living', icon: '🏠' },
  { id: 'Utilities & Bills', label: 'Utilities & Bills', icon: '⚡' },
  { id: 'Shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'General', label: 'General', icon: '📄' },
];

export default function WalletsPage() {
  const { user } = useAuth();
  const { currencySymbol, formatCurrency } = useCurrency();
  const currentUserId = user?._id || user?.id || '';
  
  // Data States
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [walletDetails, setWalletDetails] = useState(null);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Active Tab: 'expenses' | 'balances' | 'members'
  const [activeTab, setActiveTab] = useState('expenses');
  const [expandedTxId, setExpandedTxId] = useState(null);

  // Settlement & UPI Modal states
  const [activeSettlement, setActiveSettlement] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [settling, setSettling] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');

  // Add Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'Food & Dining',
    paidBy: '',
    date: new Date().toISOString().split('T')[0],
    splitType: 'equal', // 'equal' | 'exact' | 'percentage' | 'shares'
    equalMembers: [], // member userIds
    exactAmounts: {}, // { [userId]: number }
    percentages: {}, // { [userId]: number }
    shares: {}, // { [userId]: number }
  });

  // Direct Settle Up Form State
  const [settleForm, setSettleForm] = useState({
    payerId: '',
    payeeId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: 'Settled via cash/app'
  });

  // Fetch all wallets
  const fetchWallets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/wallets');
      if (res.data.success) {
        setWallets(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch wallets');
    } finally {
      setLoading(false);
    }
  };

  // Fetch full details of single wallet
  const fetchWalletDetails = async (id) => {
    try {
      setDetailsLoading(true);
      const [detailsRes, balancesRes, settlementsRes, transactionsRes] = await Promise.allSettled([
        api.get(`/wallets/${id}`),
        api.get(`/wallets/${id}/balances`),
        api.get(`/wallets/${id}/settlements`),
        api.get(`/wallets/${id}/transactions`)
      ]);
      
      if (detailsRes.status === 'fulfilled' && detailsRes.value?.data?.success) {
        setWalletDetails(detailsRes.value.data.data);
      } else {
        const errorMsg = detailsRes.reason?.response?.data?.message || 'Failed to fetch wallet details';
        toast.error(errorMsg);
        setSelectedWalletId(null);
        return;
      }

      if (balancesRes.status === 'fulfilled' && balancesRes.value?.data?.success) {
        setBalances(balancesRes.value.data.data || []);
        if (balancesRes.value.data.totalExpenses !== undefined) {
          setTotalExpenses(balancesRes.value.data.totalExpenses);
        }
      } else {
        setBalances([]);
      }

      if (settlementsRes.status === 'fulfilled' && settlementsRes.value?.data?.success) {
        setSettlements(settlementsRes.value.data.data.settlements || []);
        if (settlementsRes.value.data.data.totalExpenses !== undefined) {
          setTotalExpenses(settlementsRes.value.data.data.totalExpenses);
        }
      } else {
        setSettlements([]);
      }

      if (transactionsRes.status === 'fulfilled' && transactionsRes.value?.data?.success) {
        setTransactions(transactionsRes.value.data.data || []);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      toast.error('Failed to fetch wallet details');
      setSelectedWalletId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedWalletId) {
      fetchWallets();
    } else {
      fetchWalletDetails(selectedWalletId);
    }
  }, [selectedWalletId]);

  // Normalized list of wallet members with ID and readable name
  const membersList = useMemo(() => {
    if (!walletDetails?.members) return [];
    return walletDetails.members.map(m => {
      const uId = m.user?._id ? m.user._id.toString() : (m.user ? m.user.toString() : m._id.toString());
      const name = m.user?.name || (m.email ? m.email.split('@')[0] : 'Member');
      return {
        id: uId,
        name: uId === currentUserId ? 'You' : name,
        rawName: name,
        email: m.user?.email || m.email || '',
        avatar: m.user?.avatar || null,
        role: m.role || 'member'
      };
    });
  }, [walletDetails, currentUserId]);

  // Personal net balance for current user in this wallet
  const myNetBalance = useMemo(() => {
    const rec = balances.find(b => b.userId === currentUserId);
    return rec ? rec.netBalance : 0;
  }, [balances, currentUserId]);

  // Current user's total paid and total share
  const myStats = useMemo(() => {
    const rec = balances.find(b => b.userId === currentUserId);
    return {
      totalPaid: rec?.totalPaid || 0,
      totalShare: rec?.totalShare || 0
    };
  }, [balances, currentUserId]);

  // Open Add Expense modal pre-populated
  const handleOpenAddExpense = () => {
    const allMemberIds = membersList.map(m => m.id);
    const initialExact = {};
    const initialPercentages = {};
    const initialShares = {};
    allMemberIds.forEach(id => {
      initialExact[id] = '';
      initialPercentages[id] = Math.round(100 / allMemberIds.length);
      initialShares[id] = 1;
    });

    setExpenseForm({
      description: '',
      amount: '',
      category: 'Food & Dining',
      paidBy: currentUserId,
      date: new Date().toISOString().split('T')[0],
      splitType: 'equal',
      equalMembers: allMemberIds,
      exactAmounts: initialExact,
      percentages: initialPercentages,
      shares: initialShares,
    });
    setIsExpenseModalOpen(true);
  };

  // Open Settle Up modal pre-populated
  const handleOpenSettleUp = (preset = null) => {
    if (preset) {
      setSettleForm({
        payerId: preset.fromUser.id,
        payeeId: preset.toUser.id,
        amount: preset.amount,
        date: new Date().toISOString().split('T')[0],
        notes: `Settle up debt between ${preset.fromUser.name} and ${preset.toUser.name}`
      });
    } else {
      // Find who the current user owes, or who owes current user
      const userDebt = settlements.find(s => s.fromUser.id === currentUserId);
      const userCredit = settlements.find(s => s.toUser.id === currentUserId);
      
      if (userDebt) {
        setSettleForm({
          payerId: currentUserId,
          payeeId: userDebt.toUser.id,
          amount: userDebt.amount,
          date: new Date().toISOString().split('T')[0],
          notes: 'Settled up'
        });
      } else if (userCredit) {
        setSettleForm({
          payerId: userCredit.fromUser.id,
          payeeId: currentUserId,
          amount: userCredit.amount,
          date: new Date().toISOString().split('T')[0],
          notes: 'Settled up'
        });
      } else {
        const firstMember = membersList.find(m => m.id !== currentUserId);
        setSettleForm({
          payerId: currentUserId,
          payeeId: firstMember?.id || '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: 'Direct settlement'
        });
      }
    }
    setIsSettleModalOpen(true);
  };

  // Open UPI QR Modal
  const handleOpenUpi = async (s) => {
    setActiveSettlement(s);
    try {
      const url = await QRCode.toDataURL(s.upiUri, { 
        width: 256, 
        margin: 2, 
        color: { dark: '#0f172a', light: '#ffffff' } 
      });
      setQrCodeDataUrl(url);
      setIsUpiModalOpen(true);
    } catch (err) {
      toast.error('Failed to generate UPI QR Code');
    }
  };

  // Confirm settlement via UPI modal
  const handleConfirmSettlement = async (s) => {
    setSettling(true);
    try {
      await api.post(`/wallets/${selectedWalletId}/settle`, {
        payerId: s.fromUser.id,
        payeeId: s.toUser.id,
        amount: s.amount
      });
      toast.success(`Settlement of ${currencySymbol}${s.amount} recorded! 🎉`);
      setIsUpiModalOpen(false);
      fetchWalletDetails(selectedWalletId);
    } catch (err) {
      toast.error('Failed to record settlement');
    } finally {
      setSettling(false);
    }
  };

  // Submit Direct Settle Up
  const handleSubmitSettleUp = async (e) => {
    e.preventDefault();
    if (!settleForm.payerId || !settleForm.payeeId || !settleForm.amount) {
      toast.error('Please fill in payer, recipient, and amount');
      return;
    }
    if (settleForm.payerId === settleForm.payeeId) {
      toast.error('Payer and payee cannot be the same person');
      return;
    }
    try {
      setSettling(true);
      await api.post(`/wallets/${selectedWalletId}/settle`, {
        payerId: settleForm.payerId,
        payeeId: settleForm.payeeId,
        amount: Number(settleForm.amount),
        date: settleForm.date,
        notes: settleForm.notes
      });
      toast.success('Payment recorded successfully! 🎉');
      setIsSettleModalOpen(false);
      fetchWalletDetails(selectedWalletId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setSettling(false);
    }
  };

  // Submit Add Expense
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amountNum = Number(expenseForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Build split logic based on selected type
    let splitLogic = { type: expenseForm.splitType };

    if (expenseForm.splitType === 'equal') {
      if (expenseForm.equalMembers.length === 0) {
        toast.error('Please select at least one person in the split');
        return;
      }
      splitLogic.members = expenseForm.equalMembers;
    } else if (expenseForm.splitType === 'exact') {
      const sum = Object.values(expenseForm.exactAmounts).reduce((acc, val) => acc + (Number(val) || 0), 0);
      if (Math.abs(sum - amountNum) > 0.05) {
        toast.error(`Amounts sum to ${currencySymbol}${sum.toFixed(2)}, which does not match total ${currencySymbol}${amountNum.toFixed(2)}`);
        return;
      }
      splitLogic.amounts = expenseForm.exactAmounts;
    } else if (expenseForm.splitType === 'percentage') {
      const sumPct = Object.values(expenseForm.percentages).reduce((acc, val) => acc + (Number(val) || 0), 0);
      if (Math.abs(sumPct - 100) > 0.5) {
        toast.error(`Percentages sum to ${sumPct}%, but must equal 100%`);
        return;
      }
      splitLogic.percentages = expenseForm.percentages;
    } else if (expenseForm.splitType === 'shares') {
      splitLogic.shares = expenseForm.shares;
    }

    try {
      const payload = {
        amount: amountNum,
        description: expenseForm.description,
        category: expenseForm.category,
        paidBy: expenseForm.paidBy || currentUserId,
        date: expenseForm.date,
        splitLogic
      };

      const res = await api.post(`/wallets/${selectedWalletId}/transactions`, payload);
      if (res.data.success) {
        toast.success('Expense added successfully! 💸');
        setIsExpenseModalOpen(false);
        fetchWalletDetails(selectedWalletId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add expense');
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (txId, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this transaction? Balances will be automatically recalculated.')) {
      return;
    }
    try {
      const res = await api.delete(`/wallets/${selectedWalletId}/transactions/${txId}`);
      if (res.data.success) {
        toast.success('Transaction removed');
        fetchWalletDetails(selectedWalletId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete transaction');
    }
  };

  // Create Wallet
  const handleCreateWallet = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/wallets', createForm);
      if (res.data.success) {
        toast.success('Wallet created successfully');
        setIsCreateModalOpen(false);
        setCreateForm({ name: '', description: '' });
        fetchWallets();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create wallet');
    }
  };

  // Invite Member
  const handleInviteMember = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/wallets/${selectedWalletId}/members`, { email: inviteEmail });
      if (res.data.success) {
        toast.success('Member invited successfully');
        setIsInviteModalOpen(false);
        setInviteEmail('');
        fetchWalletDetails(selectedWalletId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite member');
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await api.delete(`/wallets/${selectedWalletId}/members/${memberId}`);
      if (res.data.success) {
        toast.success('Member removed');
        fetchWalletDetails(selectedWalletId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  // Helper to calculate user's share for an expense
  const calculatePersonalImpact = (tx) => {
    if (tx.type === 'settlement') {
      const payerId = tx.userId?._id ? tx.userId._id.toString() : tx.userId?.toString();
      const payeeId = tx.splitDetails?.payeeId?.toString() || tx.payee?._id?.toString();

      if (payerId === currentUserId) {
        return { type: 'settlement_paid', text: `You paid ${currencySymbol}${tx.amount.toLocaleString()}`, amount: tx.amount, color: 'text-text-primary' };
      } else if (payeeId === currentUserId) {
        return { type: 'settlement_received', text: `You received ${currencySymbol}${tx.amount.toLocaleString()}`, amount: tx.amount, color: 'text-success' };
      }
      return { type: 'settlement_other', text: 'Settlement payment', amount: tx.amount, color: 'text-text-muted' };
    }

    const payerId = tx.userId?._id ? tx.userId._id.toString() : tx.userId?.toString();
    const split = tx.splitDetails;
    let myShare = 0;

    if (!split || split.type === 'equal') {
      const participating = (split?.members && split.members.length > 0)
        ? split.members
        : membersList.map(m => m.id);
      if (participating.includes(currentUserId)) {
        myShare = tx.amount / participating.length;
      }
    } else if (split.type === 'exact' && split.amounts) {
      myShare = Number(split.amounts[currentUserId]) || 0;
    } else if (split.type === 'percentage' && split.percentages) {
      myShare = ((Number(split.percentages[currentUserId]) || 0) / 100) * tx.amount;
    } else if (split.type === 'shares' && split.shares) {
      const totalShares = Object.values(split.shares).reduce((a, b) => a + (Number(b) || 0), 0) || 1;
      myShare = ((Number(split.shares[currentUserId]) || 0) / totalShares) * tx.amount;
    }

    if (payerId === currentUserId) {
      const lent = tx.amount - myShare;
      if (lent > 0.01) {
        return { type: 'lent', text: 'you lent', amount: Math.round(lent * 100) / 100, color: 'text-success' };
      }
      return { type: 'neutral', text: 'you paid for yourself', amount: tx.amount, color: 'text-text-muted' };
    } else {
      if (myShare > 0.01) {
        return { type: 'borrowed', text: 'you borrowed', amount: Math.round(myShare * 100) / 100, color: 'text-amber-500' };
      }
      return { type: 'not_involved', text: 'not involved', amount: 0, color: 'text-text-muted' };
    }
  };

  // Helper to get category icon
  const getCategoryIcon = (categoryName) => {
    const found = CATEGORIES.find(c => c.id === categoryName || c.label === categoryName);
    return found ? found.icon : '💸';
  };

  // ==========================================
  // SINGLE WALLET VIEW (SPLITWISE STYLE)
  // ==========================================
  if (selectedWalletId) {
    if (detailsLoading || !walletDetails) {
      return (
        <div className="flex flex-col justify-center items-center h-96 gap-3">
          <div className="w-10 h-10 border-3 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-text-muted">Loading your Splitwise group...</span>
        </div>
      );
    }

    const isAdmin = walletDetails.owner === currentUserId || 
      walletDetails.members?.some(m => (m.user?._id || m.user) === currentUserId && m.role === 'admin');

    return (
      <div className="space-y-6 animate-fade-in pb-16">
        {/* Top Navigation & Group Header */}
        <div className="glass-card p-5 sm:p-6 bg-white rounded-2xl border border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <button 
                onClick={() => setSelectedWalletId(null)}
                className="p-2.5 bg-bg-input hover:bg-bg-hover rounded-xl text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                title="Back to all wallets"
              >
                <HiOutlineArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold font-display text-text-primary">{walletDetails.name}</h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-accent-primary font-semibold border border-blue-100">
                    {membersList.length} members
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                  {walletDetails.description || 'Splitwise shared expense group'}
                </p>
              </div>
            </div>

            {/* Splitwise Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button 
                onClick={handleOpenAddExpense}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
              >
                <HiOutlinePlus className="w-4 h-4" />
                <span>Add an expense</span>
              </button>

              <button 
                onClick={() => handleOpenSettleUp()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
              >
                <HiOutlineCheckCircle className="w-4 h-4" />
                <span>Settle up</span>
              </button>

              <button 
                onClick={() => setIsInviteModalOpen(true)}
                className="p-2.5 bg-bg-input hover:bg-bg-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-colors"
                title="Invite Member"
              >
                <HiOutlineUsers className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Splitwise Signature Hero Status Ribbon */}
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              myNetBalance > 0.01 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : myNetBalance < -0.01 
                ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
                : 'bg-slate-50/80 border-slate-200 text-text-secondary'
            }`}>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Your Status</span>
                <p className="text-base font-extrabold mt-0.5">
                  {myNetBalance > 0.01 ? (
                    <span className="text-emerald-700">You are owed {currencySymbol}{myNetBalance.toLocaleString()}</span>
                  ) : myNetBalance < -0.01 ? (
                    <span className="text-amber-700">You owe {currencySymbol}{Math.abs(myNetBalance).toLocaleString()}</span>
                  ) : (
                    <span>All settled up</span>
                  )}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white shadow-xs">
                {myNetBalance > 0.01 ? (
                  <span className="text-xl">💰</span>
                ) : myNetBalance < -0.01 ? (
                  <span className="text-xl">🤝</span>
                ) : (
                  <span className="text-xl">🎉</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg-input/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Group Spend</span>
                <p className="text-base font-extrabold text-text-primary mt-0.5">
                  {currencySymbol}{totalExpenses.toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white shadow-xs text-xl">
                📊
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg-input/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Your Share vs Paid</span>
                <p className="text-xs font-semibold text-text-secondary mt-0.5">
                  Paid: <span className="font-bold text-text-primary">{currencySymbol}{myStats.totalPaid.toLocaleString()}</span> • Share: <span className="font-bold text-text-primary">{currencySymbol}{myStats.totalShare.toLocaleString()}</span>
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white shadow-xs text-xl">
                ⚖️
              </div>
            </div>
          </div>
        </div>

        {/* Splitwise Tab Navigation */}
        <div className="flex border-b border-border gap-6 text-sm font-semibold">
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'expenses'
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <HiOutlineReceiptPercent className="w-5 h-5" />
            <span>Expenses & Activity ({transactions.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('balances')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'balances'
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <HiOutlineScale className="w-5 h-5" />
            <span>Balances & Debt Simplification</span>
            {settlements.length > 0 && (
              <span className="w-5 h-5 text-[10px] rounded-full bg-accent-primary text-white flex items-center justify-center font-bold">
                {settlements.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('members')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'members'
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <HiOutlineUserGroup className="w-5 h-5" />
            <span>Group Members ({membersList.length})</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: EXPENSES & ACTIVITY STREAM (SPLITWISE STYLE) */}
        {/* ======================================================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="p-12 glass-card rounded-2xl border border-border text-center bg-white">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-accent-primary mx-auto flex items-center justify-center text-3xl mb-3 shadow-xs">
                  🧾
                </div>
                <h3 className="text-lg font-bold text-text-primary">No expenses in this wallet yet</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 mb-5">
                  Split your dinner bills, grocery runs, taxi rides, or trip expenses with clean math!
                </p>
                <button
                  onClick={handleOpenAddExpense}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-colors"
                >
                  <HiOutlinePlus className="w-4 h-4" />
                  <span>Add First Expense</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const impact = calculatePersonalImpact(tx);
                  const isExpanded = expandedTxId === tx._id;
                  const payerName = tx.userId?._id === currentUserId || tx.userId === currentUserId
                    ? 'You'
                    : (tx.userId?.name || 'Member');
                  const txDate = new Date(tx.date || tx.createdAt);
                  const monthStr = txDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const dayNum = txDate.getDate();

                  return (
                    <div 
                      key={tx._id}
                      className="glass-card bg-white rounded-xl border border-border overflow-hidden hover:border-slate-300 transition-all shadow-xs"
                    >
                      {/* Clickable Card Header */}
                      <div 
                        onClick={() => setExpandedTxId(isExpanded ? null : tx._id)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Splitwise Date Badge */}
                          <div className="w-11 h-11 rounded-xl bg-slate-100 flex flex-col items-center justify-center flex-shrink-0 text-text-secondary border border-border/80">
                            <span className="text-[9px] font-extrabold uppercase tracking-tight text-text-muted">{monthStr}</span>
                            <span className="text-sm font-black leading-none text-text-primary">{dayNum}</span>
                          </div>

                          {/* Category Emoji Icon */}
                          <div className="w-10 h-10 rounded-xl bg-bg-input flex items-center justify-center text-lg flex-shrink-0">
                            {tx.type === 'settlement' ? '🤝' : getCategoryIcon(tx.category)}
                          </div>

                          {/* Title & Who Paid */}
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-text-primary truncate">
                              {tx.description || (tx.type === 'settlement' ? 'Settlement Payment' : 'Expense')}
                            </h4>
                            <p className="text-xs text-text-muted truncate mt-0.5">
                              {tx.type === 'settlement' ? (
                                <span>
                                  <strong className="text-text-secondary">{payerName}</strong> paid{' '}
                                  <strong className="text-text-secondary">{tx.payee?.name || 'recipient'}</strong>
                                </span>
                              ) : (
                                <span>
                                  <strong className="text-text-secondary">{payerName}</strong> paid {currencySymbol}{tx.amount.toLocaleString()}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Splitwise Right-Side Impact Column */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-text-muted block">
                              {impact.text}
                            </span>
                            <span className={`text-sm sm:text-base font-extrabold ${impact.color}`}>
                              {impact.type === 'lent' && '+'}
                              {impact.type === 'borrowed' && '-'}
                              {currencySymbol}{impact.amount.toLocaleString()}
                            </span>
                          </div>

                          <div className="text-text-muted">
                            {isExpanded ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Breakdown Drawer */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-border/70 bg-slate-50/50 space-y-3">
                          <div className="flex items-center justify-between text-xs text-text-muted">
                            <span>Recorded on {txDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            <span className="capitalize font-semibold bg-bg-input px-2 py-0.5 rounded border border-border">
                              Split: {tx.splitDetails?.type || 'equal'}
                            </span>
                          </div>

                          {/* Split Details Breakdown */}
                          {tx.type === 'expense' && (
                            <div className="p-3 rounded-xl bg-white border border-border text-xs space-y-1.5">
                              <span className="font-bold text-text-secondary block mb-1">Split Breakdown:</span>
                              {membersList.map((m) => {
                                const split = tx.splitDetails;
                                let memberShare = 0;
                                if (!split || split.type === 'equal') {
                                  const parts = split?.members?.length > 0 ? split.members : membersList.map(x => x.id);
                                  if (parts.includes(m.id)) memberShare = tx.amount / parts.length;
                                } else if (split.type === 'exact') {
                                  memberShare = Number(split.amounts?.[m.id]) || 0;
                                } else if (split.type === 'percentage') {
                                  memberShare = ((Number(split.percentages?.[m.id]) || 0) / 100) * tx.amount;
                                } else if (split.type === 'shares') {
                                  const total = Object.values(split.shares).reduce((a, b) => a + (Number(b) || 0), 0) || 1;
                                  memberShare = ((Number(split.shares?.[m.id]) || 0) / total) * tx.amount;
                                }

                                if (memberShare <= 0) return null;

                                return (
                                  <div key={m.id} className="flex justify-between items-center text-text-secondary py-0.5">
                                    <span>{m.name}</span>
                                    <span className="font-semibold text-text-primary">{currencySymbol}{memberShare.toFixed(2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Delete Transaction Action */}
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={(e) => handleDeleteTransaction(tx._id, e)}
                              className="px-3 py-1.5 text-danger hover:bg-danger/10 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                              <span>Delete Entry</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: BALANCES & SIMPLIFIED DEBT SETTLEMENTS */}
        {/* ======================================================== */}
        {activeTab === 'balances' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Member Net Balances */}
            <div className="glass-card p-6 rounded-2xl border border-border bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                  <HiOutlineScale className="w-5 h-5 text-accent-primary" />
                  <span>Member Balances</span>
                </h3>
                <span className="text-xs text-text-muted">{balances.length} members</span>
              </div>

              <div className="space-y-2.5">
                {balances.map((b) => (
                  <div 
                    key={b.userId}
                    className="p-3 rounded-xl border border-border bg-bg-input/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center font-bold text-xs uppercase">
                        {b.name ? b.name.charAt(0) : 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">
                          {b.userId === currentUserId ? `${b.name} (You)` : b.name}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          Paid: {currencySymbol}{b.totalPaid || 0} • Share: {currencySymbol}{b.totalShare || 0}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {b.netBalance > 0.01 ? (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 block">gets back</span>
                          <span className="text-sm font-extrabold text-success">+{currencySymbol}{b.netBalance.toLocaleString()}</span>
                        </div>
                      ) : b.netBalance < -0.01 ? (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-amber-600 block">owes</span>
                          <span className="text-sm font-extrabold text-amber-500">-{currencySymbol}{Math.abs(b.netBalance).toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-text-muted">settled up</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Splitwise Debt Simplification Settlement Plan */}
            <div className="glass-card p-6 rounded-2xl border border-border bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                    <HiOutlineQrCode className="w-5 h-5 text-emerald-600" />
                    <span>Simplified Settlement Plan</span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Debt minimization algorithm matching debtors to creditors
                  </p>
                </div>
              </div>

              {settlements.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col items-center gap-2">
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-bold text-emerald-900">Everyone is fully squared away!</p>
                  <p className="text-xs text-emerald-700">No debts or pending settlements in this wallet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((s, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-xl border border-border bg-bg-input/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                          <span>{s.fromUser.id === currentUserId ? 'You' : s.fromUser.name}</span>
                          <span className="text-xs font-normal text-text-muted">owes</span>
                          <span className="text-accent-primary">{s.toUser.id === currentUserId ? 'You' : s.toUser.name}</span>
                        </div>
                        <span className="text-xs text-text-muted">UPI: {s.upiId}</span>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        <span className="text-base font-extrabold text-text-primary">
                          {currencySymbol}{s.amount.toLocaleString()}
                        </span>

                        <button 
                          onClick={() => handleOpenUpi(s)}
                          className="px-3 py-1.5 bg-accent-primary hover:bg-accent-secondary text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-colors"
                          title="Generate UPI QR Code"
                        >
                          <HiOutlineQrCode className="w-3.5 h-3.5" />
                          <span>Pay UPI</span>
                        </button>

                        <button 
                          onClick={() => handleOpenSettleUp(s)}
                          className="px-3 py-1.5 bg-bg-input hover:bg-bg-hover text-text-primary border border-border rounded-lg text-xs font-bold transition-colors"
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: GROUP MEMBERS & MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'members' && (
          <div className="glass-card p-6 rounded-2xl border border-border bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-text-primary">Group Members</h3>
                <p className="text-xs text-text-muted">All active collaborators in this wallet</p>
              </div>
              <button 
                onClick={() => setIsInviteModalOpen(true)}
                className="px-3.5 py-2 bg-accent-primary text-white rounded-xl text-xs font-bold hover:bg-accent-secondary flex items-center gap-1.5 transition-colors"
              >
                <HiOutlinePlus className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            </div>

            <div className="divide-y divide-border/60">
              {membersList.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center font-bold text-sm uppercase">
                      {m.rawName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        {m.name} {m.id === currentUserId && <span className="text-xs text-accent-primary font-normal">(You)</span>}
                      </p>
                      <p className="text-xs text-text-muted">{m.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-bg-input border border-border text-text-muted capitalize">
                      {m.role}
                    </span>
                    {isAdmin && m.id !== currentUserId && (
                      <button 
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                        title="Remove member"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 1: ADD EXPENSE (SPLITWISE 4-WAY SPLIT) */}
        {/* ======================================================== */}
        <Modal 
          isOpen={isExpenseModalOpen} 
          onClose={() => setIsExpenseModalOpen(false)} 
          title="Add an Expense"
          size="lg"
        >
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Dinner, Groceries, Flight"
                  className="w-full px-3.5 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent-primary"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Amount ({currencySymbol})</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-sm font-bold focus:outline-none focus:border-accent-primary"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Category</label>
                <select 
                  className="w-full px-3 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-xs focus:outline-none focus:border-accent-primary"
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Paid by</label>
                <select 
                  className="w-full px-3 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-xs font-bold focus:outline-none focus:border-accent-primary"
                  value={expenseForm.paidBy}
                  onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                >
                  {membersList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Date</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-xs focus:outline-none focus:border-accent-primary"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
            </div>

            {/* Split Mode Selector */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-text-secondary mb-2">Split Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'equal', label: '= Equally' },
                  { id: 'exact', label: `${currencySymbol} Exact` },
                  { id: 'percentage', label: '% Percentage' },
                  { id: 'shares', label: '🧮 Shares' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setExpenseForm({ ...expenseForm, splitType: tab.id })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      expenseForm.splitType === tab.id
                        ? 'bg-accent-primary text-white border-accent-primary shadow-xs'
                        : 'bg-bg-input text-text-secondary border-border hover:bg-bg-hover'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Details Container */}
            <div className="p-3.5 rounded-xl border border-border bg-bg-input/40 space-y-2">
              {/* EQUAL SPLIT */}
              {expenseForm.splitType === 'equal' && (
                <div>
                  <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                    <span>Select who was included:</span>
                    {expenseForm.amount && expenseForm.equalMembers.length > 0 && (
                      <span className="font-bold text-accent-primary">
                        {currencySymbol}{(Number(expenseForm.amount) / expenseForm.equalMembers.length).toFixed(2)} / person
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {membersList.map(m => {
                      const isChecked = expenseForm.equalMembers.includes(m.id);
                      return (
                        <label 
                          key={m.id}
                          className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                            isChecked ? 'bg-white border-accent-primary text-accent-primary' : 'bg-bg-input border-border text-text-muted'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExpenseForm({ ...expenseForm, equalMembers: [...expenseForm.equalMembers, m.id] });
                              } else {
                                setExpenseForm({ ...expenseForm, equalMembers: expenseForm.equalMembers.filter(id => id !== m.id) });
                              }
                            }}
                            className="rounded text-accent-primary"
                          />
                          <span>{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EXACT AMOUNTS SPLIT */}
              {expenseForm.splitType === 'exact' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Specify exact amount per person:</span>
                    <span className="font-semibold">
                      Total: {currencySymbol}{Object.values(expenseForm.exactAmounts).reduce((a, b) => a + (Number(b) || 0), 0).toFixed(2)} / {currencySymbol}{Number(expenseForm.amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {membersList.map(m => (
                      <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-text-primary">{m.name}</span>
                        <div className="flex items-center gap-1 w-32">
                          <span className="text-text-muted">{currencySymbol}</span>
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full px-2 py-1 bg-white border border-border rounded-lg text-text-primary text-xs"
                            value={expenseForm.exactAmounts[m.id] || ''}
                            onChange={e => setExpenseForm({
                              ...expenseForm,
                              exactAmounts: { ...expenseForm.exactAmounts, [m.id]: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PERCENTAGE SPLIT */}
              {expenseForm.splitType === 'percentage' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Specify percentage per person:</span>
                    <span className="font-semibold">
                      Total: {Object.values(expenseForm.percentages).reduce((a, b) => a + (Number(b) || 0), 0)}% of 100%
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {membersList.map(m => (
                      <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-text-primary">{m.name}</span>
                        <div className="flex items-center gap-1 w-28">
                          <input 
                            type="number"
                            step="1"
                            placeholder="0"
                            className="w-full px-2 py-1 bg-white border border-border rounded-lg text-text-primary text-xs"
                            value={expenseForm.percentages[m.id] !== undefined ? expenseForm.percentages[m.id] : ''}
                            onChange={e => setExpenseForm({
                              ...expenseForm,
                              percentages: { ...expenseForm.percentages, [m.id]: Number(e.target.value) }
                            })}
                          />
                          <span className="text-text-muted">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SHARES SPLIT */}
              {expenseForm.splitType === 'shares' && (
                <div className="space-y-2">
                  <div className="text-xs text-text-muted">
                    <span>Specify relative shares (e.g., 2 shares vs 1 share):</span>
                  </div>
                  <div className="space-y-1.5">
                    {membersList.map(m => (
                      <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-text-primary">{m.name}</span>
                        <div className="flex items-center gap-1 w-28">
                          <input 
                            type="number"
                            step="1"
                            min="0"
                            placeholder="1"
                            className="w-full px-2 py-1 bg-white border border-border rounded-lg text-text-primary text-xs"
                            value={expenseForm.shares[m.id] !== undefined ? expenseForm.shares[m.id] : 1}
                            onChange={e => setExpenseForm({
                              ...expenseForm,
                              shares: { ...expenseForm.shares, [m.id]: Number(e.target.value) }
                            })}
                          />
                          <span className="text-text-muted text-[10px]">share(s)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button 
                type="button" 
                onClick={() => setIsExpenseModalOpen(false)} 
                className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-input rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Save Expense
              </button>
            </div>
          </form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 2: SETTLE UP DIRECTLY */}
        {/* ======================================================== */}
        <Modal 
          isOpen={isSettleModalOpen} 
          onClose={() => setIsSettleModalOpen(false)} 
          title="Record a Payment / Settle Up"
        >
          <form onSubmit={handleSubmitSettleUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Payer (Who paid?)</label>
                <select 
                  className="w-full px-3 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-xs font-bold focus:outline-none focus:border-accent-primary"
                  value={settleForm.payerId}
                  onChange={e => setSettleForm({ ...settleForm, payerId: e.target.value })}
                >
                  {membersList.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Recipient (Who received?)</label>
                <select 
                  className="w-full px-3 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-xs font-bold focus:outline-none focus:border-accent-primary"
                  value={settleForm.payeeId}
                  onChange={e => setSettleForm({ ...settleForm, payeeId: e.target.value })}
                >
                  {membersList.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Amount ({currencySymbol})</label>
              <input 
                type="number"
                step="0.01"
                required
                className="w-full px-3.5 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-sm font-bold focus:outline-none focus:border-accent-primary"
                value={settleForm.amount}
                onChange={e => setSettleForm({ ...settleForm, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Date</label>
              <input 
                type="date"
                className="w-full px-3.5 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-xs focus:outline-none focus:border-accent-primary"
                value={settleForm.date}
                onChange={e => setSettleForm({ ...settleForm, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Notes</label>
              <input 
                type="text"
                placeholder="e.g. Paid in cash, Google Pay, Bank transfer"
                className="w-full px-3.5 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-xs focus:outline-none focus:border-accent-primary"
                value={settleForm.notes}
                onChange={e => setSettleForm({ ...settleForm, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button 
                type="button" 
                onClick={() => setIsSettleModalOpen(false)} 
                className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-input rounded-xl"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={settling}
                className="px-5 py-2 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {settling ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 3: UPI QR CODE SETTLEMENT */}
        {/* ======================================================== */}
        <Modal 
          isOpen={isUpiModalOpen} 
          onClose={() => setIsUpiModalOpen(false)} 
          title="Settle Debt via UPI"
        >
          {activeSettlement && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-text-secondary">
                <span className="font-bold text-text-primary">{activeSettlement.fromUser.name}</span> pays{' '}
                <span className="font-bold text-accent-primary">{activeSettlement.toUser.name}</span>{' '}
                amount <span className="font-bold text-text-primary">{currencySymbol}{activeSettlement.amount.toLocaleString()}</span>.
              </div>

              {/* QR Code Canvas */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 w-fit mx-auto shadow-sm qr-white-card">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="UPI QR Code" className="w-52 h-52 rounded-lg" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-xs text-text-muted">Loading QR...</div>
                )}
                <span className="text-[11px] font-semibold text-text-muted mt-2">
                  Scan with GPay, PhonePe, Paytm, or BHIM
                </span>
              </div>

              {/* Direct UPI Link Button */}
              <div className="space-y-2 pt-1">
                <a
                  href={activeSettlement.upiUri}
                  className="block w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Open in UPI App (Mobile)
                </a>
                <button
                  type="button"
                  disabled={settling}
                  onClick={() => handleConfirmSettlement(activeSettlement)}
                  className="w-full py-2.5 px-4 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {settling ? 'Updating wallet...' : '✓ Mark as Settled & Record Payment'}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 4: INVITE MEMBER */}
        {/* ======================================================== */}
        <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Member to Group">
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Email Address</label>
              <input 
                type="email" 
                required 
                placeholder="friend@example.com"
                className="w-full px-3.5 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent-primary"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-3">
              <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 text-xs text-text-secondary hover:bg-bg-input rounded-xl">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-accent-primary text-white rounded-xl text-xs font-bold hover:bg-accent-secondary">Send Invite</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ==========================================
  // WALLET LIST VIEW
  // ==========================================
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Shared Wallets</h1>
          <p className="text-text-muted text-xs sm:text-sm">Splitwise-style shared groups, expense splitting, and debt settlements</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
        >
          <HiOutlinePlus className="w-4 h-4" />
          <span>Create New Group</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 glass-card rounded-2xl animate-pulse bg-bg-input"></div>
          ))}
        </div>
      ) : wallets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet) => (
            <div 
              key={wallet._id} 
              onClick={() => setSelectedWalletId(wallet._id)}
              className="glass-card p-6 rounded-2xl border border-border hover:border-accent-primary/60 transition-all cursor-pointer bg-white group hover:shadow-md animate-slide-up flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-accent-primary transition-colors truncate pr-2">
                    {wallet.name}
                  </h3>
                  <span className="text-xs px-2.5 py-1 bg-bg-input border border-border rounded-full text-text-muted flex items-center shrink-0 font-medium">
                    <HiOutlineUserGroup className="mr-1 w-3.5 h-3.5" />
                    {wallet.members?.length || 1}
                  </span>
                </div>
                <p className="text-text-secondary text-xs line-clamp-2 min-h-[2rem]">
                  {wallet.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex justify-between items-center text-xs pt-4 border-t border-border/60 mt-4">
                <span className="text-text-muted">
                  Created {new Date(wallet.createdAt).toLocaleDateString()}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold text-accent-primary bg-blue-50 border border-blue-100">
                  {wallet.owner === currentUserId ? 'Owner' : 'Member'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl border border-border bg-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-accent-primary flex items-center justify-center text-3xl mb-3 shadow-xs">
            👥
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">No shared groups yet</h3>
          <p className="text-text-muted text-xs mb-5 max-w-sm">
            Create a Splitwise-style group to split trip expenses, house rent, or dinners with friends.
          </p>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            Create Your First Group
          </button>
        </div>
      )}

      {/* Create Wallet Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Group">
        <form onSubmit={handleCreateWallet} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Group Name</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Goa Trip, Apartment 402, Friday Dinners"
              className="w-full px-3.5 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              value={createForm.name}
              onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Description (Optional)</label>
            <textarea 
              rows="3"
              placeholder="What are you splitting?"
              className="w-full px-3.5 py-2 bg-bg-input border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-3">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-input rounded-xl">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-accent-primary text-white rounded-xl text-xs font-bold hover:bg-accent-secondary">Create Group</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
