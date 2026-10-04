import Category from '../models/Category.js';

const defaultCategories = [
  // Expenses
  { name: 'Food & Dining', icon: '🍔', color: '#ff6b6b', type: 'expense' },
  { name: 'Transportation', icon: '🚗', color: '#feca57', type: 'expense' },
  { name: 'Shopping', icon: '🛍️', color: '#a29bfe', type: 'expense' },
  { name: 'Entertainment', icon: '🎬', color: '#fd79a8', type: 'expense' },
  { name: 'Bills & Utilities', icon: '💡', color: '#fdcb6e', type: 'expense' },
  { name: 'Health', icon: '🏥', color: '#00cec9', type: 'expense' },
  { name: 'Education', icon: '📚', color: '#6c5ce7', type: 'expense' },
  { name: 'Travel', icon: '✈️', color: '#e17055', type: 'expense' },
  { name: 'Groceries', icon: '🛒', color: '#00b894', type: 'expense' },
  { name: 'Rent', icon: '🏠', color: '#d63031', type: 'expense' },
  { name: 'Personal Care', icon: '💆', color: '#e84393', type: 'expense' },
  { name: 'Gifts', icon: '🎁', color: '#0984e3', type: 'expense' },
  { name: 'Other Expense', icon: '📦', color: '#636e72', type: 'expense' },

  // Income
  { name: 'Salary', icon: '💰', color: '#00cec9', type: 'income' },
  { name: 'Freelance', icon: '💻', color: '#6c5ce7', type: 'income' },
  { name: 'Investment', icon: '📈', color: '#00b894', type: 'income' },
  { name: 'Business', icon: '🏢', color: '#0984e3', type: 'income' },
  { name: 'Rental Income', icon: '🏘️', color: '#fdcb6e', type: 'income' },
  { name: 'Other Income', icon: '📦', color: '#636e72', type: 'income' }
];

/**
 * Seeds default categories into the database if they don't exist
 */
export const seedDefaultCategories = async () => {
  try {
    const existingDefaults = await Category.find({ isDefault: true });
    
    if (existingDefaults.length === 0) {
      const categoriesToInsert = defaultCategories.map(cat => ({
        ...cat,
        isDefault: true,
        userId: null
      }));
      
      await Category.insertMany(categoriesToInsert);
      console.log('Default categories seeded successfully.');
    } else {
      console.log('Default categories already exist.');
    }
  } catch (error) {
    console.error(`Error seeding default categories: ${error.message}`);
  }
};
