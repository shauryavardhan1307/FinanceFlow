import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { 
  HiOutlinePlus, 
  HiOutlinePencilSquare, 
  HiOutlineTrash, 
  HiOutlineArrowDownTray, 
  HiOutlineMagnifyingGlass, 
  HiChevronLeft, 
  HiChevronRight, 
  HiOutlineDocumentText 
} from 'react-icons/hi2';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  
  // Filters & Search
  const [type, setType] = useState('all'); // all, income, expense
  const [search, setSearch] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  
  // Global category mapping to resolve any ObjectId string to human-readable name
  const [categoryMap, setCategoryMap] = useState({});
  const [allCategories, setAllCategories] = useState([]);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalCategories, setModalCategories] = useState([]);
  
  const initialFormState = {
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Sync with URL query parameter from Header search bar
  useEffect(() => {
    const currentUrlSearch = searchParams.get('search') || '';
    if (currentUrlSearch !== search) {
      setSearch(currentUrlSearch);
      setDebouncedSearch(currentUrlSearch);
      setPage(1);
    }
  }, [searchParams]);

  // Load all categories on mount to build lookup map for existing transactions
  useEffect(() => {
    const loadAllCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success && Array.isArray(res.data.data)) {
          const map = {};
          res.data.data.forEach((cat) => {
            if (cat._id) map[cat._id] = cat.name;
            if (cat.name) map[cat.name] = cat.name;
          });
          setCategoryMap(map);
          setAllCategories(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load categories lookup', err);
      }
    };
    loadAllCategories();
  }, []);

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (type !== 'all') params.type = type;
      if (debouncedSearch) params.search = debouncedSearch;
      
      const res = await api.get('/transactions', { params });
      if (res.data.success) {
        setTransactions(res.data.data.transactions);
        setPages(res.data.data.pages || 1);
        setTotal(res.data.data.total || 0);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [page, limit, type, debouncedSearch]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset page when type changes
  const handleTypeChange = (newType) => {
    setType(newType);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (val) {
      setSearchParams({ search: val });
    } else {
      setSearchParams({});
    }
  };

  // Fetch modal categories when modal is open or when type changes
  useEffect(() => {
    const fetchModalCategories = async () => {
      if (!isModalOpen) return;
      try {
        const res = await api.get(`/categories?type=${formData.type}`);
        if (res.data.success) {
          const cats = res.data.data;
          setModalCategories(cats);
          
          // Update categoryMap with any new categories
          setCategoryMap((prev) => {
            const updated = { ...prev };
            cats.forEach((c) => {
              if (c._id) updated[c._id] = c.name;
              if (c.name) updated[c.name] = c.name;
            });
            return updated;
          });

          // Ensure formData has a valid category NAME (never an ObjectId)
          const categoryNames = cats.map(c => c.name);
          if (!formData.category || !categoryNames.includes(formData.category)) {
            setFormData(prev => ({ 
              ...prev, 
              category: cats[0]?.name || 'General' 
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load categories', error);
      }
    };
    fetchModalCategories();
  }, [formData.type, isModalOpen]);

  const openModal = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      // Resolve category name if it was stored as an ID or object
      const resolvedCategory = 
        (typeof transaction.category === 'object' ? transaction.category?.name : null) ||
        categoryMap[transaction.category] || 
        transaction.category || 
        '';

      setFormData({
        type: transaction.type,
        amount: transaction.amount,
        category: resolvedCategory,
        description: transaction.description || '',
        date: new Date(transaction.date).toISOString().split('T')[0],
        note: transaction.note || ''
      });
    } else {
      setEditingTransaction(null);
      const defaultCat = modalCategories.find(c => c.type === 'expense' || c.type === 'both')?.name || 'Food & Dining';
      setFormData({
        ...initialFormState,
        category: defaultCat
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setFormData(initialFormState);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        category: formData.category.trim(),
        amount: parseFloat(formData.amount)
      };
      
      if (editingTransaction) {
        const res = await api.put(`/transactions/${editingTransaction._id}`, payload);
        if (res.data.success) toast.success('Transaction updated');
      } else {
        const res = await api.post('/transactions', payload);
        if (res.data.success) toast.success('Transaction added');
      }
      closeModal();
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      const res = await api.delete(`/transactions/${id}`);
      if (res.data.success) {
        toast.success('Transaction deleted');
        fetchTransactions();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete transaction');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/transactions/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to export transactions');
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper to get human-readable category name
  const getCategoryDisplay = (cat) => {
    if (!cat) return 'General';
    if (typeof cat === 'object') return cat.name || 'General';
    if (categoryMap[cat]) return categoryMap[cat];
    // Check if it's a 24-char ObjectId that wasn't yet mapped
    if (cat.length === 24 && /^[0-9a-fA-F]{24}$/.test(cat)) {
      const matched = allCategories.find(c => c._id === cat);
      if (matched) return matched.name;
    }
    return cat;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Transactions</h1>
          <p className="text-text-secondary text-sm">
            {total} total transaction{total === 1 ? '' : 's'} recorded
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border rounded-xl text-text-primary hover:bg-bg-hover transition-colors font-medium text-sm"
          >
            <HiOutlineArrowDownTray className="w-4 h-4 text-text-secondary" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl hover:bg-accent-secondary transition-colors shadow-md shadow-accent-primary/20 font-medium text-sm"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Add New</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-card bg-bg-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-bg-secondary p-1 rounded-xl w-full sm:w-auto border border-border">
          {['all', 'income', 'expense'].map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                type === t 
                  ? 'bg-accent-primary text-white shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        
        <div className="relative w-full sm:w-72">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-sm text-text-primary placeholder:text-text-secondary transition-all"
          />
          {search && (
            <button 
              onClick={() => handleSearchChange({ target: { value: '' } })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-secondary border-b border-border text-text-secondary text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Description</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold text-right">Amount</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-text-secondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm">Loading transactions...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-3">
                      <HiOutlineDocumentText className="w-12 h-12 opacity-40 text-text-muted" />
                      <p className="font-medium text-text-primary">No transactions found</p>
                      <p className="text-xs text-text-muted">
                        {search ? 'Try clearing your search query.' : 'Click "Add New" to record your first transaction.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-bg-hover/60 transition-colors">
                    <td className="p-4 text-sm text-text-secondary whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-text-primary">{tx.description || 'No description'}</div>
                      {tx.note && <div className="text-xs text-text-muted mt-0.5">{tx.note}</div>}
                    </td>
                    <td className="p-4 text-sm whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-bg-secondary rounded-lg text-xs font-medium border border-border text-text-primary">
                        {getCategoryDisplay(tx.category)}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-semibold whitespace-nowrap ${
                      tx.type === 'income' ? 'text-success' : 'text-text-primary'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => openModal(tx)}
                          className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <HiOutlinePencilSquare className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(tx._id)}
                          className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && transactions.length > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm text-text-secondary">
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border bg-bg-secondary hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-medium text-text-primary">
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="p-1.5 rounded-lg border border-border bg-bg-secondary hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <HiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex bg-bg-secondary p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => {
                handleInputChange({ target: { name: 'type', value: 'expense' } });
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.type === 'expense' ? 'bg-danger text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                handleInputChange({ target: { name: 'type', value: 'income' } });
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.type === 'income' ? 'bg-success text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-medium">
                {currencySymbol}
              </span>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full pl-8 pr-4 py-2.5 bg-bg-secondary border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-text-primary"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
            <input
              type="text"
              name="description"
              required
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-text-primary"
              placeholder="E.g., Grocery Shopping"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-bg-secondary border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-text-primary"
              >
                <option value="" disabled>Select category</option>
                {modalCategories.map((cat) => (
                  <option key={cat._id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-bg-secondary border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Note (Optional)</label>
            <textarea
              name="note"
              rows="2"
              value={formData.note}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary resize-none text-text-primary"
              placeholder="Additional details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 border border-border rounded-xl text-text-secondary hover:bg-bg-hover transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl transition-colors shadow-md shadow-accent-primary/20 text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingTransaction ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
