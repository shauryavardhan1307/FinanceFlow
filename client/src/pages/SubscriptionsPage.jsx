import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { 
  HiOutlinePlus, 
  HiOutlineTrash, 
  HiSparkles,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineCheckCircle,
  HiOutlineArrowPath
} from 'react-icons/hi2';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [subscriptions, setSubscriptions] = useState([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState([]);
  const [monthlyBurn, setMonthlyBurn] = useState(0);
  const [loading, setLoading] = useState(true);

  // Auto-Detect State
  const [detectedCandidates, setDetectedCandidates] = useState([]);
  const [isDetectModalOpen, setIsDetectModalOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // New Subscription Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Entertainment',
    interval: 'monthly',
    nextDate: new Date().toISOString().split('T')[0],
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions');
      if (res.data.success) {
        setSubscriptions(res.data.data.subscriptions || []);
        setUpcomingRenewals(res.data.data.upcomingRenewals || []);
        setMonthlyBurn(res.data.data.monthlyBurn || 0);
      }
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/subscriptions', formData);
      toast.success('Subscription added!');
      setIsModalOpen(false);
      setFormData({
        description: '',
        amount: '',
        category: 'Entertainment',
        interval: 'monthly',
        nextDate: new Date().toISOString().split('T')[0],
      });
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to add subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel/Delete this recurring subscription?')) return;
    try {
      await api.delete(`/subscriptions/${id}`);
      toast.success('Subscription cancelled');
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to remove subscription');
    }
  };

  const handleAutoDetect = async () => {
    setDetecting(true);
    try {
      const res = await api.post('/subscriptions/detect');
      if (res.data.success) {
        const found = res.data.data.detected || [];
        setDetectedCandidates(found);
        setIsDetectModalOpen(true);
        if (found.length === 0) {
          toast('No new repeating subscriptions detected in last 90 days', { icon: 'ℹ️' });
        }
      }
    } catch (err) {
      toast.error('Auto-detection failed');
    } finally {
      setDetecting(false);
    }
  };

  const handleAcceptCandidate = async (candidate) => {
    try {
      await api.post('/subscriptions', {
        description: candidate.description,
        amount: candidate.amount,
        category: candidate.category,
        interval: 'monthly',
        nextDate: new Date(candidate.estimatedNextDate).toISOString().split('T')[0],
      });
      toast.success(`Added ${candidate.description} to subscriptions!`);
      setDetectedCandidates(prev => prev.filter(c => c.description !== candidate.description));
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to save detected subscription');
    }
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Recurring Subscriptions & Bills</h1>
          <p className="text-text-secondary text-sm">
            Track fixed monthly commitments, upcoming renewals, and avoid surprise debits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoDetect}
            disabled={detecting}
            className="flex items-center gap-2 px-4 py-2 border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 text-accent-primary rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <HiSparkles className="w-4 h-4" />
            <span>{detecting ? 'Scanning...' : 'Auto-Detect'}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl shadow-md shadow-accent-primary/20 text-sm font-medium transition-colors"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* Burn Meter Banner */}
      <div className="glass-card p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-accent-primary text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <span className="text-xs uppercase font-bold tracking-wider text-blue-100">Monthly Fixed Burn</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-extrabold">{formatCurrency(monthlyBurn)}</span>
            <span className="text-sm text-blue-200">/ month</span>
          </div>
          <p className="text-xs text-blue-100 mt-2">
            Committed across {subscriptions.length} active subscription{subscriptions.length === 1 ? '' : 's'}. Annualized: {formatCurrency(monthlyBurn * 12)}/yr.
          </p>
        </div>

        <div className="flex gap-4 relative z-10">
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
            <span className="text-[11px] text-blue-200 block">Upcoming in 7 Days</span>
            <span className="text-xl font-bold mt-0.5 block">
              {upcomingRenewals.filter(r => r.daysLeft <= 7).length} bills
            </span>
          </div>
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
            <span className="text-[11px] text-blue-200 block">Active Services</span>
            <span className="text-xl font-bold mt-0.5 block">{subscriptions.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next 30 Days Timeline */}
        <div className="glass-card p-6 rounded-2xl bg-white border border-border">
          <h3 className="font-bold text-base text-text-primary mb-4 flex items-center gap-2">
            <HiOutlineCalendar className="w-5 h-5 text-accent-primary" />
            <span>Upcoming Renewals</span>
          </h3>

          {upcomingRenewals.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">No renewals in the next 30 days.</p>
          ) : (
            <div className="space-y-3">
              {upcomingRenewals.map((item) => (
                <div key={item._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-xs text-text-primary">{item.description}</h4>
                    <span className="text-[11px] text-text-muted">
                      {new Date(item.nextDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-text-primary block">{formatCurrency(item.amount)}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.daysLeft <= 3 ? 'bg-red-100 text-danger' : 'bg-blue-100 text-accent-primary'
                    }`}>
                      {item.daysLeft === 0 ? 'Today' : `in ${item.daysLeft}d`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Subscriptions Table */}
        <div className="glass-card p-6 rounded-2xl bg-white border border-border lg:col-span-2">
          <h3 className="font-bold text-base text-text-primary mb-4">All Active Subscriptions</h3>

          {loading ? (
            <div className="p-12 text-center text-text-muted">Loading subscriptions...</div>
          ) : subscriptions.length === 0 ? (
            <div className="p-12 text-center text-text-muted flex flex-col items-center">
              <HiOutlineCreditCard className="w-12 h-12 text-slate-300 mb-2" />
              <p className="font-medium text-text-primary text-sm">No recurring bills added</p>
              <p className="text-xs text-text-muted max-w-xs mt-0.5">
                Add subscriptions or click Auto-Detect to scan your previous spending history.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {subscriptions.map((sub) => (
                <div key={sub._id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent-primary flex items-center justify-center font-bold text-sm">
                      {sub.description.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-text-primary">{sub.description}</h4>
                      <span className="text-xs text-text-muted">{sub.category} • Billed {sub.interval}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-bold text-sm text-text-primary block">{formatCurrency(sub.amount)}</span>
                      <span className="text-[11px] text-text-muted">Next: {new Date(sub.nextDate).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(sub._id)}
                      className="p-2 text-text-muted hover:text-danger rounded-lg hover:bg-slate-100 transition-colors"
                      title="Cancel Subscription"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Subscription Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Recurring Subscription"
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Service / Bill Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Netflix Premium, Spotify, Gym"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-bg-input border border-border rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Amount ({currencySymbol})</label>
              <input
                type="number"
                min={1}
                required
                placeholder="649"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 bg-bg-input border border-border rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Billing Cycle</label>
              <select
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                className="w-full px-3 py-2 bg-bg-input border border-border rounded-xl text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Next Renewal Date</label>
              <input
                type="date"
                required
                value={formData.nextDate}
                onChange={(e) => setFormData({ ...formData, nextDate: e.target.value })}
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
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities & Bills</option>
                <option value="Housing & Rent">Housing & Rent</option>
                <option value="Health & Fitness">Health & Fitness</option>
                <option value="Software & Cloud">Software & Cloud</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-text-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-accent-primary hover:bg-accent-secondary text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Auto-Detect Candidates Modal */}
      <Modal
        isOpen={isDetectModalOpen}
        onClose={() => setIsDetectModalOpen(false)}
        title="Detected Recurring Patterns"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            We analyzed your past 90 days of spending and found repeating charges that look like subscriptions:
          </p>

          {detectedCandidates.length === 0 ? (
            <p className="text-xs text-center py-6 text-text-muted">
              No new repeating patterns discovered yet.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {detectedCandidates.map((c, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-text-primary text-sm">{c.description}</h4>
                    <span className="text-text-muted">Appeared {c.occurrences} times • {c.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-text-primary">{formatCurrency(c.amount)}/mo</span>
                    <button
                      onClick={() => handleAcceptCandidate(c)}
                      className="px-3 py-1.5 bg-accent-primary hover:bg-accent-secondary text-white rounded-lg font-semibold text-xs shadow-sm"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsDetectModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-text-primary text-xs font-semibold rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
