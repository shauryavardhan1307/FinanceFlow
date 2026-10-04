import Transaction from '../models/Transaction.js';
import { 
  categorizeTransaction, 
  parseNaturalTransaction,
  parseReceiptImage,
  parseBankSMS
} from '../services/aiService.js';
import Category from '../models/Category.js';
import { exportTransactionsToCSV } from '../utils/csvExport.js';

/**
 * @desc    Get all transactions for user
 * @route   GET /api/v1/transactions
 * @access  Private
 */
export const getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, minAmount, maxAmount, search, sort = '-date', page = 1, limit = 10 } = req.query;

    const query = { userId: req.user._id };

    if (type) query.type = type;
    if (category) query.category = category;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip(startIndex)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single transaction
 * @route   GET /api/v1/transactions/:id
 * @access  Private
 */
export const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      res.status(404);
      throw new Error('Transaction not found');
    }

    if (transaction.userId.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('User not authorized');
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a transaction
 * @route   POST /api/v1/transactions
 * @access  Private
 */
export const createTransaction = async (req, res, next) => {
  try {
    let { type, amount, category, description, date, note, receiptUrl, isRecurring, recurringId, walletId, tags } = req.body;

    if (!type || amount === undefined) {
      res.status(400);
      throw new Error('Please add type and amount');
    }

    // AI Categorization if category is missing but description is present
    if (!category && description) {
      const userCategories = await Category.find({
        $and: [
          { $or: [{ userId: req.user._id }, { isDefault: true }] },
          { $or: [{ type: type }, { type: 'both' }] }
        ]
      });
      const categoryNames = userCategories.map(c => c.name);
      
      category = await categorizeTransaction(description, categoryNames);
    } else if (!category) {
      category = 'Other Expense';
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount,
      category,
      description,
      date,
      note,
      receiptUrl,
      isRecurring,
      recurringId,
      walletId,
      tags
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a transaction
 * @route   PUT /api/v1/transactions/:id
 * @access  Private
 */
export const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      res.status(404);
      throw new Error('Transaction not found');
    }

    if (transaction.userId.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('User not authorized');
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedTransaction });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a transaction
 * @route   DELETE /api/v1/transactions/:id
 * @access  Private
 */
export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      res.status(404);
      throw new Error('Transaction not found');
    }

    if (transaction.userId.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('User not authorized');
    }

    await transaction.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export transactions to CSV
 * @route   GET /api/v1/transactions/export/csv
 * @access  Private
 */
export const exportCSV = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, search } = req.query;

    const query = { userId: req.user._id };

    if (type) query.type = type;
    if (category) query.category = category;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Transaction.find(query).sort('-date').lean();

    const csvData = exportTransactionsToCSV(transactions);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Parse natural language text into a structured transaction
 * @route   POST /api/v1/transactions/parse
 * @access  Private
 */
export const parseTransaction = async (req, res, next) => {
  try {
    const rawText = req.body.rawText || req.body.text;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide transaction text' });
    }

    // Fetch user or default category names
    const userCategories = await Category.find({
      $or: [{ userId: req.user._id }, { isDefault: true }]
    }).select('name');
    const categoryNames = userCategories.map(c => c.name);

    const parsed = await parseNaturalTransaction(rawText, categoryNames);

    res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm and save parsed transaction
 * @route   POST /api/v1/transactions/confirm
 * @access  Private
 */
export const confirmTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, description, date, note } = req.body;
    
    if (!type || !amount || !category) {
      return res.status(400).json({ success: false, message: 'Missing required transaction fields' });
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount: Number(amount),
      category,
      description: description || 'Transaction',
      date: date ? new Date(date) : new Date(),
      note: note || '',
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Parse receipt image using Gemini Vision OCR
 * @route   POST /api/v1/transactions/ocr
 * @access  Private
 */
export const parseReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a receipt image' });
    }

    const userCategories = await Category.find({
      $or: [{ userId: req.user._id }, { isDefault: true }]
    }).select('name');
    const categoryNames = userCategories.map(c => c.name);

    const parsed = await parseReceiptImage(req.file.buffer, req.file.mimetype, categoryNames);

    res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Parse single or bulk bank/UPI SMS
 * @route   POST /api/v1/transactions/parse-sms
 * @access  Private
 */
export const parseSMS = async (req, res, next) => {
  try {
    const smsText = req.body.smsText || req.body.text;
    if (!smsText || !smsText.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide SMS text' });
    }

    const userCategories = await Category.find({
      $or: [{ userId: req.user._id }, { isDefault: true }]
    }).select('name');
    const categoryNames = userCategories.map(c => c.name);

    const parsedTransactions = await parseBankSMS(smsText, categoryNames);

    res.status(200).json({
      success: true,
      data: parsedTransactions,
    });
  } catch (error) {
    next(error);
  }
};

