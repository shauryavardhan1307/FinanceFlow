import React, { useState, useEffect, useMemo } from 'react';
import { 
  HiChevronLeft, 
  HiChevronRight, 
  HiOutlinePlus, 
  HiOutlinePencilSquare, 
  HiOutlineTrash, 
  HiOutlineExclamationTriangle,
  HiSparkles,
  HiOutlineCheckCircle
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

const BudgetsPage = () => {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  
  const [formData, setFormData] = useState({
    category: '',
    monthlyLimit: ''
  });

  // AI Budget Planner State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiStep, setAiStep] = useState(1); // 1=salary, 2=lifestyle, 3=preview
  const [aiForm, setAiForm] = useState({ salary: '', lifestyle: 'balanced', priorities: [] });
  const [aiAllocations, setAiAllocations] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTotalAllocated, setAiTotalAllocated] = useState(0);
  const [aiSubscriptionsInfo, setAiSubscriptionsInfo] = useState(null);

  const handleAIGenerate = async () => {
    if (!aiForm.salary || Number(aiForm.salary) <= 0) {
      toast.error('Please enter a valid monthly salary');
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.post('/budgets/ai-generate', {
        salary: Number(aiForm.salary),
        lifestyle: aiForm.lifestyle,
        priorities: aiForm.priorities,
        month: currentMonth
      });
      if (res.data.success) {
        setAiAllocations(res.data.data.allocations);
        setAiTotalAllocated(res.data.data.totalAllocated);
        setAiSubscriptionsInfo({
          totalSubscriptions: res.data.data.totalSubscriptions || 0,
          subscriptionsCount: res.data.data.subscriptionsCount || 0
        });
        setAiStep(3);
        toast.success('AI budget plan generated! 🎯');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AI budget');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAIBudgets = async () => {
    setAiLoading(true);
    try {
      // 1. Batch replace all budgets for current month so old categories don't linger
      const res = await api.post('/budgets/batch-replace', {
        month: currentMonth,
        allocations: aiAllocations
      });

      const savedCount = res.data.count || aiAllocations.length;

      // 2. Auto-create or update savings goal if Savings category was allocated
      const savingsAlloc = aiAllocations.find(a => 
        a.category.toLowerCase().includes('saving') || a.category.toLowerCase().includes('investment')
      );
      const savingsAmount = savingsAlloc ? savingsAlloc.monthlyLimit : 0;

      if (savingsAmount > 0) {
        try {
          const targetDate = new Date();
          targetDate.setMonth(targetDate.getMonth() + 1);
          await api.post('/goals', {
            name: `Monthly Savings Plan`,
            targetAmount: savingsAmount,
            currentAmount: 0,
            targetDate: targetDate.toISOString().split('T')[0],
            category: 'General',
          });
          toast.success(`Saved ${savedCount} budgets + set savings goal of ${currencySymbol}${savingsAmount.toLocaleString()}/month! 🎯`);
        } catch (goalErr) {
          toast.success(`Saved ${savedCount} budget categories! 🎉`);
        }
      } else {
        toast.success(`Saved ${savedCount} budget categories! 🎉`);
      }

      setIsAIModalOpen(false);
      setAiStep(1);
      setAiAllocations([]);
      setAiForm({ salary: '', lifestyle: 'balanced', priorities: [] });
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budgets');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIAllocationChange = (index, newLimit) => {
    setAiAllocations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], monthlyLimit: Number(newLimit) || 0 };
      return updated;
    });
    setAiTotalAllocated(aiAllocations.reduce((sum, a, i) => sum + (i === index ? (Number(newLimit) || 0) : a.monthlyLimit), 0));
  };

  const handleRemoveAIAllocation = (index) => {
    setAiAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const togglePriority = (priority) => {
    setAiForm(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority]
    }));
  };

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/budgets?month=${currentMonth}`);
      if (res.data.success) {
        setBudgets(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories?type=expense');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const changeMonth = (offset) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleOpenModal = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        category: budget.category,
        monthlyLimit: budget.monthlyLimit
      });
    } else {
      setEditingBudget(null);
      setFormData({
        category: '',
        monthlyLimit: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.monthlyLimit) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      const payload = {
        category: formData.category,
        monthlyLimit: Number(formData.monthlyLimit),
        month: currentMonth
      };
      
      const res = await api.post('/budgets', payload);
      if (res.data.success) {
        toast.success(editingBudget ? 'Budget updated' : 'Budget created');
        fetchBudgets();
        handleCloseModal();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      const res = await api.delete(`/budgets/${id}`);
      if (res.data.success) {
        toast.success('Budget deleted');
        fetchBudgets();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete budget');
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage < 80) return 'bg-success';
    if (percentage < 100) return 'bg-warning';
    return 'bg-danger';
  };

  // Predictive calculations for current month
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = currentMonth === currentMonthStr;
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const summary = useMemo(() => {
    return budgets.reduce(
      (acc, curr) => {
        acc.totalBudgeted += curr.monthlyLimit || 0;
        acc.totalSpent += curr.spent || 0;
        return acc;
      },
      { totalBudgeted: 0, totalSpent: 0 }
    );
  }, [budgets]);
  
  const remaining = summary.totalBudgeted - summary.totalSpent;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header and Month Selector */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Budgets</h1>
          <p className="text-text-secondary">Manage your monthly spending limits</p>
        </div>
        
        <div className="flex items-center gap-4 bg-bg-card p-2 rounded-lg border border-border">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-bg-hover rounded-md text-text-secondary hover:text-text-primary transition-colors"
          >
            <HiChevronLeft size={20} />
          </button>
          
          <span className="font-medium text-text-primary w-32 text-center">
            {new Date(`${currentMonth}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </span>
          
          <button 
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-bg-hover rounded-md text-text-secondary hover:text-text-primary transition-colors"
          >
            <HiChevronRight size={20} />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsAIModalOpen(true); setAiStep(1); }}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
          >
            <HiSparkles className="w-4 h-4" />
            AI Smart Budget
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white px-4 py-2 rounded-lg transition-colors shadow-lg"
          >
            <HiOutlinePlus size={20} />
            <span>Create Budget</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
        <div className="glass-card p-6 rounded-xl border border-border">
          <h3 className="text-text-secondary text-sm font-medium mb-1">Total Budgeted</h3>
          <p className="text-2xl font-bold text-text-primary">{formatCurrency(summary.totalBudgeted)}</p>
        </div>
        <div className="glass-card p-6 rounded-xl border border-border">
          <h3 className="text-text-secondary text-sm font-medium mb-1">Total Spent</h3>
          <p className="text-2xl font-bold text-text-primary">{formatCurrency(summary.totalSpent)}</p>
        </div>
        <div className="glass-card p-6 rounded-xl border border-border">
          <h3 className="text-text-secondary text-sm font-medium mb-1">Remaining</h3>
          <p className={`text-2xl font-bold ${remaining < 0 ? 'text-danger' : 'text-success'}`}>
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card rounded-xl border border-border p-6 min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-4">
            <div className="p-4 bg-bg-secondary rounded-full">
              <HiOutlinePlus className="w-12 h-12 text-text-muted" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-text-primary">No budgets set</h3>
              <p className="text-text-secondary max-w-sm mt-1 mx-auto">
                You haven't set any budgets for this month. Create one to start tracking your spending!
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="mt-2 text-accent-primary hover:text-accent-secondary font-medium transition-colors"
            >
              + Create your first budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {budgets.map((budget) => {
              const isOverBudget = budget.percentage >= 100;
              const dailyRate = isCurrentMonth && dayOfMonth > 0 ? (budget.spent / dayOfMonth) : 0;
              const projectedMonthEnd = isCurrentMonth && dailyRate > 0 ? Math.round(dailyRate * daysInMonth) : budget.spent;
              const isProjectedOver = isCurrentMonth && !isOverBudget && projectedMonthEnd > budget.monthlyLimit && budget.spent > 0;
              const projectedExcess = projectedMonthEnd - budget.monthlyLimit;
              
              return (
                <div key={budget._id} className={`bg-bg-secondary rounded-xl p-5 border transition-all relative overflow-hidden group ${
                  isOverBudget ? 'border-danger/40 shadow-sm' : isProjectedOver ? 'border-amber-200 shadow-sm' : 'border-border hover:border-border-hover'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-text-primary">{budget.category}</h3>
                      {isOverBudget && (
                        <span title="Over Budget" className="text-danger flex items-center">
                          <HiOutlineExclamationTriangle size={18} />
                        </span>
                      )}
                      {isProjectedOver && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          ⚡ Pace Alert
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(budget)}
                        className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-bg-hover rounded-md transition-colors"
                        title="Edit Budget"
                      >
                        <HiOutlinePencilSquare size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(budget._id)}
                        className="p-1.5 text-text-secondary hover:text-danger hover:bg-bg-hover rounded-md transition-colors"
                        title="Delete Budget"
                      >
                        <HiOutlineTrash size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Spent: <span className="font-medium text-text-primary">{formatCurrency(budget.spent)}</span></span>
                      <span className="text-text-secondary">Limit: <span className="font-medium text-text-primary">{formatCurrency(budget.monthlyLimit)}</span></span>
                    </div>
                    
                    <div className="h-2.5 w-full bg-bg-card rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isOverBudget ? 'bg-danger' : isProjectedOver ? 'bg-warning' : getProgressColor(budget.percentage)} transition-all duration-500`}
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="text-text-muted">{budget.percentage?.toFixed(1) || 0}% used</span>
                      <span className={`${isOverBudget ? 'text-danger' : isProjectedOver ? 'text-amber-600 font-semibold' : 'text-success'} font-medium`}>
                        {isOverBudget 
                          ? `${formatCurrency(budget.spent - budget.monthlyLimit)} over`
                          : `${formatCurrency(budget.monthlyLimit - budget.spent)} left`
                        }
                      </span>
                    </div>

                    {isProjectedOver && (
                      <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-start gap-2 text-xs text-amber-900 bg-amber-50/80 -mx-5 -mb-5 p-3 rounded-b-xl">
                        <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">⚡ Predictive Pace Warning</span>
                          <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                            Pacing at {formatCurrency(dailyRate)}/day. Projected month-end: <span className="font-semibold">{formatCurrency(projectedMonthEnd)}</span> (+{formatCurrency(projectedExcess)} over budget).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingBudget ? 'Edit Budget' : 'Create Budget'}>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
              required
            >
              <option value="" disabled>Select a category</option>
              {categories.map((cat) => {
                const value = cat.name || cat._id || cat;
                const label = cat.name || cat.category || cat;
                return (
                  <option key={cat._id || value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Monthly Limit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.monthlyLimit}
                onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
                className="w-full bg-bg-secondary border border-border rounded-lg pl-8 pr-4 py-2 text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-lg text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-secondary text-white transition-colors"
            >
              {editingBudget ? 'Save Changes' : 'Create Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Smart Budget Planner Modal */}
      <Modal
        isOpen={isAIModalOpen}
        onClose={() => { setIsAIModalOpen(false); setAiStep(1); setAiAllocations([]); }}
        title="✨ AI Smart Budget Planner"
      >
        <div className="space-y-5">
          {/* Step 1: Salary Input */}
          {aiStep === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 text-xs text-text-secondary">
                <p className="font-semibold text-text-primary mb-1">🎯 Smart Budget Allocation</p>
                <p>Enter your monthly salary and our AI will create a personalized budget plan based on your income, spending history, and financial goals.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Monthly Salary / Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-lg">{currencySymbol}</span>
                  <input
                    type="number"
                    min={1}
                    required
                    autoFocus
                    placeholder="e.g. 50000"
                    value={aiForm.salary}
                    onChange={(e) => setAiForm({ ...aiForm, salary: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-bg-input border border-border rounded-xl text-xl font-bold text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => aiForm.salary && Number(aiForm.salary) > 0 ? setAiStep(2) : toast.error('Please enter your salary')}
                  className="px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-accent-primary/20 flex items-center gap-2"
                >
                  Next
                  <HiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Lifestyle & Priorities */}
          {aiStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Lifestyle Preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'frugal', label: '🪙 Frugal', desc: 'Max savings' },
                    { value: 'balanced', label: '⚖️ Balanced', desc: 'Smart mix' },
                    { value: 'comfortable', label: '✨ Comfortable', desc: 'Enjoy more' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAiForm({ ...aiForm, lifestyle: opt.value })}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        aiForm.lifestyle === opt.value
                          ? 'border-accent-primary bg-blue-50 shadow-sm'
                          : 'border-border hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">What matters most to you?</label>
                <div className="flex flex-wrap gap-2">
                  {['Savings', 'Travel', 'Food', 'Fitness', 'Education', 'Entertainment', 'Investments', 'Debt Payoff'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePriority(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        aiForm.priorities.includes(p)
                          ? 'bg-accent-primary text-white border-accent-primary shadow-sm'
                          : 'bg-bg-secondary text-text-secondary border-border hover:border-accent-primary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setAiStep(1)}
                  className="px-4 py-2 border border-border rounded-xl text-text-secondary text-sm font-medium hover:bg-bg-hover"
                >
                  <HiChevronLeft className="w-4 h-4 inline mr-1" />
                  Back
                </button>
                <button
                  onClick={handleAIGenerate}
                  disabled={aiLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <HiSparkles className="w-4 h-4" />
                      Generate Budget Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview & Save */}
          {aiStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-xs text-green-800">
                <p className="font-semibold">✅ AI Budget Plan Ready!</p>
                <p className="mt-0.5">Review and adjust the amounts below. Click "Apply All" to save them as your budgets for {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.</p>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-text-muted">Salary: <span className="font-bold text-text-primary">{currencySymbol}{Number(aiForm.salary).toLocaleString()}</span></span>
                <span className="text-xs text-text-muted">Allocated: <span className={`font-bold ${aiAllocations.reduce((s,a) => s+a.monthlyLimit, 0) > Number(aiForm.salary) ? 'text-danger' : 'text-success'}`}>{currencySymbol}{aiAllocations.reduce((s,a) => s+a.monthlyLimit, 0).toLocaleString()}</span></span>
              </div>

              {aiSubscriptionsInfo?.totalSubscriptions > 0 && (
                <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between text-xs text-purple-900">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span>💳</span> Subscriptions Included:
                  </span>
                  <span className="font-bold">
                    {currencySymbol}{aiSubscriptionsInfo.totalSubscriptions.toLocaleString()}/mo ({aiSubscriptionsInfo.subscriptionsCount} recurring bill{aiSubscriptionsInfo.subscriptionsCount > 1 ? 's' : ''})
                  </span>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {aiAllocations.map((alloc, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{alloc.category}</p>
                      <p className="text-[10px] text-text-muted mt-0.5 truncate">{alloc.reasoning}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-text-muted">{currencySymbol}</span>
                      <input
                        type="number"
                        min={0}
                        value={alloc.monthlyLimit}
                        onChange={(e) => handleAIAllocationChange(idx, e.target.value)}
                        className="w-20 px-2 py-1.5 text-sm font-semibold text-right bg-white border border-border rounded-lg focus:outline-none focus:border-accent-primary"
                      />
                      <button
                        onClick={() => handleRemoveAIAllocation(idx)}
                        className="p-1 text-text-muted hover:text-danger transition-colors"
                      >
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-3 border-t border-border">
                <button
                  onClick={() => setAiStep(2)}
                  className="px-4 py-2 border border-border rounded-xl text-text-secondary text-sm font-medium hover:bg-bg-hover"
                >
                  <HiChevronLeft className="w-4 h-4 inline mr-1" />
                  Redo
                </button>
                <button
                  onClick={handleSaveAIBudgets}
                  disabled={aiLoading || aiAllocations.length === 0}
                  className="px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-accent-primary/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <HiOutlineCheckCircle className="w-4 h-4" />
                      Apply All Budgets ({aiAllocations.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default BudgetsPage;
