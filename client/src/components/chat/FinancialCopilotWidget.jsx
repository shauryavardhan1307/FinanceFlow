import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { 
  HiSparkles, 
  HiXMark, 
  HiPaperAirplane, 
  HiOutlineLightBulb, 
  HiOutlineChatBubbleLeftRight,
  HiOutlineArrowPath
} from 'react-icons/hi2';

export default function FinancialCopilotWidget() {
  const { user } = useAuth();
  const { currencySymbol } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your **FinanceFlow AI Copilot**. I have real-time visibility into your transactions, budgets, and savings goals.\n\nAsk me anything like *"Can I afford a ${currencySymbol}15,000 trip?"* or *"Where am I spending the most?"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend = inputMessage) => {
    const text = (textToSend || '').trim();
    if (!text || loading) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-4).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const res = await api.post('/analytics/chat', {
        message: text,
        history: historyPayload
      });

      if (res.data.success && res.data.data) {
        const assistantMsg = {
          role: 'assistant',
          content: res.data.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: err.response?.data?.message || 'Sorry, I hit a snag analyzing your finances. Please try asking again in a moment!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    `Can I afford a ${currencySymbol}15,000 trip right now?`,
    'Where is my money leaking this month?',
    `How can I save ${currencySymbol}10,000 more?`,
    'Give me a 3-step action plan to cut expenses'
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-full shadow-xl shadow-accent-primary/30 hover:scale-105 transition-all duration-300 flex items-center gap-2.5 font-medium text-sm border-2 border-white/20 animate-bounce-subtle"
        >
          <span className="p-1 rounded-full bg-white/20">
            <HiSparkles className="w-4 h-4" />
          </span>
          <span>Ask AI Copilot</span>
        </button>
      )}

      {/* Slide-over Drawer / Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] h-[580px] bg-white border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <HiSparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">FinanceFlow Copilot</h3>
                <span className="text-[11px] text-white/80 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Financial Intelligence
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Reset conversation"
              >
                <HiOutlineArrowPath className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex-shrink-0">
              Try:
            </span>
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white text-accent-primary border border-slate-200 hover:border-accent-primary whitespace-nowrap transition-colors flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/40 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-accent-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <HiSparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-accent-primary text-white rounded-tr-none shadow-sm'
                      : 'bg-white text-text-primary border border-slate-200/80 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="text-xs">{m.content}</p>
                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      m.role === 'user' ? 'text-white/70' : 'text-text-muted'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-text-muted text-xs p-2">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-accent-primary flex items-center justify-center flex-shrink-0">
                  <HiSparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] text-text-muted">Analyzing your finances...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-border flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about your money..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-bg-input border border-border rounded-xl text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-2.5 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl shadow-sm disabled:opacity-40 transition-colors"
            >
              <HiPaperAirplane className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
