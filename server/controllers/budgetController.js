import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

/**
 * @desc    Get all budgets for a month
 * @route   GET /api/v1/budgets
 * @access  Private
 */
export const getBudgets = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

    const budgets = await Budget.find({ userId: req.user._id, month }).lean();

    // Start and end dates for the month
    const [year, m] = month.split('-');
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);

    const budgetsWithSpend = await Promise.all(
      budgets.map(async (budget) => {
        const spentData = await Transaction.aggregate([
          {
            $match: {
              userId: toObjectId(req.user._id),
              type: 'expense',
              category: budget.category,
              date: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: '$amount' },
            },
          },
        ]);

        const spent = spentData.length > 0 ? spentData[0].totalSpent : 0;
        const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

        return {
          ...budget,
          spent,
          percentage: Number(percentage.toFixed(2)),
        };
      })
    );

    res.status(200).json({ success: true, data: budgetsWithSpend });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or update a budget
 * @route   POST /api/v1/budgets
 * @access  Private
 */
export const createBudget = async (req, res, next) => {
  try {
    const { category, monthlyLimit, month } = req.body;

    if (!category || monthlyLimit === undefined || !month) {
      res.status(400);
      throw new Error('Please provide category, monthlyLimit, and month');
    }

    const filter = { userId: req.user._id, category, month };
    const update = { monthlyLimit };

    const budget = await Budget.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a budget
 * @route   DELETE /api/v1/budgets/:id
 * @access  Private
 */
export const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      res.status(404);
      throw new Error('Budget not found');
    }

    if (budget.userId.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('User not authorized');
    }

    await budget.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get budget summary totals
 * @route   GET /api/v1/budgets/summary
 * @access  Private
 */
export const getBudgetSummary = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const [year, m] = month.split('-');
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);

    const budgets = await Budget.find({ userId: req.user._id, month });
    
    const totalLimit = budgets.reduce((acc, curr) => acc + curr.monthlyLimit, 0);

    const spentData = await Transaction.aggregate([
      {
        $match: {
          userId: toObjectId(req.user._id),
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
          category: { $in: budgets.map((b) => b.category) },
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
        },
      },
    ]);

    const totalSpent = spentData.length > 0 ? spentData[0].totalSpent : 0;
    const overallPercentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalLimit,
        totalSpent,
        overallPercentage: Number(overallPercentage.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    AI-powered smart budget generation
 * @route   POST /api/v1/budgets/ai-generate
 * @access  Private
 */
export const generateAIBudgets = async (req, res, next) => {
  try {
    const { salary, lifestyle = 'balanced', priorities = [], month } = req.body;
    
    if (!salary || salary <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid monthly salary' });
    }

    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const currency = req.user.currency || 'INR';

    // Fetch user's expense categories
    const Category = (await import('../models/Category.js')).default;
    const categories = await Category.find({ 
      $or: [{ userId: req.user._id }, { isDefault: true }],
      type: { $in: ['expense', undefined] }
    }).lean();
    
    const categoryNames = categories.length > 0 
      ? categories.map(c => c.name) 
      : ['Food & Dining', 'Transport', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Utilities', 'Rent/Housing', 'Personal Care', 'Savings'];

    // Fetch recent spending patterns (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const mongoose = (await import('mongoose')).default;
    const Transaction = (await import('../models/Transaction.js')).default;
    const RecurringTransaction = (await import('../models/RecurringTransaction.js')).default;

    const [spendingPatterns, subscriptions] = await Promise.all([
      Transaction.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(req.user._id),
            type: 'expense',
            date: { $gte: threeMonthsAgo }
          } 
        },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      RecurringTransaction.find({ userId: req.user._id, isActive: true }).lean()
    ]);

    const spendingContext = spendingPatterns.length > 0
      ? spendingPatterns.map(s => `${s._id}: ${currency} ${Math.round(s.total / 3).toLocaleString()}/month avg`).join(', ')
      : 'No spending history available';

    // Calculate total monthly subscriptions
    const totalSubscriptions = subscriptions.reduce((sum, s) => {
      if (s.interval === 'yearly') return sum + Math.round(s.amount / 12);
      if (s.interval === 'weekly') return sum + Math.round(s.amount * 4.33);
      return sum + s.amount; // monthly
    }, 0);

    const subscriptionsText = subscriptions.length > 0
      ? subscriptions.map(s => `${s.description}: ${currency} ${s.amount} (${s.interval})`).join(', ')
      : 'None';

    const disposableIncome = salary - totalSubscriptions;

    // Build AI prompt
    const prompt = `You are a personal finance expert. A user wants to create monthly budgets.

User Details:
- Monthly Salary: ${currency} ${salary.toLocaleString()}
- Active Subscriptions/Recurring Bills (${currency} ${totalSubscriptions.toLocaleString()}/month total): ${subscriptionsText}
- Disposable Income After Subscriptions: ${currency} ${disposableIncome.toLocaleString()}
- Lifestyle Preference: ${lifestyle} (${lifestyle === 'frugal' ? 'minimize spending, maximize savings' : lifestyle === 'balanced' ? 'reasonable spending with good savings' : 'comfortable lifestyle with moderate savings'})
- Key Priorities: ${priorities.length > 0 ? priorities.join(', ') : 'general balanced budget'}
- Available Categories: ${categoryNames.join(', ')}
- Recent Average Monthly Spending: ${spendingContext}

Generate a complete monthly budget allocation. STRICT Rules:
1. The TOTAL of ALL allocations MUST be EXACTLY ${currency} ${salary.toLocaleString()} — not a single rupee more, not a single rupee less. This is critical.
2. Account for the existing subscriptions (${currency} ${totalSubscriptions.toLocaleString()}/month) — include them within the relevant budget categories (e.g., Entertainment subscription goes into Entertainment budget)
3. Always include a "Savings" allocation (at least 10-20% depending on lifestyle)
4. Be realistic based on ${currency} economy
5. Consider the user's lifestyle preference and priorities
6. If spending history exists, use it to set realistic limits (but optimize)
7. Include a brief one-line reasoning for each category
8. Double-check: sum all monthlyLimit values and verify they equal exactly ${salary}

Respond ONLY with valid JSON array, no markdown, no code blocks, no explanation outside the JSON:
[{"category": "Category Name", "monthlyLimit": 5000, "reasoning": "Brief reason"}]

IMPORTANT: Return ONLY the JSON array. The sum of all monthlyLimit values MUST equal exactly ${salary}.`;

    let allocations;

    // Try Gemini AI with retry logic
    if (process.env.GEMINI_API_KEY) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
          
          const result = await model.generateContent(prompt);
          let responseText = result.response.text().trim();
          
          // Clean up response - remove markdown code blocks if present
          responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          allocations = JSON.parse(responseText);
          
          // Validate and sanitize
          allocations = allocations
            .filter(a => a.category && a.monthlyLimit > 0)
            .map(a => ({
              category: a.category,
              monthlyLimit: Math.round(a.monthlyLimit),
              reasoning: a.reasoning || ''
            }));

          break; // Success, exit retry loop
        } catch (aiError) {
          const is503 = aiError.message?.includes('503') || aiError.status === 503;
          if (is503 && attempt < maxRetries) {
            console.log(`Gemini 503 on budget generation attempt ${attempt}/${maxRetries}, retrying in ${attempt * 1500}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1500));
            continue;
          }
          console.error('AI budget generation failed, using rule-based fallback:', aiError.message);
          allocations = null;
          break;
        }
      }
    }

    // Fallback: Rule-based allocation (50/30/20 adapted)
    if (!allocations) {
      const needsRatio = lifestyle === 'frugal' ? 0.40 : lifestyle === 'balanced' ? 0.50 : 0.55;
      const wantsRatio = lifestyle === 'frugal' ? 0.25 : lifestyle === 'balanced' ? 0.30 : 0.35;
      const savingsRatio = 1 - needsRatio - wantsRatio;

      const needsCategories = ['Rent/Housing', 'Food & Dining', 'Transport', 'Utilities', 'Healthcare'];
      const wantsCategories = ['Shopping', 'Entertainment', 'Personal Care', 'Education'];

      allocations = [];
      
      let availableNeeds = categoryNames.filter(c => needsCategories.some(n => c.toLowerCase().includes(n.toLowerCase().split('/')[0])));
      let availableWants = categoryNames.filter(c => wantsCategories.some(w => c.toLowerCase().includes(w.toLowerCase())));
      
      if (availableNeeds.length === 0) availableNeeds = ['Food & Dining', 'Transport', 'Utilities'];
      if (availableWants.length === 0) availableWants = ['Shopping', 'Entertainment'];

      const needsBudget = Math.floor(salary * needsRatio);
      const wantsBudget = Math.floor(salary * wantsRatio);
      const savingsBudget = salary - needsBudget - wantsBudget; // remainder goes to savings

      const perNeed = Math.floor(needsBudget / availableNeeds.length);
      const perWant = Math.floor(wantsBudget / availableWants.length);

      availableNeeds.forEach(cat => {
        allocations.push({ category: cat, monthlyLimit: perNeed, reasoning: 'Essential need - 50/30/20 rule allocation' });
      });
      availableWants.forEach(cat => {
        allocations.push({ category: cat, monthlyLimit: perWant, reasoning: 'Lifestyle want - 50/30/20 rule allocation' });
      });

      // Savings gets whatever is left to guarantee total = salary
      const allocatedSoFar = allocations.reduce((s, a) => s + a.monthlyLimit, 0);
      allocations.push({ 
        category: 'Savings', 
        monthlyLimit: salary - allocatedSoFar, 
        reasoning: `${Math.round(savingsRatio * 100)}% savings target` 
      });
    }

    // ===== IRONCLAD FINAL CAP: Guarantee total === salary =====
    let finalTotal = allocations.reduce((sum, a) => sum + a.monthlyLimit, 0);
    if (finalTotal !== salary) {
      const diff = finalTotal - salary; // positive = over budget, negative = under budget
      // Find the largest allocation and adjust it
      const largestIdx = allocations.reduce((maxI, a, i, arr) => 
        a.monthlyLimit > arr[maxI].monthlyLimit ? i : maxI, 0
      );
      allocations[largestIdx].monthlyLimit -= diff;
    }

    // Check if there's a Savings allocation and flag it for auto-goal creation
    const savingsAllocation = allocations.find(a => 
      a.category.toLowerCase().includes('saving') || a.category.toLowerCase().includes('investment')
    );

    res.status(200).json({
      success: true,
      data: {
        allocations,
        salary,
        month: targetMonth,
        totalAllocated: allocations.reduce((sum, a) => sum + a.monthlyLimit, 0),
        isAIGenerated: !!process.env.GEMINI_API_KEY,
        totalSubscriptions,
        subscriptionsCount: subscriptions.length,
        savingsAllocation: savingsAllocation ? {
          monthlySavings: savingsAllocation.monthlyLimit,
          suggestion: `You can save ${currency} ${savingsAllocation.monthlyLimit.toLocaleString()} this month with this plan!`
        } : null
      }
    });
  } catch (error) {
    console.error('Budget AI Generation Error:', error);
    next(error);
  }
};

/**
 * @desc    Batch replace all budgets for a month (used by AI Smart Budget)
 * @route   POST /api/v1/budgets/batch-replace
 * @access  Private
 */
export const batchReplaceBudgets = async (req, res, next) => {
  try {
    const { month, allocations } = req.body;
    if (!month || !Array.isArray(allocations)) {
      res.status(400);
      throw new Error('Please provide month and allocations array');
    }

    // Delete existing budgets for this month
    await Budget.deleteMany({ userId: req.user._id, month });

    // Insert new budgets
    const validAllocations = allocations.filter((a) => a.category && Number(a.monthlyLimit) > 0);
    const docs = validAllocations.map((a) => ({
      userId: req.user._id,
      category: a.category,
      monthlyLimit: Number(a.monthlyLimit),
      month,
    }));

    if (docs.length > 0) {
      await Budget.insertMany(docs);
    }

    res.status(200).json({ success: true, count: docs.length });
  } catch (error) {
    next(error);
  }
};
