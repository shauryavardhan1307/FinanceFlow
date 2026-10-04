import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import Alert from '../models/Alert.js';
import Category from '../models/Category.js';

/**
 * Linear projection formula:
 * dailyRate = categorySpendSoFar / dayOfMonth
 * projected = dailyRate * daysInMonth
 */
export function projectMonthEndSpend(categorySpendSoFar, dayOfMonth, daysInMonth) {
  if (categorySpendSoFar <= 0 || dayOfMonth <= 0) return 0;
  const dailyRate = categorySpendSoFar / Math.max(1, dayOfMonth);
  return Math.round(dailyRate * daysInMonth);
}

/**
 * Scan all budgets for a user in the current month, project spending,
 * and generate/update predictive overspend alerts.
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Array>} List of generated or active alerts
 */
export const checkPredictiveAlertsForUser = async (userId) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const monthNumber = now.getMonth() + 1;
    const currentMonthStr = `${year}-${String(monthNumber).padStart(2, '0')}`;
    const dayOfMonth = now.getDate();
    // Days in current month
    const daysInMonth = new Date(year, monthNumber, 0).getDate();

    // Start and end of current month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Fetch budgets for current month
    const budgets = await Budget.find({
      userId,
      month: currentMonthStr,
    });

    if (!budgets.length) return [];

    // Also get all categories to map any objectId stored in old transactions
    const allCategories = await Category.find();
    const catMap = {};
    allCategories.forEach((c) => {
      catMap[c._id.toString()] = c.name;
    });

    const alerts = [];

    for (const budget of budgets) {
      // Find matching category aliases
      const categoryNames = [budget.category];
      Object.entries(catMap).forEach(([id, name]) => {
        if (name.toLowerCase() === budget.category.toLowerCase()) {
          categoryNames.push(id);
        }
      });

      // Aggregate spend so far this month
      const transactions = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
            category: { $in: categoryNames },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const spendSoFar = transactions.length > 0 ? transactions[0].total : 0;
      const projected = projectMonthEndSpend(spendSoFar, dayOfMonth, daysInMonth);

      // Check if already exceeded
      if (spendSoFar >= budget.monthlyLimit) {
        const excess = Math.round(spendSoFar - budget.monthlyLimit);
        const alert = await Alert.findOneAndUpdate(
          {
            userId,
            category: budget.category,
            month: currentMonthStr,
            type: 'budget_exceeded',
          },
          {
            userId,
            category: budget.category,
            month: currentMonthStr,
            type: 'budget_exceeded',
            message: `${budget.category} budget exceeded! Spent ₹${spendSoFar.toLocaleString()} of ₹${budget.monthlyLimit.toLocaleString()} (₹${excess.toLocaleString()} over limit).`,
            spentSoFar: spendSoFar,
            projectedAmount: projected,
            budgetLimit: budget.monthlyLimit,
            createdAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        alerts.push(alert);
      } 
      // Check if projected to exceed (and we have at least 1 day of data)
      else if (projected > budget.monthlyLimit && spendSoFar > 0) {
        const excess = Math.round(projected - budget.monthlyLimit);
        const alert = await Alert.findOneAndUpdate(
          {
            userId,
            category: budget.category,
            month: currentMonthStr,
            type: 'overspend_warning',
          },
          {
            userId,
            category: budget.category,
            month: currentMonthStr,
            type: 'overspend_warning',
            message: `At current pace, you're projected to exceed your ${budget.category} budget by ₹${excess.toLocaleString()} by month-end (Estimated: ₹${projected.toLocaleString()} vs ₹${budget.monthlyLimit.toLocaleString()}).`,
            spentSoFar: spendSoFar,
            projectedAmount: projected,
            budgetLimit: budget.monthlyLimit,
            createdAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        alerts.push(alert);
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error checking predictive alerts:', error);
    return [];
  }
};
