import { GoogleGenerativeAI } from '@google/generative-ai';

// In-memory cache for repeated descriptions
const categoryCache = new Map();

/**
 * Categorize a transaction description using Google Gemini
 * @param {string} description - Transaction description
 * @param {string[]} categories - Available category names
 * @returns {Promise<string>} Categorized category name
 */
export const categorizeTransaction = async (description, categories) => {
  if (!description) return 'Other';
  
  const cacheKey = description.toLowerCase().trim();
  if (categoryCache.has(cacheKey)) {
    return categoryCache.get(cacheKey);
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found. Fallback to Other.');
      return 'Other';
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

    const prompt = `
      Categorize the following transaction description into exactly ONE of the provided categories.
      If it doesn't match well, pick the closest one or "Other". 
      Respond with ONLY the exact category name from the list, nothing else.
      
      Categories: ${categories.join(', ')}
      Description: "${description}"
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Validate that the response is actually in the categories list
    const validCategory = categories.find(
      c => c.toLowerCase() === responseText.toLowerCase()
    );
    
    const finalCategory = validCategory || 'Other';
    
    // Cache the result
    categoryCache.set(cacheKey, finalCategory);
    
    // Keep cache size manageable
    if (categoryCache.size > 1000) {
      const firstKey = categoryCache.keys().next().value;
      categoryCache.delete(firstKey);
    }
    
    return finalCategory;
  } catch (error) {
    console.error('AI Categorization Error:', error.message);
    return 'Other';
  }
};

/**
 * Heuristic fallback parser when AI is unavailable or fails
 */
function heuristicParse(rawText, availableCategories = []) {
  const text = rawText.toLowerCase();
  
  // 1. Amount extraction
  let amount = 0;
  const numMatch = text.match(/(?:(?:rs\.?|inr|₹|\$)\s*(\d+(?:[.,]\d+)?))|(?:(\d+(?:[.,]\d+)?)\s*(?:rs\.?|inr|₹|\$|bucks|rupees)?)/i);
  if (numMatch) {
    const rawVal = numMatch[1] || numMatch[2];
    amount = parseFloat(rawVal.replace(/,/g, '')) || 0;
  }

  // 2. Type detection
  const isIncome = /\b(received|salary|credited|got|earned|freelance|bonus|income|refund)\b/.test(text);
  const type = isIncome ? 'income' : 'expense';

  // 3. Date detection
  const today = new Date();
  let date = today.toISOString().split('T')[0];
  if (/\b(yesterday|last night)\b/.test(text)) {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    date = yest.toISOString().split('T')[0];
  }

  // 4. Category detection
  const defaultCats = availableCategories.length ? availableCategories : [
    'Food & Dining', 'Transportation', 'Housing & Rent', 'Utilities', 'Entertainment', 'Shopping', 'Health & Medical', 'Salary', 'Freelance', 'General'
  ];

  let category = type === 'income' ? 'Salary' : 'General';
  if (/\b(food|pizza|burger|lunch|dinner|breakfast|snack|restaurant|swiggy|zomato|coffee|cafe|groceries)\b/.test(text)) {
    category = defaultCats.find(c => /food|dining|grocer/i.test(c)) || 'Food & Dining';
  } else if (/\b(cab|uber|ola|auto|metro|train|flight|bus|fuel|petrol|diesel|gas)\b/.test(text)) {
    category = defaultCats.find(c => /transport/i.test(c)) || 'Transportation';
  } else if (/\b(movie|cinema|netflix|game|party|drinks|club|concert)\b/.test(text)) {
    category = defaultCats.find(c => /entertainment/i.test(c)) || 'Entertainment';
  } else if (/\b(rent|flat|pg|maintenance|room)\b/.test(text)) {
    category = defaultCats.find(c => /rent|housing/i.test(c)) || 'Housing & Rent';
  } else if (/\b(clothes|shirt|shoes|amazon|flipkart|shopping|mall)\b/.test(text)) {
    category = defaultCats.find(c => /shopping/i.test(c)) || 'Shopping';
  } else if (/\b(bill|electricity|water|wifi|broadband|recharge)\b/.test(text)) {
    category = defaultCats.find(c => /utilit|bill/i.test(c)) || 'Utilities';
  }

  // Clean description
  let description = rawText.trim();
  if (description.length > 50) {
    description = description.slice(0, 50);
  }

  return {
    amount,
    type,
    category,
    date,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    note: `Parsed from: "${rawText}"`,
  };
}

/**
 * Parse natural language text into a structured transaction using Gemini with fallback
 * @param {string} rawText - Freeform natural language input (e.g., "Spent 250 on pizza last night")
 * @param {string[]} availableCategories - List of valid category names
 * @returns {Promise<Object>} Structured transaction object { amount, type, category, date, description, note }
 */
export const parseNaturalTransaction = async (rawText, availableCategories = []) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Raw text is required');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const catsList = availableCategories.length > 0 
    ? availableCategories.join(', ')
    : 'Food & Dining, Transportation, Housing & Rent, Utilities, Entertainment, Shopping, Health & Medical, Salary, Freelance, General';

  if (!process.env.GEMINI_API_KEY) {
    return heuristicParse(rawText, availableCategories);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

    const prompt = `
Extract transaction details from this text as JSON only, no other markdown, explanation, or text.
Format:
{
  "amount": <positive number>,
  "type": "income" | "expense",
  "category": <category from list>,
  "date": "YYYY-MM-DD",
  "description": <brief title e.g. "Dinner with friends">,
  "note": <optional extra details or empty string>
}

Rules:
1. If date isn't mentioned, use today's date: "${todayStr}".
2. If text mentions relative date like "yesterday", "last night", or "2 days ago", calculate the exact YYYY-MM-DD relative to "${todayStr}".
3. Choose the best matching category from this list: [${catsList}].
4. Set type to "income" if receiving money, salary, refund, etc. Otherwise "expense".
5. Return ONLY pure valid JSON.

Text: "${rawText}"
    `.trim();

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Validate parsed output
    return {
      amount: typeof parsed.amount === 'number' && !isNaN(parsed.amount) ? Math.abs(parsed.amount) : 0,
      type: parsed.type === 'income' ? 'income' : 'expense',
      category: parsed.category || 'General',
      date: parsed.date || todayStr,
      description: parsed.description || rawText.slice(0, 40),
      note: parsed.note || `Parsed from: "${rawText}"`,
    };
  } catch (error) {
    console.warn('Gemini NLP parse failed, using heuristic fallback:', error.message);
    return heuristicParse(rawText, availableCategories);
  }
};

/**
 * Parse a receipt image buffer using Gemini 1.5 Flash Vision
 * @param {Buffer} imageBuffer - Image binary buffer
 * @param {string} mimeType - Image mime type (e.g. image/jpeg, image/png)
 * @param {string[]} availableCategories - List of user categories
 */
export const parseReceiptImage = async (imageBuffer, mimeType = 'image/jpeg', availableCategories = []) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const catsList = availableCategories.length > 0 
    ? availableCategories.join(', ')
    : 'Food & Dining, Transportation, Housing & Rent, Utilities, Entertainment, Shopping, Health & Medical, Groceries, General';

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required for Receipt Vision OCR');
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

    const prompt = `
Analyze this receipt or bill image carefully. Extract the financial transaction details as JSON only.
Format:
{
  "merchant": <name of the store or vendor>,
  "amount": <total final amount paid as a positive number>,
  "type": "expense",
  "category": <best category from list>,
  "date": "YYYY-MM-DD",
  "description": <clean title like "Walmart Groceries" or "Restaurant Bill">,
  "items": [
    { "name": <item name>, "price": <item price or 0> }
  ],
  "note": <summary of items or invoice number>
}

Categories to pick from: [${catsList}]
If date is not legible or missing, use: "${todayStr}"
Return ONLY pure valid JSON, without any markdown formatting.
    `.trim();

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      amount: typeof parsed.amount === 'number' && !isNaN(parsed.amount) ? Math.abs(parsed.amount) : 0,
      type: 'expense',
      category: parsed.category || 'Shopping',
      date: parsed.date || todayStr,
      description: parsed.description || parsed.merchant || 'Receipt Expense',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      note: parsed.note || (parsed.merchant ? `Receipt from ${parsed.merchant}` : 'Uploaded Receipt OCR'),
    };
  } catch (error) {
    console.error('Receipt OCR parsing failed:', error.message);
    throw new Error(`Receipt OCR error: ${error.message}`);
  }
};

/**
 * Parse bank/UPI transactional SMS text (supports single or multi-line batch)
 * @param {string} smsText - Raw SMS content
 * @param {string[]} availableCategories - List of user categories
 */
export const parseBankSMS = async (smsText, availableCategories = []) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const catsList = availableCategories.length > 0 
    ? availableCategories.join(', ')
    : 'Food & Dining, Transportation, Housing & Rent, Utilities, Entertainment, Shopping, Health & Medical, Salary, Freelance, General';

  if (!process.env.GEMINI_API_KEY) {
    // Regex fallback for common Indian/global bank SMS
    const regex = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:debited|credited|spent|withdrawn|paid)/i;
    const match = smsText.match(regex);
    const amount = match ? parseFloat(match[1].replace(/,/g, '')) : 0;
    const isCredit = /credited|received|deposit/i.test(smsText);

    return [{
      amount,
      type: isCredit ? 'income' : 'expense',
      category: isCredit ? 'Salary' : 'General',
      date: todayStr,
      description: isCredit ? 'Bank Credit Alert' : 'Bank Debit Alert',
      note: smsText.slice(0, 80),
    }];
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

    const prompt = `
Extract all financial transactions from the following bank, credit card, or UPI transactional SMS text.
Return a JSON array of transactions. If multiple SMS messages are provided, extract each one as a separate item.
Format:
[
  {
    "amount": <number>,
    "type": "income" | "expense",
    "category": <category from list>,
    "date": "YYYY-MM-DD",
    "description": <clean title e.g. "Swiggy Order" or "ATM Withdrawal">,
    "note": <account or reference info e.g. "A/C **1234 Ref: 8976">
  }
]

Categories: [${catsList}]
Default date if unspecified: "${todayStr}"
Return ONLY valid JSON array.

SMS text:
"${smsText}"
    `.trim();

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.warn('Bank SMS parsing fallback:', error.message);
    return [{
      amount: 0,
      type: 'expense',
      category: 'General',
      date: todayStr,
      description: 'Bank Transaction',
      note: smsText.slice(0, 80),
    }];
  }
};

