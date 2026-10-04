export const formatCurrency = (amount, customCurrency = null) => {
  const curr = customCurrency || (typeof window !== 'undefined' ? localStorage.getItem('app_currency') : null) || 'INR';
  const locales = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CAD: 'en-CA',
    AUD: 'en-AU',
  };
  return new Intl.NumberFormat(locales[curr] || 'en-IN', {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: curr === 'JPY' ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

export const formatDate = (date, format = 'short') => {
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  return d.toLocaleDateString();
};

export const formatRelativeDate = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diffInDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return formatDate(date);
};

export const getMonthName = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const getPercentage = (value, total) => {
  if (!total || total === 0) return 0;
  const percentage = (value / total) * 100;
  return Math.min(Math.max(percentage, 0), 100);
};

export const truncate = (str, length = 30) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
};
