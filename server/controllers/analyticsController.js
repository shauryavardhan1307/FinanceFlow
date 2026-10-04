import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import Goal from '../models/Goal.js';
import RecurringTransaction from '../models/RecurringTransaction.js';
import { predictNextMonthSpend } from '../services/predictionService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

/**
 * @desc    Get summary for a given month
 * @route   GET /api/v1/analytics/summary
 * @access  Private
 */
export const getSummary = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [year, m] = month.split('-');
    
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);

    const stats = await Transaction.aggregate([
      {
        $match: {
          userId: toObjectId(req.user._id),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let income = 0;
    let expense = 0;
    let transactionCount = 0;

    stats.forEach((stat) => {
      transactionCount += stat.count;
      if (stat._id === 'income') {
        income = stat.total;
      } else if (stat._id === 'expense') {
        expense = stat.total;
      }
    });

    const savings = income - expense;

    res.status(200).json({
      success: true,
      data: {
        totalIncome: income,
        totalExpense: expense,
        savings,
        transactionCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get category breakdown
 * @route   GET /api/v1/analytics/category-breakdown
 * @access  Private
 */
export const getCategoryBreakdown = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, m] = month.split('-');
    
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);

    const breakdown = await Transaction.aggregate([
      {
        $match: {
          userId: toObjectId(req.user._id),
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          _id: 0,
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    res.status(200).json({ success: true, data: breakdown });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly trend (last 12 months)
 * @route   GET /api/v1/analytics/monthly-trend
 * @access  Private
 */
export const getMonthlyTrend = async (req, res, next) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const transactions = await Transaction.aggregate([
      {
        $match: {
          userId: toObjectId(req.user._id),
          date: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const trendMap = {};

    // Initialize last 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trendMap[key] = { month: key, income: 0, expense: 0, savings: 0 };
    }

    transactions.forEach((t) => {
      const key = `${t._id.year}-${String(t._id.month).padStart(2, '0')}`;
      if (trendMap[key]) {
        if (t._id.type === 'income') {
          trendMap[key].income += t.total;
        } else if (t._id.type === 'expense') {
          trendMap[key].expense += t.total;
        }
        trendMap[key].savings = trendMap[key].income - trendMap[key].expense;
      }
    });

    // Convert to sorted array
    const trend = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month));

    res.status(200).json({ success: true, data: trend });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get spending predictions
 * @route   GET /api/v1/analytics/predictions
 * @access  Private
 */
export const getPredictions = async (req, res, next) => {
  try {
    const predictions = await predictNextMonthSpend(req.user._id);
    res.status(200).json({ success: true, data: predictions });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    AI Financial Advisor Chat Copilot
 * @route   POST /api/v1/analytics/chat
 * @access  Private
 */
export const askFinancialCopilot = async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const userId = req.user._id;
    const currency = req.user.currency || 'INR';
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Gather live financial snapshot
    const [monthStats, topCategories, budgets, goals, subscriptions, recentTx] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: toObjectId(userId), date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { userId: toObjectId(userId), type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]),
      Budget.find({ userId, month: currentMonthStr }).lean(),
      Goal.find({ userId, isCompleted: false }).lean(),
      RecurringTransaction.find({ userId, isActive: true }).lean(),
      Transaction.find({ userId }).sort({ date: -1 }).limit(8).lean(),
    ]);

    let income = 0;
    let expense = 0;
    monthStats.forEach((s) => {
      if (s._id === 'income') income = s.total;
      if (s._id === 'expense') expense = s.total;
    });
    const netSavings = income - expense;
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

    const categoriesText = topCategories.map(c => `${c._id}: ${currency} ${c.total.toLocaleString()}`).join(', ') || 'No expenses yet';
    
    // Enhanced budget context with spent vs limit
    const budgetsText = budgets.length > 0
      ? budgets.map(b => {
          const spent = topCategories.find(c => c._id === b.category)?.total || 0;
          const remaining = b.monthlyLimit - spent;
          return `${b.category} (Limit: ${currency} ${b.monthlyLimit}, Spent: ${currency} ${spent}, Remaining: ${currency} ${remaining})`;
        }).join('; ')
      : 'No active budgets';
    
    const totalBudgeted = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
    const totalBudgetSpent = budgets.reduce((sum, b) => {
      const spent = topCategories.find(c => c._id === b.category)?.total || 0;
      return sum + spent;
    }, 0);
    const totalBudgetRemaining = totalBudgeted - totalBudgetSpent;

    const goalsText = goals.map(g => `${g.name} (${currency} ${g.currentAmount} / ${g.targetAmount}, Target: ${new Date(g.targetDate).toLocaleDateString()})`).join('; ') || 'No active goals';
    const subsText = subscriptions.map(s => `${s.description} (${currency} ${s.amount} ${s.interval})`).join(', ') || 'None';
    const recentTxText = recentTx.map(t => `${t.type === 'income' ? '+' : '-'}${currency} ${t.amount} for "${t.description || t.category}" on ${new Date(t.date).toLocaleDateString()}`).join(' | ') || 'None';

    const systemPrompt = `
You are FinanceFlow AI Copilot, a sharp, friendly, and practical personal wealth and budgeting advisor.
You are chatting with ${req.user.name || 'the user'}.

Here is the user's real-time financial snapshot:
- User Currency: ${currency}
- Current Month (${currentMonthStr}):
  • Income: ${currency} ${income.toLocaleString()}
  • Expenses: ${currency} ${expense.toLocaleString()}
  • Net Savings: ${currency} ${netSavings.toLocaleString()} (Savings Rate: ${savingsRate}%)
- Top Spending Categories this month: ${categoriesText}
- Active Budgets (${budgets.length} categories, Total Limit: ${currency} ${totalBudgeted.toLocaleString()}, Total Spent: ${currency} ${totalBudgetSpent.toLocaleString()}, Remaining: ${currency} ${totalBudgetRemaining.toLocaleString()}):
  ${budgetsText}
- Active Savings Goals: ${goalsText}
- Subscriptions & Recurring Bills: ${subsText}
- Recent Transactions (all-time last 8): ${recentTxText}

Guidelines for your response:
1. Ground your advice directly in the numbers above. Use BUDGETS as the PRIMARY data source for affordability and spending analysis. If the user has set budgets, those represent their planned financial limits.
2. If the user asks whether they can afford a purchase, trip, or gadget:
   - First check their budget remaining amounts to see how much room they have
   - Calculate discretionary buffer = Total Budget Remaining + (Income - Total Budgeted) if income exists
   - If no income is recorded yet but budgets exist, use the budget limits as the reference for their financial capacity
   - Give a clear answer: "Yes, you can afford it safely", "Proceed with caution", or "Better to wait"
   - Suggest which budget category the expense would fall under
3. Point out specific spending leaks or areas where they can cut back if asked for advice.
4. Keep the response concise, punchy, well-formatted with markdown bullet points and bold numbers.
5. Always be encouraging and practical. Do not speak in abstract jargon.
6. If the user has no transactions yet but has budgets, analyze their budget allocation and give advice based on that.
    `.trim();

    // Build local fallback response
    const localReply = budgets.length > 0
      ? `Here's your budget snapshot for this month:\n- **Total Budgeted**: ${currency} ${totalBudgeted.toLocaleString()}\n- **Total Spent**: ${currency} ${totalBudgetSpent.toLocaleString()}\n- **Budget Remaining**: ${currency} ${totalBudgetRemaining.toLocaleString()}\n- **Income**: ${currency} ${income.toLocaleString()}\n- **Active Budgets**: ${budgets.length} categories\n\n${budgets.map(b => {
          const spent = topCategories.find(c => c._id === b.category)?.total || 0;
          return `• **${b.category}**: ${currency} ${spent.toLocaleString()} / ${currency} ${b.monthlyLimit.toLocaleString()}`;
        }).join('\n')}\n\nUse the budget limits above to plan your expenses wisely!`
      : `Based on your current numbers for this month:\n- **Income**: ${currency} ${income.toLocaleString()}\n- **Expenses**: ${currency} ${expense.toLocaleString()}\n- **Net Savings**: ${currency} ${netSavings.toLocaleString()} (${savingsRate}% savings rate)\n- **Top Spend**: ${categoriesText}\n\nYou currently have **${currency} ${Math.max(0, netSavings).toLocaleString()}** in net monthly savings buffer.`;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({ success: true, data: { reply: localReply } });
    }

    // Try Gemini AI with retry logic for 503 errors
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const promptParts = [
      systemPrompt,
      ...history.slice(-4).map(h => `${h.role === 'user' ? 'User' : 'Copilot'}: ${h.content}`),
      `User: ${message}`,
      `Copilot:`,
    ].join('\n\n');

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
        const result = await model.generateContent(promptParts);
        const reply = result.response.text().trim();
        return res.status(200).json({ success: true, data: { reply } });
      } catch (aiError) {
        const is503 = aiError.message?.includes('503') || aiError.status === 503;
        if (is503 && attempt < maxRetries) {
          console.log(`Gemini 503 on attempt ${attempt}/${maxRetries}, retrying in ${attempt * 1500}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1500));
          continue;
        }
        console.error(`Gemini AI call failed after ${attempt} attempt(s), using fallback:`, aiError.message);
        return res.status(200).json({ success: true, data: { reply: localReply } });
      }
    }
  } catch (error) {
    console.error('Financial Copilot Chat Error:', error);
    next(error);
  }
};

