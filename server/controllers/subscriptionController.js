import RecurringTransaction from '../models/RecurringTransaction.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

/**
 * @desc    Get all subscriptions with monthly burn and upcoming renewals
 * @route   GET /api/v1/subscriptions
 * @access  Private
 */
export const getSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await RecurringTransaction.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ nextDate: 1 });

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let monthlyBurn = 0;
    const upcomingRenewals = [];

    subscriptions.forEach((sub) => {
      // Calculate monthly equivalent amount
      let monthlyEquivalent = sub.amount;
      if (sub.interval === 'daily') monthlyEquivalent = sub.amount * 30;
      else if (sub.interval === 'weekly') monthlyEquivalent = sub.amount * 4.33;
      else if (sub.interval === 'yearly') monthlyEquivalent = sub.amount / 12;

      if (sub.type === 'expense') {
        monthlyBurn += monthlyEquivalent;
      }

      // Check renewals in next 30 days
      const nextDate = new Date(sub.nextDate);
      if (nextDate <= thirtyDaysLater) {
        const daysLeft = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
        upcomingRenewals.push({
          ...sub.toObject(),
          daysLeft: Math.max(0, daysLeft),
          monthlyEquivalent: Math.round(monthlyEquivalent),
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        subscriptions,
        monthlyBurn: Math.round(monthlyBurn),
        upcomingRenewals: upcomingRenewals.sort((a, b) => a.daysLeft - b.daysLeft),
        totalCount: subscriptions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Auto-detect repeating transactions as subscriptions
 * @route   POST /api/v1/subscriptions/detect
 * @access  Private
 */
export const detectSubscriptions = async (req, res, next) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Group transactions by description & amount
    const patterns = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user._id),
          type: 'expense',
          date: { $gte: ninetyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            desc: { $toLower: '$description' },
            amount: '$amount',
          },
          count: { $sum: 1 },
          category: { $first: '$category' },
          lastDate: { $max: '$date' },
        },
      },
      {
        $match: {
          count: { $gte: 2 }, // Appeared at least twice in 90 days
        },
      },
    ]);

    // Check which ones are already added
    const existing = await RecurringTransaction.find({
      userId: req.user._id,
    });
    const existingKeys = new Set(
      existing.map((s) => `${s.description.toLowerCase()}_${s.amount}`)
    );

    const candidates = [];
    for (const p of patterns) {
      const key = `${p._id.desc}_${p._id.amount}`;
      if (!existingKeys.has(key)) {
        const nextDate = new Date(p.lastDate);
        nextDate.setMonth(nextDate.getMonth() + 1); // Estimated next cycle

        candidates.push({
          description: p._id.desc.charAt(0).toUpperCase() + p._id.desc.slice(1),
          amount: p._id.amount,
          category: p.category,
          interval: 'monthly',
          type: 'expense',
          occurrences: p.count,
          estimatedNextDate: nextDate,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        detected: candidates,
        count: candidates.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new subscription
 * @route   POST /api/v1/subscriptions
 * @access  Private
 */
export const createSubscription = async (req, res, next) => {
  try {
    const { description, amount, category, interval = 'monthly', nextDate, type = 'expense' } = req.body;

    const sub = await RecurringTransaction.create({
      userId: req.user._id,
      description,
      amount: Number(amount),
      category: category || 'General',
      interval,
      type,
      startDate: new Date(),
      nextDate: nextDate ? new Date(nextDate) : new Date(),
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: sub,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/Cancel a subscription
 * @route   DELETE /api/v1/subscriptions/:id
 * @access  Private
 */
export const deleteSubscription = async (req, res, next) => {
  try {
    const sub = await RecurringTransaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription removed',
    });
  } catch (error) {
    next(error);
  }
};
