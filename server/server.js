import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { seedDefaultCategories } from './utils/seedCategories.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { startCronJobs } from './services/cronService.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express App
const app = express();

// Connect to Database
await connectDB();

// Seed Default Categories
await seedDefaultCategories();

// Apply Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://your-production-url.com' : '*'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting (Relaxed for rich SPA dashboard traffic and skipped in dev)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Generous limit for multi-widget dashboard
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production', // Never block local developer requests
  message: { success: false, message: 'Too many requests, please try again later.' }
});

app.use('/api/', apiLimiter);

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start Cron Jobs
startCronJobs();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
