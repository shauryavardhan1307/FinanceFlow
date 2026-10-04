import cron from 'node-cron';
import RecurringTransaction from '../models/RecurringTransaction.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { checkPredictiveAlertsForUser } from './alertService.js';

export const startCronJobs = () => {
  // Run daily at midnight: Recurring transactions + Predictive overspend check
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily recurring transactions and predictive overspend checks...');
    try {
      const now = new Date();
      
      // 1. Process recurring transactions
      const dueTransactions = await RecurringTransaction.find({
        isActive: true,
        nextDate: { $lte: now }
      });

      let createdCount = 0;

      for (const recurring of dueTransactions) {
        if (recurring.endDate && recurring.endDate < now) {
          recurring.isActive = false;
          await recurring.save();
          continue;
        }

        await Transaction.create({
          userId: recurring.userId,
          type: recurring.type,
          amount: recurring.amount,
          category: recurring.category,
          description: recurring.description,
          date: recurring.nextDate,
          isRecurring: true,
          recurringId: recurring._id,
        });

        createdCount++;

        const nextDate = new Date(recurring.nextDate);
        switch (recurring.interval) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }
        
        recurring.nextDate = nextDate;
        
        if (recurring.endDate && recurring.nextDate > recurring.endDate) {
          recurring.isActive = false;
        }

        await recurring.save();
      }

      if (createdCount > 0) {
        console.log(`Created ${createdCount} recurring transactions.`);
      }

      // 2. Predictive Overspend Alert scan for all users
      const users = await User.find({}).select('_id');
      for (const u of users) {
        await checkPredictiveAlertsForUser(u._id);
      }
      console.log(`Completed predictive overspend checks for ${users.length} users.`);
    } catch (error) {
      console.error('Error in cron job:', error.message);
    }
  });
  
  console.log('Cron jobs scheduled.');
};
