import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { toast } from 'react-hot-toast';
import { 
  HiOutlineUser, 
  HiOutlineMoon, 
  HiOutlineSun, 
  HiOutlineCurrencyDollar, 
  HiOutlineShieldCheck,
  HiOutlineCheck
} from 'react-icons/hi2';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency, supportedCurrencies } = useCurrency();
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences state
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Security state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  useEffect(() => {
    setSelectedCurrency(currency);
  }, [currency]);

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    try {
      setSavingProfile(true);
      await updateProfile({ name: name.trim() });
      toast.success('Profile updated successfully! ✨');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Save Preferences (Currency)
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      setSavingPreferences(true);
      await setCurrency(selectedCurrency, true);
      toast.success(`Currency updated to ${selectedCurrency}! All analytics and transactions updated. 💰`);
    } catch (err) {
      toast.error('Failed to update currency preference');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Handle Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter a new password');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setSavingPassword(true);
      await updateProfile({ password });
      toast.success('Password updated successfully! 🔒');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary text-sm">Manage your account preferences, currency, and security.</p>
      </div>

      {/* Preferences Section (Currency & Theme) */}
      <section className="glass-card p-6 rounded-2xl border border-border bg-white shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="p-2 rounded-xl bg-accent-primary/10 text-accent-primary">
            <HiOutlineCurrencyDollar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">App Preferences</h2>
            <p className="text-xs text-text-muted">Configure default currency format and app appearance</p>
          </div>
        </div>
        
        <form onSubmit={handleSavePreferences} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border/60">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Appearance</h3>
              <p className="text-xs text-text-secondary">Toggle between light and dark visual mode</p>
            </div>
            <button 
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-input border border-border hover:bg-bg-hover transition-colors self-start sm:self-auto text-xs font-bold"
            >
              {theme === 'dark' ? (
                <><HiOutlineSun className="w-4 h-4 text-warning" /> <span>Switch to Light Mode</span></>
              ) : (
                <><HiOutlineMoon className="w-4 h-4 text-accent-primary" /> <span>Switch to Dark Mode</span></>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Default Currency</h3>
              <p className="text-xs text-text-secondary">
                Used across Analytics, Dashboard, Budgets, Goals, and Transactions
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <select 
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="px-4 py-2 rounded-xl bg-bg-input border border-border text-text-primary text-sm font-bold focus:outline-none focus:border-accent-primary cursor-pointer"
              >
                {supportedCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={savingPreferences}
              className="px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <HiOutlineCheck className="w-4 h-4" />
              <span>{savingPreferences ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Profile Section */}
      <section className="glass-card p-6 rounded-2xl border border-border bg-white shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="p-2 rounded-xl bg-accent-primary/10 text-accent-primary">
            <HiOutlineUser className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Profile Information</h2>
            <p className="text-xs text-text-muted">Update your display name and personal details</p>
          </div>
        </div>
        
        <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-3xl font-extrabold text-white shadow-md shrink-0">
            {name?.charAt(0) || user?.name?.charAt(0) || 'U'}
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-bg-input border border-border text-text-primary text-sm focus:outline-none focus:border-accent-primary font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border/60 text-text-secondary text-sm cursor-not-allowed"
                />
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-accent-primary hover:bg-accent-secondary text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Security Section */}
      <section className="glass-card p-6 rounded-2xl border border-border bg-white shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="p-2 rounded-xl bg-accent-primary/10 text-accent-primary">
            <HiOutlineShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Security</h2>
            <p className="text-xs text-text-muted">Change your account password</p>
          </div>
        </div>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">New Password</label>
            <input 
              type="password" 
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-bg-input border border-border text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Confirm New Password</label>
            <input 
              type="password" 
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-bg-input border border-border text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            />
          </div>
          <button 
            type="submit"
            disabled={savingPassword}
            className="px-5 py-2.5 bg-bg-input border border-border hover:bg-bg-hover text-text-primary rounded-xl transition-colors text-xs font-bold disabled:opacity-50"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  );
}
