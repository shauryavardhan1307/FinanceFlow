import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext(null);

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)', locale: 'en-IN' },
  { code: 'USD', symbol: '$', label: 'USD ($)', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)', locale: 'ja-JP' },
  { code: 'CAD', symbol: 'C$', label: 'CAD ($)', locale: 'en-CA' },
  { code: 'AUD', symbol: 'A$', label: 'AUD ($)', locale: 'en-AU' },
];

export const CurrencyProvider = ({ children }) => {
  const { user, updateProfile } = useAuth();

  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem('app_currency') || user?.currency || 'INR';
  });

  // Sync with user profile when it loads
  useEffect(() => {
    if (user?.currency && !localStorage.getItem('app_currency')) {
      setCurrencyState(user.currency);
      localStorage.setItem('app_currency', user.currency);
    }
  }, [user?.currency]);

  const setCurrency = useCallback(async (newCurrency, saveToBackend = true) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('app_currency', newCurrency);

    if (saveToBackend && updateProfile) {
      try {
        await updateProfile({ currency: newCurrency });
      } catch (err) {
        console.error('Failed to sync currency to profile:', err);
      }
    }
  }, [updateProfile]);

  const formatCurrency = useCallback((amount, customCurr = null) => {
    const activeCurrency = customCurr || currency || 'INR';
    const found = SUPPORTED_CURRENCIES.find(c => c.code === activeCurrency);
    const locale = found?.locale || 'en-IN';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: activeCurrency,
      maximumFractionDigits: activeCurrency === 'JPY' ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(Number(amount) || 0);
  }, [currency]);

  const currencySymbol = useMemo(() => {
    const found = SUPPORTED_CURRENCIES.find(c => c.code === currency);
    return found?.symbol || '₹';
  }, [currency]);

  const value = useMemo(() => ({
    currency,
    setCurrency,
    formatCurrency,
    currencySymbol,
    supportedCurrencies: SUPPORTED_CURRENCIES,
  }), [currency, setCurrency, formatCurrency, currencySymbol]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    const cached = typeof window !== 'undefined' ? (localStorage.getItem('app_currency') || 'INR') : 'INR';
    const found = SUPPORTED_CURRENCIES.find(c => c.code === cached);
    return {
      currency: cached,
      setCurrency: () => {},
      currencySymbol: found?.symbol || '₹',
      formatCurrency: (val) => `${found?.symbol || '₹'}${Number(val || 0).toLocaleString()}`,
      supportedCurrencies: SUPPORTED_CURRENCIES,
    };
  }
  return context;
};
