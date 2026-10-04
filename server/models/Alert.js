import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['overspend_warning', 'budget_exceeded', 'info'],
      default: 'overspend_warning',
    },
    category: {
      type: String,
      required: true,
    },
    month: {
      type: String,
      required: true, // YYYY-MM
    },
    message: {
      type: String,
      required: true,
    },
    spentSoFar: {
      type: Number,
      default: 0,
    },
    projectedAmount: {
      type: Number,
      default: 0,
    },
    budgetLimit: {
      type: Number,
      default: 0,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Unique index per user, category, month, and alert type so we don't spam duplicate alerts
alertSchema.index({ userId: 1, category: 1, month: 1, type: 1 }, { unique: true });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
