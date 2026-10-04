import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import { useCurrency } from '../../context/CurrencyContext';
import { 
  HiSparkles, 
  HiArrowRight, 
  HiOutlineCheckCircle,
  HiOutlineCalendar,
  HiOutlineCamera,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineArrowUpTray,
  HiOutlineTrash
} from 'react-icons/hi2';

export default function NaturalEntryBar({ onTransactionCreated }) {
  const { currencySymbol, formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState('nlp'); // 'nlp' | 'ocr' | 'sms'
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // SMS Batch State
  const [smsInput, setSmsInput] = useState('');
  const [batchParsed, setBatchParsed] = useState([]);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  
  // Parsed / Editable Transaction state
  const [parsedData, setParsedData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    items: []
  });

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // 1. Natural Language Parse
  const handleParse = async (textToParse = inputText) => {
    const query = (textToParse || '').trim();
    if (!query) {
      toast.error('Please enter a transaction description');
      return;
    }

    setParsing(true);
    try {
      const res = await api.post('/transactions/parse', { rawText: query });
      if (res.data.success && res.data.data) {
        const item = res.data.data;
        setParsedData({
          type: item.type || 'expense',
          amount: item.amount || '',
          category: item.category || 'General',
          description: item.description || query,
          date: item.date || new Date().toISOString().split('T')[0],
          note: item.note || `Parsed via natural language: "${query}"`,
          items: []
        });
        setIsConfirmOpen(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse transaction');
    } finally {
      setParsing(false);
    }
  };

  // 2. Receipt OCR Upload
  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    setParsing(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await api.post('/transactions/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.data) {
        const item = res.data.data;
        setParsedData({
          type: 'expense',
          amount: item.amount || '',
          category: item.category || 'Shopping',
          description: item.description || 'Receipt Expense',
          date: item.date || new Date().toISOString().split('T')[0],
          note: item.note || (item.items?.length ? item.items.map(i => `${i.name}: ${currencySymbol}${i.price}`).join(', ') : 'Scanned receipt'),
          items: item.items || []
        });
        toast.success('Receipt scanned with AI Vision! 📸');
        setIsConfirmOpen(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to scan receipt with AI');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Bank SMS Parse
  const handleSmsParse = async () => {
    if (!smsInput.trim()) {
      toast.error('Please paste your bank or UPI SMS');
      return;
    }

    setParsing(true);
    try {
      const res = await api.post('/transactions/parse-sms', { smsText: smsInput });
      if (res.data.success && Array.isArray(res.data.data)) {
        setBatchParsed(res.data.data);
        setIsBatchOpen(true);
        toast.success(`Extracted ${res.data.data.length} transaction(s) from SMS!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse SMS');
    } finally {
      setParsing(false);
    }
  };

  // Batch Save all SMS transactions
  const handleSaveBatch = async () => {
    setSaving(true);
    try {
      let saved = 0;
      for (const item of batchParsed) {
        if (Number(item.amount) > 0) {
          await api.post('/transactions/confirm', {
            type: item.type || 'expense',
            amount: Number(item.amount),
            category: item.category || 'General',
            description: item.description || 'Bank SMS Transaction',
            date: item.date || new Date().toISOString().split('T')[0],
            note: item.note || '',
          });
          saved++;
        }
      }

      toast.success(`Successfully saved ${saved} transactions! 🎉`);
      setIsBatchOpen(false);
      setSmsInput('');
      setBatchParsed([]);
      if (onTransactionCreated) onTransactionCreated();
    } catch (err) {
      toast.error('Failed to save batch transactions');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setParsedData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmSave = async (e) => {
    e.preventDefault();
    if (!parsedData.amount || Number(parsedData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: parsedData.type,
        amount: parseFloat(parsedData.amount),
        category: parsedData.category || 'General',
        description: parsedData.description || 'Quick Transaction',
        date: parsedData.date,
        note: parsedData.note,
      };

      const res = await api.post('/transactions/confirm', payload);
      if (res.data.success) {
        toast.success('Transaction saved successfully! 🎉');
        setIsConfirmOpen(false);
        setInputText('');
        if (onTransactionCreated) {
          onTransactionCreated(res.data.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const samplePrompts = [
    `Spent ${currencySymbol}350 on Uber to office`,
    `Paid ${currencySymbol}1,200 for electricity bill`,
    `Got ${currencySymbol}45,000 freelance payment yesterday`,
    `${currencySymbol}280 pizza for dinner last night`,
  ];

  return (
    <div className="glass-card bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-100/40 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col gap-3.5 relative z-10">
        {/* Tab Headers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('nlp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'nlp' ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <HiSparkles className="w-3.5 h-3.5" />
              <span>AI Plain Text</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'ocr' ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <HiOutlineCamera className="w-3.5 h-3.5" />
              <span>📸 Scan Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sms')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'sms' ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" />
              <span>📲 Bank SMS</span>
            </button>
          </div>

          <span className="text-xs font-medium text-text-muted hidden md:inline">
            Zero manual typing • Powered by Gemini AI
          </span>
        </div>

        {/* Tab 1: Natural Language Text */}
        {activeTab === 'nlp' && (
          <div className="space-y-2.5">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleParse();
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={`e.g. Spent ${currencySymbol}450 on lunch with friends yesterday...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={parsing}
                  className="w-full pl-4 pr-10 py-3 bg-bg-input border border-border rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                />
                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={parsing || !inputText.trim()}
                className="px-5 py-3 bg-accent-primary hover:bg-accent-secondary text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-accent-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {parsing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Parsing with AI...</span>
                  </>
                ) : (
                  <>
                    <span>Parse & Review</span>
                    <HiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-xs text-text-muted mr-1">Quick tests:</span>
              {samplePrompts.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(sample);
                    handleParse(sample);
                  }}
                  disabled={parsing}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-50/70 hover:bg-blue-100/70 text-accent-primary border border-blue-100 transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Receipt OCR Upload */}
        {activeTab === 'ocr' && (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/30 text-center hover:bg-blue-50/50 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleReceiptUpload}
              className="hidden"
              id="receipt-file-input"
              disabled={parsing}
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-accent-primary flex items-center justify-center mb-3">
              <HiOutlineCamera className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Upload Bill or Receipt Photo
            </h3>
            <p className="text-xs text-text-muted max-w-sm mb-4">
              Gemini Vision scans store name, item breakdown, taxes, date, and final total automatically.
            </p>
            <label
              htmlFor="receipt-file-input"
              className={`px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white font-medium rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer ${
                parsing ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {parsing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scanning Receipt with Vision AI...</span>
                </>
              ) : (
                <>
                  <HiOutlineArrowUpTray className="w-4 h-4" />
                  <span>Select Receipt Image</span>
                </>
              )}
            </label>
          </div>
        )}

        {/* Tab 3: Bank SMS Quick-Paste */}
        {activeTab === 'sms' && (
          <div className="space-y-3">
            <textarea
              rows={3}
              placeholder="Paste your bank or UPI SMS here... (e.g. 'A/C **1234 debited by Rs 450.00 on 24-Sep at SWIGGY UPI ref 4289...')"
              value={smsInput}
              onChange={(e) => setSmsInput(e.target.value)}
              disabled={parsing}
              className="w-full p-3 bg-bg-input border border-border rounded-xl text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                Tip: You can paste multiple SMS alerts together to batch-log expenses.
              </span>
              <button
                type="button"
                onClick={handleSmsParse}
                disabled={parsing || !smsInput.trim()}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-secondary text-white font-medium rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {parsing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <span>Extract SMS</span>
                    <HiArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal — Editable Review Card */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Review & Confirm Transaction"
      >
        <form onSubmit={handleConfirmSave} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2 text-xs text-text-secondary">
            <HiOutlineCheckCircle className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-text-primary">AI extracted details below.</span>
              <p>Verify and edit anything before saving to your records.</p>
            </div>
          </div>

          {/* Type Toggle */}
          <div className="flex bg-bg-secondary p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setParsedData(p => ({ ...p, type: 'expense' }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                parsedData.type === 'expense' ? 'bg-danger text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setParsedData(p => ({ ...p, type: 'income' }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                parsedData.type === 'income' ? 'bg-success text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-medium">{currencySymbol}</span>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                required
                value={parsedData.amount}
                onChange={handleInputChange}
                className="w-full pl-8 pr-4 py-2.5 bg-bg-input border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-text-primary font-semibold text-lg"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
            <input
              type="text"
              name="description"
              required
              value={parsedData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 bg-bg-input border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-text-primary"
              placeholder="e.g. Pizza with friends"
            />
          </div>

          {/* Line items if receipt OCR parsed them */}
          {parsedData.items && parsedData.items.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
                Scanned Items ({parsedData.items.length})
              </h4>
              <div className="max-h-28 overflow-y-auto space-y-1 divide-y divide-slate-100 text-xs text-text-primary">
                {parsedData.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between pt-1">
                    <span className="truncate pr-2">{it.name}</span>
                    <span className="font-semibold whitespace-nowrap">{currencySymbol}{it.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
              <select
                name="category"
                required
                value={parsedData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-bg-input border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-text-primary text-sm"
              >
                <option value={parsedData.category}>{parsedData.category}</option>
                {categories.map((c) => (
                  c.name !== parsedData.category && (
                    <option key={c._id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  )
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
              <input
                type="date"
                name="date"
                required
                value={parsedData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-bg-input border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-text-primary text-sm"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Note / Details</label>
            <textarea
              name="note"
              rows="2"
              value={parsedData.note}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-bg-input border border-border rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary resize-none text-text-primary text-sm"
              placeholder="Additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-text-secondary hover:bg-bg-hover transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white font-medium rounded-xl text-sm transition-colors shadow-md shadow-accent-primary/20 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <HiOutlineCheckCircle className="w-4 h-4" />
                  <span>Confirm & Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch SMS Review Modal */}
      <Modal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        title={`Review Extracted Transactions (${batchParsed.length})`}
      >
        <div className="space-y-4">
          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            {batchParsed.map((tx, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-text-primary text-sm">{tx.description}</p>
                  <p className="text-text-muted mt-0.5">{tx.date} • {tx.category}</p>
                  {tx.note && <p className="text-[11px] text-text-secondary mt-0.5 truncate max-w-xs">{tx.note}</p>}
                </div>
                <div className="text-right">
                  <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-success' : 'text-text-primary'}`}>
                    {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount}
                  </span>
                  <span className="block text-[10px] uppercase font-semibold text-text-muted">{tx.type}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsBatchOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-text-secondary hover:bg-bg-hover text-sm font-medium"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={saving}
              className="px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white font-medium rounded-xl text-sm shadow-md shadow-accent-primary/20 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving All...</span>
                </>
              ) : (
                <>
                  <HiOutlineCheckCircle className="w-4 h-4" />
                  <span>Save All ({batchParsed.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
