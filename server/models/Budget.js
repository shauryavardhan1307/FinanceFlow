import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    monthlyLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/, // YYYY-MM format
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound unique index on userId, category, and month
budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);

export default Budget;
