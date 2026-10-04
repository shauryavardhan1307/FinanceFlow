import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { 
  HiOutlinePlus, 
  HiOutlinePencilSquare, 
  HiOutlineTrash, 
  HiOutlineSparkles,
  HiOutlineCheckCircle,
  HiOutlineCalendar,
  HiOutlineBanknotes
} from 'react-icons/hi2';

export default function GoalsPage() {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [goals, setGoals] = useState([]);
  const [metrics, setMetrics] = useState({ totalTarget: 0, totalSaved: 0, overallProgress: 0 });
  const [loading, setLoading] = useState(true);

  // Modals
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: 'General',
    color: '#2563eb',
    icon: '🎯'
  };
  const [formData, setFormData] = useState(initialFormState);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/goals');
      if (res.data.success) {
        setGoals(res.data.data.goals || []);
        setMetrics({
          totalTarget: res.data.data.totalTarget || 0,
          totalSaved: res.data.data.totalSaved || 0,
          overallProgress: res.data.data.overallProgress || 0
        });
      }
    } catch (err) {
      toast.error('Failed to load savings goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleOpenGoalModal = (goal = null) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: new Date(goal.targetDate).toISOString().split('T')[0],
        category: goal.category,
        color: goal.color || '#2563eb',
        icon: goal.icon || '🎯'
      });
    } else {
      setEditingGoal(null);
      // Default target date to 6 months from now
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 6);
      setFormData({
        ...initialFormState,
        targetDate: defaultDate.toISOString().split('T')[0]
      });
    }
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount || !formData.targetDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      if (editingGoal) {
        await api.put(`/goals/${editingGoal._id}`, formData);
        toast.success('Savings goal updated!');
      } else {
        await api.post('/goals', formData);
        toast.success('New savings goal created! 🎯');
      }
      setIsGoalModalOpen(false);
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      toast.success('Goal deleted');
      fetchGoals();
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  const handleOpenDeposit = (goal) => {
    setSelectedGoal(goal);
    setDepositAmount('');
    setIsDepositModalOpen(true);
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/goals/${selectedGoal._id}/deposit`, {
        amount: Number(depositAmount)
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Money allocated to goal! 🎉');
        setIsDepositModalOpen(false);
        fetchGoals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deposit to goal');
    } finally {
      setSubmitting(false);
    }
  };

  const goalPresets = [
    { name: 'Emergency Fund', icon: '🛡️', amount: 100000, category: 'Emergency' },
    { name: 'New Laptop', icon: '💻', amount: 80000, category: 'Gadgets' },
    { name: 'Vacation Trip', icon: '✈️', amount: 45000, category: 'Travel' },
    { name: 'Bike / Vehicle', icon: '🏍️', amount: 150000, category: 'Vehicle' },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Savings Goals & Sinking Funds</h1>
          <p className="text-text-secondary text-sm">
            Set targets, track progress, and allocate savings toward your dreams.
          </p>
        </div>
        <button
          onClick={() => handleOpenGoalModal()}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl transition-colors shadow-md shadow-accent-primary/20 font-medium text-sm"
        >
          <HiOutlinePlus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl bg-white border border-border">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Saved</span>
          <p className="text-2xl font-bold text-success mt-2">
            {formatCurrency(metrics.totalSaved)}
          </p>
          <span className="text-xs text-text-muted mt-1 block">across all goals</span>
        </div>

        <div className="glass-card p-6 rounded-2xl bg-white border border-border">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Targets</span>
          <p className="text-2xl font-bold text-text-primary mt-2">
            {formatCurrency(metrics.totalTarget)}
          </p>
          <span className="text-xs text-text-muted mt-1 block">{goals.length} active target{goals.length === 1 ? '' : 's'}</span>
        </div>

        <div className="glass-card p-6 rounded-2xl bg-white border border-border">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Overall Completion</span>
            <span className="text-sm font-bold text-accent-primary">{metrics.overallProgress}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
            <div 
              className="h-full bg-accent-primary rounded-full transition-all duration-700" 
              style={{ width: `${metrics.overallProgress}%` }}
            />
          </div>
          <span className="text-xs text-text-muted mt-2 block">
            {formatCurrency(metrics.totalTarget - metrics.totalSaved)} to reach all targets
          </span>
        </div>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="p-12 text-center text-text-muted">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center bg-white border border-border flex flex-col items-center justify-center">
          <span className="text-4xl mb-3">🎯</span>
          <h3 className="text-lg font-bold text-text-primary mb-1">No savings goals yet</h3>
          <p className="text-xs text-text-muted max-w-sm mb-6">
            Saving is easier when you give your money a purpose. Pick a popular goal to get started!
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {goalPresets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setFormData({
                    ...initialFormState,
                    name: p.name,
                    icon: p.icon,
                    targetAmount: p.amount,
                    category: p.category,
                    targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  });
                  setIsGoalModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 text-xs font-medium text-text-primary flex items-center gap-1.5 transition-colors"
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
                <span className="text-text-muted">({formatCurrency(p.amount)})</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => handleOpenGoalModal()}
            className="px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white text-xs font-semibold rounded-xl shadow-sm"
          >
            Create Custom Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((g) => (
            <div 
              key={g._id}
              className={`glass-card p-6 rounded-2xl bg-white border transition-all relative overflow-hidden group flex flex-col justify-between ${
                g.isCompleted ? 'border-emerald-300 shadow-sm' : 'border-border hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shadow-inner">
                      {g.icon || '🎯'}
                    </span>
                    <div>
                      <h3 className="font-bold text-base text-text-primary leading-tight">{g.name}</h3>
                      <span className="text-xs text-text-muted">{g.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenGoalModal(g)}
                      className="p-1.5 text-text-secondary hover:text-accent-primary rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <HiOutlinePencilSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g._id)}
                      className="p-1.5 text-text-secondary hover:text-danger rounded-lg hover:bg-slate-100 transition-colors"
                      title="Delete"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-extrabold text-text-primary">
                      {formatCurrency(g.currentAmount)}
                    </span>
                    <span className="text-xs text-text-muted">
                      of {formatCurrency(g.targetAmount)}
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        g.isCompleted ? 'bg-success' : 'bg-accent-primary'
                      }`}
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-text-secondary pt-0.5">
                    <span className="font-semibold">{g.progress}% completed</span>
                    <span>{g.daysLeft} days left</span>
                  </div>

                  {/* Monthly target guideline */}
                  {!g.isCompleted && g.suggestedMonthlySaving > 0 && (
                    <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-accent-primary font-medium flex items-center justify-between">
                      <span>Save required pace:</span>
                      <span className="font-bold">{formatCurrency(g.suggestedMonthlySaving)} / mo</span>
                    </div>
                  )}

                  {g.isCompleted && (
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center justify-center gap-1.5">
                      <HiOutlineCheckCircle className="w-4 h-4" />
                      <span>Goal Reached! Amazing work!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-text-muted">
                  Due {new Date(g.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button
                  onClick={() => handleOpenDeposit(g)}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-accent-primary text-accent-primary hover:text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                  + Add Money
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goal Form Modal */}
      <Modal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title={editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-text-secondary mb-1">Icon</label>
              <input
                type="text"
                maxLength={2}
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full text-center text-xl py-2 bg-bg-input border border-border rounded-xl"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-text-secondary mb-1">Goal Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Dream Vacation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-bg-input border border-border rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Target Amount ({currencySymbol})</label>
              <input
                type="number"
                min={1}
                required
                placeholder="100000"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                className="w-full px-4 py-2 bg-bg-input border border-border rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Already Saved ({currencySymbol})</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                className="w-full px-4 py-2 bg-bg-input border border-border rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Target Date</label>
              <input
                type="date"
                required
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className="w-full px-4 py-2 bg-bg-input border border-border rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-bg-input border border-border rounded-xl text-sm"
              >
                <option value="General">General</option>
                <option value="Emergency">Emergency Fund</option>
                <option value="Travel">Travel & Vacations</option>
                <option value="Gadgets">Gadgets & Tech</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Education">Education</option>
                <option value="Home">Home Improvement</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsGoalModalOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-text-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-accent-primary hover:bg-accent-secondary text-white text-sm font-medium rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deposit Modal */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title={`Add Money to ${selectedGoal?.name}`}
      >
        <form onSubmit={handleDepositSubmit} className="space-y-4">
          <p className="text-xs text-text-muted">
            Allocate money toward this target. Progress will update automatically!
          </p>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Amount to Add ({currencySymbol})</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold">{currencySymbol}</span>
              <input
                type="number"
                min={1}
                required
                autoFocus
                placeholder="5000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-bg-input border border-border rounded-xl text-lg font-bold text-text-primary"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {[1000, 2000, 5000, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setDepositAmount(String(amt))}
                className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-accent-primary hover:bg-blue-50"
              >
                +{currencySymbol}{amt.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-text-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Depositing...' : 'Confirm Deposit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
