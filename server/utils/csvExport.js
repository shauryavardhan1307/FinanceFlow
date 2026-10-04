/**
 * Converts an array of transaction objects into a CSV string.
 * @param {Array} transactions - Array of transaction objects
 * @returns {string} CSV formatted string
 */
export const exportTransactionsToCSV = (transactions) => {
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Description', 'Note'];
  
  const escapeCsvField = (field) => {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const rows = transactions.map(t => {
    const date = t.date ? new Date(t.date).toISOString().split('T')[0] : '';
    return [
      date,
      t.type,
      t.category,
      t.amount,
      t.description || '',
      t.note || ''
    ].map(escapeCsvField).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};
