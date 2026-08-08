import React from 'react';
import { Menu, Wifi, WifiOff, LogOut, Plus, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export const Navbar = ({ onMenuClick, onNewPropertyClick, onCartClick }) => {
  const { user, role, isBackendConnected, logout } = useAuth();
  const { totalItemCount } = useCart();

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {isBackendConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Wifi className="w-3.5 h-3.5" />
              <span>Backend Connected</span>
            </div>
          ) : (
            <div
              title="Running on interactive client demo mode"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Standalone Demo Mode</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Rental Cart Trigger */}
        <button
          onClick={onCartClick}
          className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="View Rental Cart"
        >
          <ShoppingBag className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">Cart</span>
          {totalItemCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-white text-[10px] font-bold">
              {totalItemCount}
            </span>
          )}
        </button>

        {role === 'admin' && onNewPropertyClick && (
          <button
            onClick={onNewPropertyClick}
            className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-slate-300 text-xs font-medium transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>

        <div className="h-8 w-px bg-slate-800 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5 pl-1">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
            alt={user?.name || 'User Avatar'}
            className="h-8 w-8 rounded-full object-cover border border-slate-700 ring-2 ring-sky-500/20"
          />
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-white leading-none">{user?.name?.split(' ')[0] || 'User'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
