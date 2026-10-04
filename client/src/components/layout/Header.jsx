import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineBars3, 
  HiOutlineBell, 
  HiOutlineMagnifyingGlass, 
  HiOutlineSun, 
  HiOutlineMoon, 
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineExclamationCircle,
  HiOutlineSparkles
} from 'react-icons/hi2';

export default function Header({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Alerts & Notifications
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const notifRef = useRef(null);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    const title = path.split('/')[1];
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // Fetch real predictive alerts & budget notices
  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const res = await api.get('/alerts');
      if (res.data.success) {
        setAlerts(res.data.data.alerts || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (_) {
      // Fallback gracefully
    } finally {
      setLoadingAlerts(false);
    }
  };

  // Initial fetch on mount & poll every 2 minutes
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 120000);
    return () => clearInterval(interval);
  }, []);

  const toggleNotifications = () => {
    const next = !showNotifs;
    setShowNotifs(next);
    if (next) fetchAlerts();
  };

  const markAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.patch(`/alerts/${id}/read`);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/alerts/read-all');
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      setUnreadCount(0);
      toast.success('All alerts marked as read');
    } catch (err) {
      console.error(err);
    }
  };

  const dismissAlert = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a._id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 flex items-center justify-between px-6 lg:px-10 bg-white/80 backdrop-blur-xl border-b border-border sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <HiOutlineBars3 className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-display font-semibold text-text-primary hidden sm:block">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Working Search Bar */}
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search transactions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-64 rounded-xl bg-bg-input border border-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all duration-300"
          />
        </form>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
          </button>
          
          {/* Predictive Alerts Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={toggleNotifications}
              className="relative p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              title="Notifications & Predictive Alerts"
            >
              <HiOutlineBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 w-88 sm:w-96 bg-white border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-down z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <HiOutlineSparkles className="w-4 h-4 text-accent-primary" />
                    <h3 className="font-semibold text-text-primary text-sm">Predictive Alerts</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead}
                        className="text-xs text-accent-primary hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifs(false)} className="text-text-muted hover:text-text-primary">
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
                  {loadingAlerts ? (
                    <div className="p-8 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                      <span className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                      <span>Checking predictive forecasts...</span>
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="p-8 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                      <HiOutlineCheck className="w-8 h-8 text-success opacity-80" />
                      <p className="font-medium text-text-primary">All budgets on track!</p>
                      <p className="text-xs text-text-muted">No projected overspend detected for this month.</p>
                    </div>
                  ) : (
                    alerts.map((a) => (
                      <div 
                        key={a._id} 
                        className={`p-3.5 transition-colors relative group ${
                          a.isRead ? 'bg-white opacity-70 hover:opacity-100' : 'bg-blue-50/40 hover:bg-blue-50/70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">
                            {a.type === 'budget_exceeded' ? (
                              <span className="p-1 rounded-md bg-red-100 text-danger inline-block">
                                <HiOutlineExclamationCircle className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="p-1 rounded-md bg-amber-100 text-warning inline-block">
                                <HiOutlineExclamationTriangle className="w-4 h-4" />
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                                {a.category}
                              </span>
                              {!a.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                              )}
                            </div>
                            <p className="text-sm font-medium text-text-primary mt-0.5 leading-snug">
                              {a.message}
                            </p>
                            <p className="text-[11px] text-text-muted mt-1">
                              {new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {/* Quick Action Icons */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!a.isRead && (
                            <button
                              onClick={(e) => markAsRead(a._id, e)}
                              className="p-1 text-text-muted hover:text-accent-primary rounded hover:bg-white transition-colors"
                              title="Mark as read"
                            >
                              <HiOutlineCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => dismissAlert(a._id, e)}
                            className="p-1 text-text-muted hover:text-danger rounded hover:bg-white transition-colors"
                            title="Dismiss"
                          >
                            <HiOutlineXMark className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
