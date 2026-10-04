# 💰 FinanceFlow — Smart Money Management

A comprehensive full-stack personal finance management platform with AI-powered transaction categorization, predictive spending analytics, shared wallets, and rich data visualizations.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)

---

## ✨ Features

### Core
- 🔐 **Authentication** — Secure signup/login with JWT tokens
- 💸 **Transaction Management** — Full CRUD for income & expenses with categories
- 📊 **Budgets** — Set monthly limits per category with animated progress bars
- 📈 **Dashboard** — Monthly spend summary, category breakdown (pie/bar charts)
- 🔄 **Recurring Transactions** — Subscriptions, rent, etc. auto-created via cron
- 🔍 **Filters & Search** — By date range, category, amount range, text search
- 📥 **CSV Export** — Download filtered transactions as CSV

### Standout Features
- 🤖 **AI Auto-Categorization** — Gemini AI categorizes transactions by description
- 🔮 **Predictive Spending** — Forecasts next month's spend using weighted moving averages
- 👥 **Shared Wallets** — Split expenses with family or roommates, track balances

### Premium UI
- 🌙 Dark mode first with glassmorphism design
- ✨ Micro-animations and smooth transitions
- 📱 Fully responsive (mobile, tablet, desktop)
- 📊 Interactive Recharts visualizations

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite) + Tailwind CSS v4 + Recharts |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcryptjs |
| AI | Google Gemini 1.5 Flash |
| Images | Cloudinary + Multer |
| Scheduling | node-cron |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey))
- (Optional) Cloudinary account for receipt uploads

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd finance-management
```

### 2. Setup the backend
```bash
cd server
npm install
```

Create a `.env` file (see `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://your_user:your_pass@cluster.mongodb.net/finance_management
JWT_SECRET=your_secret_key_here
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

Start the server:
```bash
npm run dev
```

### 3. Setup the frontend
```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173` with API requests proxied to `http://localhost:5000`.

---

## 📁 Project Structure

```
├── server/
│   ├── config/          # Database connection
│   ├── controllers/     # Route handlers
│   ├── middleware/       # Auth & error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API route definitions
│   ├── services/        # AI, predictions, cron
│   ├── utils/           # CSV export, category seeder
│   └── server.js        # Entry point
│
├── client/
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── context/     # Auth & theme providers
│       ├── pages/       # Route page components
│       └── utils/       # API client & formatters
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/v1/auth` | Register |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Get current user |
| PUT | `/api/v1/auth/profile` | Update profile |

### Transactions
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/v1/transactions` | List (with filters) |
| POST | `/api/v1/transactions` | Create |
| GET | `/api/v1/transactions/:id` | Get one |
| PUT | `/api/v1/transactions/:id` | Update |
| DELETE | `/api/v1/transactions/:id` | Delete |
| GET | `/api/v1/transactions/export/csv` | Export CSV |

### Budgets
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/v1/budgets` | List for month |
| POST | `/api/v1/budgets` | Create/update |
| DELETE | `/api/v1/budgets/:id` | Delete |
| GET | `/api/v1/budgets/summary` | Summary totals |

### Analytics
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/v1/analytics/summary` | Monthly summary |
| GET | `/api/v1/analytics/category-breakdown` | Category breakdown |
| GET | `/api/v1/analytics/monthly-trend` | 12-month trend |
| GET | `/api/v1/analytics/predictions` | AI predictions |

### Categories
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/v1/categories` | List all |
| POST | `/api/v1/categories` | Create custom |
| PUT | `/api/v1/categories/:id` | Update |
| DELETE | `/api/v1/categories/:id` | Delete |

### Wallets
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/v1/wallets` | Create wallet |
| GET | `/api/v1/wallets` | List wallets |
| GET | `/api/v1/wallets/:id` | Get wallet |
| POST | `/api/v1/wallets/:id/members` | Add member |
| DELETE | `/api/v1/wallets/:id/members/:mid` | Remove member |
| POST | `/api/v1/wallets/:id/transactions` | Add shared expense |
| GET | `/api/v1/wallets/:id/balances` | Get balances |

---

## 📄 License

MIT
