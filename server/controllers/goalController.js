import Goal from '../models/Goal.js';

/**
 * @desc    Get all savings goals with calculated metrics
 * @route   GET /api/v1/goals
 * @access  Private
 */
export const getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ userId: req.user._id }).sort({ targetDate: 1 });

    const now = new Date();
    const enrichedGoals = goals.map((goal) => {
      const g = goal.toObject();
      const progress = g.targetAmount > 0 
        ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
        : 0;

      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
      const targetDate = new Date(g.targetDate);
      const diffTime = targetDate - now;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
      const suggestedMonthlySaving = remainingAmount > 0 ? Math.round(remainingAmount / monthsLeft) : 0;

      return {
        ...g,
        progress,
        remainingAmount,
        daysLeft: Math.max(0, daysLeft),
        suggestedMonthlySaving,
      };
    });

    const totalTarget = goals.reduce((acc, curr) => acc + curr.targetAmount, 0);
    const totalSaved = goals.reduce((acc, curr) => acc + curr.currentAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        goals: enrichedGoals,
        totalTarget,
        totalSaved,
        overallProgress: totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new savings goal
 * @route   POST /api/v1/goals
 * @access  Private
 */
export const createGoal = async (req, res, next) => {
  try {
    const { name, targetAmount, currentAmount = 0, targetDate, category, color, icon } = req.body;

    const goal = await Goal.create({
      userId: req.user._id,
      name,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      targetDate: new Date(targetDate),
      category: category || 'General',
      color: color || '#2563eb',
      icon: icon || '🎯',
      isCompleted: Number(currentAmount) >= Number(targetAmount),
    });

    res.status(201).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a goal
 * @route   PUT /api/v1/goals/:id
 * @access  Private
 */
export const updateGoal = async (req, res, next) => {
  try {
    let goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const { name, targetAmount, currentAmount, targetDate, category, color, icon } = req.body;

    if (name) goal.name = name;
    if (targetAmount !== undefined) goal.targetAmount = Number(targetAmount);
    if (currentAmount !== undefined) goal.currentAmount = Number(currentAmount);
    if (targetDate) goal.targetDate = new Date(targetDate);
    if (category) goal.category = category;
    if (color) goal.color = color;
    if (icon) goal.icon = icon;

    goal.isCompleted = goal.currentAmount >= goal.targetAmount;
    await goal.save();

    res.status(200).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deposit / allocate funds to a goal
 * @route   POST /api/v1/goals/:id/deposit
 * @access  Private
 */
export const depositToGoal = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const depositVal = Number(amount);

    if (!depositVal || depositVal <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid deposit amount' });
    }

    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    goal.currentAmount += depositVal;
    if (goal.currentAmount >= goal.targetAmount) {
      goal.isCompleted = true;
    }
    await goal.save();

    res.status(200).json({
      success: true,
      data: goal,
      message: `Deposited ₹${depositVal.toLocaleString()} toward ${goal.name}!`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a goal
 * @route   DELETE /api/v1/goals/:id
 * @access  Private
 */
export const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
