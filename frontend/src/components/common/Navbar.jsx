import React from 'react';
import { Menu, Wifi, WifiOff, LogOut, Plus, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export const Navbar = ({ onMenuClick, onNewPropertyClick, onCartClick, onNotificationClick }) => {
  const { user, role, isBackendConnected, logout } = useAuth();
  const { totalItemCount } = useCart();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-warm-200 px-4 sm:px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-warm-500 hover:text-warm-900 hover:bg-warm-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {isBackendConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-medium">
              <Wifi className="w-3.5 h-3.5" />
              <span>Backend Connected</span>
            </div>
          ) : (
            <div
              title="Running on interactive client demo mode"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Standalone Demo Mode</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Smart Notifications Bell */}
        <button
          onClick={onNotificationClick}
          className="relative p-2 rounded-xl bg-warm-100 border border-warm-200 text-warm-600 hover:text-amber-700 hover:border-amber-300 transition-all flex items-center justify-center text-xs font-semibold"
          title="Smart Notifications & Alerts"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1.5 animate-pulse" />
          <svg
            className="w-4 h-4 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* Rental Cart Trigger */}
        <button
          onClick={onCartClick}
          className="relative p-2 rounded-xl bg-warm-100 border border-warm-200 text-warm-600 hover:text-amber-700 hover:border-amber-300 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="View Rental Cart"
        >
          <ShoppingBag className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">Cart</span>
          {totalItemCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-warm-900 text-[10px] font-bold">
              {totalItemCount}
            </span>
          )}
        </button>

        {role === 'admin' && onNewPropertyClick && (
          <button
            onClick={onNewPropertyClick}
            className="hidden sm:flex items-center gap-2 btn-amber text-xs px-3.5 py-2 rounded-xl active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warm-100 border border-warm-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-warm-600 text-xs font-medium transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>

        <div className="h-8 w-px bg-warm-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5 pl-1">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
            alt={user?.name || 'User Avatar'}
            className="h-8 w-8 rounded-full object-cover border border-warm-300 ring-2 ring-amber-200/40"
          />
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-warm-900 leading-none">{user?.name?.split(' ')[0] || 'User'}</p>
            <p className="text-[10px] text-warm-500 capitalize">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
