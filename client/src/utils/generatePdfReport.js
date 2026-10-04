import { jsPDF } from 'jspdf';

/**
 * Generate a branded, executive monthly financial PDF report
 * @param {Object} options
 * @param {string} options.userName
 * @param {string} options.userEmail
 * @param {string} options.month - YYYY-MM
 * @param {string} options.currency - INR / USD
 * @param {Object} options.summary - { totalIncome, totalExpense, savings, savingsRate }
 * @param {Array} options.categories - [{ _id, total }]
 * @param {Array} options.budgets - [{ category, monthlyLimit, spent, percentage }]
 * @param {Array} options.recentTransactions - [{ date, description, category, amount, type }]
 */
export const generatePdfReport = async ({
  userName = 'User',
  userEmail = '',
  month = new Date().toISOString().slice(0, 7),
  currency = 'INR',
  summary = { totalIncome: 0, totalExpense: 0, savings: 0, transactionCount: 0 },
  categories = [],
  budgets = [],
  recentTransactions = []
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currSymbol = currency === 'USD' ? '$' : 'Rs. ';
  const [year, m] = month.split('-');
  const monthName = new Date(year, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // 1. Header Banner
  doc.setFillColor(37, 99, 235); // Electric Blue #2563eb
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCEFLOW', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Monthly Financial Statement & Performance Report', 14, 23);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(monthName.toUpperCase(), 196, 16, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 196, 23, { align: 'right' });

  // 2. Client Profile Info
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Account Holder: ${userName}`, 14, 46);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  if (userEmail) doc.text(`Email: ${userEmail}`, 14, 51);

  // 3. KPI Metrics Summary Cards (4 columns)
  const savingsRate = summary.totalIncome > 0 
    ? Math.round((summary.savings / summary.totalIncome) * 100) 
    : 0;

  const kpis = [
    { label: 'TOTAL INCOME', value: `${currSymbol}${summary.totalIncome.toLocaleString()}`, color: [16, 185, 129] },
    { label: 'TOTAL EXPENSE', value: `${currSymbol}${summary.totalExpense.toLocaleString()}`, color: [239, 68, 68] },
    { label: 'NET SAVINGS', value: `${currSymbol}${summary.savings.toLocaleString()}`, color: [37, 99, 235] },
    { label: 'SAVINGS RATE', value: `${savingsRate}%`, color: [139, 92, 246] },
  ];

  let startX = 14;
  kpis.forEach((k) => {
    // Card background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(startX, 58, 43, 24, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(startX, 58, 43, 24, 2, 2, 'S');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, startX + 4, 65);

    doc.setFontSize(11);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.value, startX + 4, 75);

    startX += 46;
  });

  // 4. Section: Category Spending Breakdown
  let currentY = 92;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Expense Breakdown by Category', 14, currentY);
  currentY += 6;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 7, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Category', 18, currentY + 5);
  doc.text('Amount Spent', 120, currentY + 5);
  doc.text('% of Expenses', 180, currentY + 5, { align: 'right' });
  currentY += 7;

  // Rows
  const totalExp = summary.totalExpense || 1;
  const topCats = categories.slice(0, 6);
  if (topCats.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('No expenses recorded for this month.', 18, currentY + 6);
    currentY += 10;
  } else {
    topCats.forEach((c) => {
      const pct = Math.round((c.total / totalExp) * 100);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(c._id || 'General', 18, currentY + 5);
      doc.text(`${currSymbol}${c.total.toLocaleString()}`, 120, currentY + 5);
      doc.text(`${pct}%`, 180, currentY + 5, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 7, 196, currentY + 7);
      currentY += 7;
    });
  }

  // 5. Section: Budget Performance Table
  currentY += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Budget Compliance', 14, currentY);
  currentY += 6;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 7, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Category', 18, currentY + 5);
  doc.text('Limit', 80, currentY + 5);
  doc.text('Spent', 120, currentY + 5);
  doc.text('Status', 180, currentY + 5, { align: 'right' });
  currentY += 7;

  if (budgets.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('No budgets set for this month.', 18, currentY + 6);
    currentY += 10;
  } else {
    budgets.slice(0, 5).forEach((b) => {
      const pct = b.monthlyLimit > 0 ? (b.spent / b.monthlyLimit) * 100 : 0;
      const isOver = pct >= 100;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(b.category, 18, currentY + 5);
      doc.text(`${currSymbol}${b.monthlyLimit.toLocaleString()}`, 80, currentY + 5);
      doc.text(`${currSymbol}${b.spent.toLocaleString()}`, 120, currentY + 5);

      if (isOver) {
        doc.setTextColor(239, 68, 68);
        doc.text(`Exceeded (${Math.round(pct)}%)`, 180, currentY + 5, { align: 'right' });
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text(`On Track (${Math.round(pct)}%)`, 180, currentY + 5, { align: 'right' });
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 7, 196, currentY + 7);
      currentY += 7;
    });
  }

  // 6. Section: Executive AI Insights & Guidance
  currentY += 8;
  doc.setFillColor(239, 246, 255); // Soft blue
  doc.roundedRect(14, currentY, 182, 34, 3, 3, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, currentY, 182, 34, 3, 3, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('AI Financial Intelligence Summary', 20, currentY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  let insightLine1 = `For ${monthName}, you retained ${currSymbol}${summary.savings.toLocaleString()} of your income (${savingsRate}% savings rate).`;
  let insightLine2 = savingsRate >= 20 
    ? 'Excellent financial discipline! Your savings rate meets the recommended 50/30/20 benchmark.'
    : 'Recommendation: Try cutting discretionary food & entertainment expenses to push savings above 20%.';
  let insightLine3 = `Top spending concentration was in "${categories[0]?._id || 'General'}" representing ${totalExp > 1 ? Math.round((categories[0]?.total || 0) / totalExp * 100) : 0}% of all outflows.`;

  doc.text(insightLine1, 20, currentY + 14);
  doc.text(insightLine2, 20, currentY + 20);
  doc.text(insightLine3, 20, currentY + 26);

  // 7. Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('FinanceFlow • Intelligent Wealth & Expense OS • Confidential Financial Report', 105, 287, { align: 'center' });

  // Save / Trigger Download
  doc.save(`FinanceFlow_Statement_${month}.pdf`);
};
