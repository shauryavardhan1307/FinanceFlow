import Alert from '../models/Alert.js';
import { checkPredictiveAlertsForUser } from '../services/alertService.js';

/**
 * @desc    Get predictive overspend and budget alerts for user
 * @route   GET /api/v1/alerts
 * @access  Private
 */
export const getAlerts = async (req, res, next) => {
  try {
    // 1. Run live predictive analysis so alerts are always fresh
    await checkPredictiveAlertsForUser(req.user._id);

    // 2. Fetch all alerts for user
    const alerts = await Alert.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Alert.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: {
        alerts,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark single alert as read
 * @route   PATCH /api/v1/alerts/:id/read
 * @access  Private
 */
export const markAlertAsRead = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.isRead = true;
    await alert.save();

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all alerts as read
 * @route   PATCH /api/v1/alerts/read-all
 * @access  Private
 */
export const markAllAlertsAsRead = async (req, res, next) => {
  try {
    await Alert.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All alerts marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an alert
 * @route   DELETE /api/v1/alerts/:id
 * @access  Private
 */
export const deleteAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Alert removed',
    });
  } catch (error) {
    next(error);
  }
};
