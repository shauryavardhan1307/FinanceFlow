import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineBanknotes,
  HiOutlineChartPie,
  HiOutlineChartBar,
  HiOutlineWallet,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiSparkles,
  HiOutlineFlag,
  HiOutlineCalendarDays
} from 'react-icons/hi2';

const navItems = [
  { path: '/', label: 'Dashboard', icon: HiOutlineHome },
  { path: '/transactions', label: 'Transactions', icon: HiOutlineBanknotes },
  { path: '/budgets', label: 'Budgets', icon: HiOutlineChartPie },
  { path: '/goals', label: 'Savings Goals', icon: HiOutlineFlag },
  { path: '/subscriptions', label: 'Subscriptions', icon: HiOutlineCalendarDays },
  { path: '/analytics', label: 'Analytics', icon: HiOutlineChartBar },
  { path: '/wallets', label: 'Wallets', icon: HiOutlineWallet },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog6Tooth },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-72 flex flex-col 
        bg-white border-r border-border
        transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-8 h-24">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent-primary text-white shadow-md">
            <HiSparkles className="w-6 h-6" />
          </div>
          <span className="text-2xl font-display font-bold text-text-primary">
            FinanceFlow
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300
                  ${isActive 
                    ? 'bg-accent-primary/10 text-accent-primary font-medium' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-input'
                  }
                `}
              >
                <Icon className="w-6 h-6" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 mt-auto border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-input">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-primary text-white font-bold text-lg">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-text-secondary hover:text-danger transition-colors rounded-lg hover:bg-bg-hover"
              title="Logout"
            >
              <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
