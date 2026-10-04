import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import api from '../utils/api';
import NaturalEntryBar from '../components/transactions/NaturalEntryBar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  HiOutlineBanknotes, HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown,
  HiOutlineWallet, HiOutlineChevronRight, HiOutlineExclamationTriangle, HiOutlineSparkles
} from 'react-icons/hi2';

const COLORS = ['#2563eb', '#00cec9', '#3b82f6', '#ff6b6b', '#feca57', '#10b981', '#8b5cf6'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: { totalIncome: 0, totalExpense: 0, savings: 0, transactionCount: 0 },
    categoryBreakdown: [],
    monthlyTrend: [],
    recentTransactions: [],
    budgets: [],
    alerts: []
  });
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        summaryRes,
        categoryRes,
        trendRes,
        transactionsRes,
        budgetsRes,
        alertsRes
      ] = await Promise.all([
        api.get('/analytics/summary').catch(() => ({ data: { data: null } })),
        api.get('/analytics/category-breakdown').catch(() => ({ data: { data: [] } })),
        api.get('/analytics/monthly-trend').catch(() => ({ data: { data: [] } })),
        api.get('/transactions', { params: { limit: 5, sort: '-date' } }).catch(() => ({ data: { data: { transactions: [] } } })),
        api.get('/budgets').catch(() => ({ data: { data: [] } })),
        api.get('/alerts').catch(() => ({ data: { data: { alerts: [] } } }))
      ]);

      setData({
        summary: summaryRes.data.data || { totalIncome: 0, totalExpense: 0, savings: 0, transactionCount: 0 },
        categoryBreakdown: categoryRes.data.data || [],
        monthlyTrend: trendRes.data.data || [],
        recentTransactions: transactionsRes.data.data?.transactions || transactionsRes.data.data || [],
        budgets: budgetsRes.data.data || [],
        alerts: alertsRes.data.data?.alerts || []
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading && !data.recentTransactions.length) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-bg-secondary rounded-lg mb-8"></div>
        <div className="h-28 bg-white rounded-2xl border border-border"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card h-32 rounded-2xl bg-bg-secondary/50"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="glass-card h-96 rounded-2xl bg-bg-secondary/50"></div>
          <div className="glass-card h-96 rounded-2xl bg-bg-secondary/50"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center py-20">
        <div className="text-danger text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Oops! Something went wrong</h2>
        <p className="text-text-secondary mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { summary, categoryBreakdown, monthlyTrend, recentTransactions, budgets, alerts } = data;
  const isNewUser = summary.transactionCount === 0;
  const overspendAlerts = alerts.filter(a => a.type === 'overspend_warning' || a.type === 'budget_exceeded');

  return (
    <div className="p-6 md:p-8 animate-fade-in space-y-7">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Friend'}</span>!
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">Here's your real-time financial pulse</p>
        </div>
      </header>

      {/* 1. Natural Language Transaction Quick Entry */}
      <NaturalEntryBar onTransactionCreated={fetchDashboardData} />

      {/* 2. Predictive Overspend Alert Banner (if any) */}
      {overspendAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-sm flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-amber-100 text-warning flex-shrink-0 mt-0.5">
            <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-amber-900">
              Predictive Overspend Notice ({overspendAlerts.length})
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              {overspendAlerts[0]?.message}
            </p>
          </div>
          <Link
            to="/budgets"
            className="text-xs font-semibold text-amber-900 underline hover:text-amber-950 whitespace-nowrap self-center"
          >
            Manage Budgets
          </Link>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl flex flex-col bg-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-success/10 text-success">
              <HiOutlineArrowTrendingUp size={24} />
            </div>
            <h3 className="text-text-secondary font-medium text-sm">Total Income</h3>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-auto">
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col bg-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-danger/10 text-danger">
              <HiOutlineArrowTrendingDown size={24} />
            </div>
            <h3 className="text-text-secondary font-medium text-sm">Total Expenses</h3>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-auto">
            {formatCurrency(summary.totalExpense)}
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col bg-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-blue-50 text-accent-primary">
              <HiOutlineWallet size={24} />
            </div>
            <h3 className="text-text-secondary font-medium text-sm">Net Savings</h3>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-auto">
            {formatCurrency(summary.savings)}
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col bg-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-purple-50 text-purple-600">
              <HiOutlineBanknotes size={24} />
            </div>
            <h3 className="text-text-secondary font-medium text-sm">Transactions</h3>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-auto">
            {summary.transactionCount}
          </p>
        </div>
      </div>

      {isNewUser ? (
        <div className="glass-card p-12 rounded-2xl text-center flex flex-col items-center justify-center bg-white border border-border">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-accent-primary flex items-center justify-center mb-4">
            <HiOutlineSparkles size={32} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome to FinanceFlow!</h2>
          <p className="text-text-secondary max-w-md mb-6 text-sm">
            Try typing a transaction in the box above (like "Spent {currencySymbol}250 on pizza") or click below to record your first transaction.
          </p>
          <Link
            to="/transactions"
            className="px-6 py-3 rounded-xl bg-accent-primary text-white font-medium hover:bg-accent-secondary transition-colors shadow-lg shadow-accent-primary/20 text-sm"
          >
            Go to Transactions
          </Link>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend */}
            <div className="glass-card p-6 rounded-2xl lg:col-span-2 bg-white">
              <h3 className="text-lg font-semibold text-text-primary mb-6">Income vs Expense Trend</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <RechartsTooltip 
                      formatter={(val) => formatCurrency(val)}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="glass-card p-6 rounded-2xl bg-white flex flex-col">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Top Spending Categories</h3>
              <div className="h-64 w-full flex-1">
                {categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="total"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={4}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(val) => formatCurrency(val)}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted text-sm">
                    No expense data yet
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {categoryBreakdown.slice(0, 4).map((entry, index) => (
                  <div key={entry._id || `cat-${index}`} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="truncate max-w-[100px]">{entry._id || 'General'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Grid: Recent Transactions & Budget Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Transactions */}
            <div className="glass-card p-6 rounded-2xl lg:col-span-2 bg-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-text-primary">Recent Transactions</h3>
                <Link to="/transactions" className="text-accent-primary hover:text-accent-secondary flex items-center text-sm font-medium">
                  View All <HiOutlineChevronRight className="ml-1" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentTransactions.map((tx, idx) => (
                  <div key={tx._id || `tx-${idx}`} className="flex justify-between items-center p-3.5 rounded-xl bg-bg-input hover:bg-bg-hover transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2.5 rounded-xl ${tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {tx.type === 'income' ? <HiOutlineArrowTrendingUp size={20} /> : <HiOutlineArrowTrendingDown size={20} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-text-primary">{tx.description || tx.category}</p>
                        <p className="text-xs text-text-muted">{formatDate(tx.date)} • {tx.category}</p>
                      </div>
                    </div>
                    <div className={`font-bold text-sm ${tx.type === 'income' ? 'text-success' : 'text-text-primary'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Budgets with Predictive Pace Tags */}
            <div className="glass-card p-6 rounded-2xl bg-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-text-primary">Budget Status</h3>
                <Link to="/budgets" className="text-accent-primary hover:text-accent-secondary flex items-center text-sm font-medium">
                  View All <HiOutlineChevronRight className="ml-1" />
                </Link>
              </div>
              {budgets.length > 0 ? (
                <div className="space-y-5">
                  {budgets.slice(0, 4).map((budget, bIdx) => {
                    const percent = Math.min((budget.spent / budget.monthlyLimit) * 100, 100);
                    const isExceeded = percent >= 100;
                    const hasPaceAlert = alerts.some(a => a.category?.toLowerCase() === budget.category?.toLowerCase() && a.type === 'overspend_warning');

                    let barColor = 'bg-accent-primary';
                    if (isExceeded) barColor = 'bg-danger';
                    else if (hasPaceAlert) barColor = 'bg-warning';

                    return (
                      <div key={budget._id || `b-${bIdx}`} className="space-y-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-text-primary font-medium">{budget.category}</span>
                            {hasPaceAlert && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                ⚡ Pace Alert
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-secondary">
                            {formatCurrency(budget.spent)} / {formatCurrency(budget.monthlyLimit)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${barColor} rounded-full transition-all duration-500`} 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center text-text-muted text-sm">
                  <p>No budgets set yet.</p>
                  <Link to="/budgets" className="text-accent-primary text-xs font-medium mt-1">
                    + Create monthly budget
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
