import React, { useState, useEffect } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { 
  AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  HiChevronLeft, HiChevronRight, HiArrowTrendingUp, 
  HiArrowTrendingDown, HiMinus, HiOutlineChartBar, 
  HiOutlineCurrencyDollar, HiOutlineBanknotes, HiOutlineDocumentText 
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { generatePdfReport } from '../utils/generatePdfReport';

const COLORS = ['#6c5ce7', '#00cec9', '#feca57', '#ff6b6b', '#a29bfe', '#fdcb6e', '#e17055', '#00b894'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expense: 0, savings: 0, transactionCount: 0 });
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [predictions, setPredictions] = useState(null);

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      const monthStr = format(currentMonth, 'yyyy-MM');
      const budgetsRes = await api.get(`/budgets?month=${monthStr}`);
      const budgets = budgetsRes.data.success ? budgetsRes.data.data : [];

      await generatePdfReport({
        userName: user?.name || 'User',
        userEmail: user?.email || '',
        month: monthStr,
        currency: user?.currency || 'INR',
        summary: {
          totalIncome: summary.totalIncome || summary.income || 0,
          totalExpense: summary.totalExpense || summary.expense || 0,
          savings: summary.savings || 0,
          transactionCount: summary.transactionCount || 0
        },
        categories: categoryData,
        budgets
      });
      toast.success('Monthly PDF Statement downloaded! 📄');
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [currentMonth]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const monthStr = format(currentMonth, 'yyyy-MM');
      
      const [summaryRes, categoryRes, trendRes, predictionsRes] = await Promise.all([
        api.get(`/analytics/summary?month=${monthStr}`),
        api.get(`/analytics/category-breakdown?month=${monthStr}`),
        api.get('/analytics/monthly-trend'),
        api.get('/analytics/predictions')
      ]);

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
      if (categoryRes.data.success) {
        setCategoryData(categoryRes.data.data);
      }
      if (trendRes.data.success) {
        setTrendData(trendRes.data.data);
      }
      if (predictionsRes.data.success) {
        setPredictions(predictionsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-secondary border border-border p-3 rounded-lg shadow-lg">
          <p className="text-text-primary font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderTrendIcon = (trend) => {
    if (trend === 'up') return <HiArrowTrendingUp className="text-danger w-5 h-5" />;
    if (trend === 'down') return <HiArrowTrendingDown className="text-success w-5 h-5" />;
    return <HiMinus className="text-warning w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
          <p className="text-text-secondary">Insights and trends for your finances</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-text-primary rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <HiOutlineDocumentText className="w-4 h-4 text-accent-primary" />
            <span>{exportingPdf ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          <div className="flex items-center space-x-2 bg-bg-card border border-border rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-bg-hover rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              <HiChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text-primary font-semibold text-xs min-w-[110px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-bg-hover rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              <HiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary font-medium">Total Income</p>
                  <h3 className="text-2xl font-bold text-success mt-1">{formatCurrency(summary.income)}</h3>
                </div>
                <div className="p-3 bg-success/10 rounded-lg">
                  <HiOutlineBanknotes className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>
            
            <div className="glass-card p-5 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary font-medium">Total Expenses</p>
                  <h3 className="text-2xl font-bold text-danger mt-1">{formatCurrency(summary.expense)}</h3>
                </div>
                <div className="p-3 bg-danger/10 rounded-lg">
                  <HiOutlineCurrencyDollar className="w-6 h-6 text-danger" />
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary font-medium">Net Savings</p>
                  <h3 className={`text-2xl font-bold mt-1 ${summary.savings >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(summary.savings)}
                  </h3>
                </div>
                <div className={`p-3 rounded-lg ${summary.savings >= 0 ? 'bg-success/10' : 'bg-danger/10'}`}>
                  <HiOutlineChartBar className={`w-6 h-6 ${summary.savings >= 0 ? 'text-success' : 'text-danger'}`} />
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary font-medium">Transactions</p>
                  <h3 className="text-2xl font-bold text-text-primary mt-1">{summary.transactionCount}</h3>
                </div>
                <div className="p-3 bg-accent-primary/10 rounded-lg">
                  <HiOutlineDocumentText className="w-6 h-6 text-accent-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend */}
            <div className="glass-card p-5 rounded-xl border border-border lg:col-span-2">
              <h3 className="text-lg font-bold text-text-primary mb-4">Monthly Trend (Last 12 Months)</h3>
              <div className="h-[300px]">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00cec9" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#00cec9" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="#a0a0b0" tick={{ fill: '#a0a0b0' }} />
                      <YAxis stroke="#a0a0b0" tick={{ fill: '#a0a0b0' }} tickFormatter={(val) => `$${val}`} />
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" vertical={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#00cec9" fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="expense" name="Expense" stroke="#ff6b6b" fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted">
                    No trend data available
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="glass-card p-5 rounded-xl border border-border">
              <h3 className="text-lg font-bold text-text-primary mb-4">Expense Breakdown</h3>
              <div className="h-[300px]">
                {categoryData && categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="amount"
                        nameKey="category"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: '#12122a', borderColor: '#2d2d44', borderRadius: '0.5rem' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted">
                    No category data for this month
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Predictions Section */}
          <div className="glass-card p-5 rounded-xl border border-border">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-accent-primary">✨</span> AI Spending Predictions
            </h3>
            
            {!predictions || (!predictions.nextMonthTotal && (!predictions.categories || predictions.categories.length === 0)) ? (
              <div className="text-center py-8 text-text-muted">
                <p>Not enough history to generate predictions.</p>
                <p className="text-sm mt-1">Keep adding transactions to see AI forecasts.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-bg-secondary p-4 rounded-lg border border-border md:col-span-1 flex flex-col justify-center">
                  <p className="text-text-secondary text-sm font-medium mb-1">Predicted Next Month Spend</p>
                  <h4 className="text-3xl font-bold text-text-primary mb-2">
                    {formatCurrency(predictions.nextMonthTotal)}
                  </h4>
                  {predictions.confidence && (
                    <div className="flex items-center gap-2 mt-auto">
                      <div className="h-2 w-full bg-bg-primary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent-primary" 
                          style={{ width: `${predictions.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {predictions.confidence}% confidence
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <p className="text-text-secondary text-sm font-medium mb-3">Category Forecasts</p>
                  <div className="space-y-3">
                    {predictions.categories && predictions.categories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-bg-secondary p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-bg-primary rounded-md">
                            {renderTrendIcon(cat.trend)}
                          </div>
                          <span className="text-text-primary font-medium">{cat.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-text-primary font-bold">{formatCurrency(cat.predictedAmount)}</p>
                          <p className="text-xs text-text-muted">
                            {cat.trend === 'up' ? 'Expected to rise' : cat.trend === 'down' ? 'Expected to drop' : 'Stable'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
