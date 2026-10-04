import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

/**
 * Predict next month's spending based on the last 6 months using weighted moving average.
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Prediction result
 */
export const predictNextMonthSpend = async (userId) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const transactions = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            year: { $year: '$date' },
            category: '$category'
          },
          totalSpend: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Group by category and sequence the months
    const categoryHistory = {};
    let totalPredicted = 0;

    transactions.forEach(t => {
      const cat = t._id.category;
      if (!categoryHistory[cat]) {
        categoryHistory[cat] = [];
      }
      categoryHistory[cat].push(t.totalSpend);
    });

    const categoryPredictions = [];

    // Calculate weighted moving average
    // Weights for last 6 months (oldest to newest): 1, 1, 2, 2, 3, 4 (sum = 13)
    const weights = [1, 1, 2, 2, 3, 4];

    Object.keys(categoryHistory).forEach(cat => {
      const history = categoryHistory[cat];
      
      // If we don't have enough history, pad with 0s at the start
      while (history.length < 6) {
        history.unshift(0);
      }
      // If we have more than 6, take the last 6
      const recent6 = history.slice(-6);

      let weightedSum = 0;
      let weightSum = 0;

      for (let i = 0; i < 6; i++) {
        // Only apply weight if there was actual spending or if we want to penalize inactivity
        weightedSum += recent6[i] * weights[i];
        weightSum += weights[i];
      }

      const predicted = weightedSum / weightSum;
      const avgSpend = recent6.reduce((a, b) => a + b, 0) / 6;

      let trend = 'stable';
      if (predicted > avgSpend * 1.1) trend = 'up';
      else if (predicted < avgSpend * 0.9) trend = 'down';

      if (predicted > 0) {
        totalPredicted += predicted;
        categoryPredictions.push({
          category: cat,
          predicted: Number(predicted.toFixed(2)),
          trend,
          avgSpend: Number(avgSpend.toFixed(2))
        });
      }
    });

    // Determine confidence based on data volume
    let confidence = 'low';
    if (transactions.length > 30) confidence = 'high';
    else if (transactions.length > 10) confidence = 'medium';

    return {
      totalPredicted: Number(totalPredicted.toFixed(2)),
      categoryPredictions: categoryPredictions.sort((a, b) => b.predicted - a.predicted),
      confidence
    };
  } catch (error) {
    console.error('Prediction Error:', error);
    throw new Error('Failed to generate predictions');
  }
};
