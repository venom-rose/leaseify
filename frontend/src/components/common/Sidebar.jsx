import React from 'react';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  Wrench,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Building,
  Package,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ currentTab, setCurrentTab, isOpen, setIsOpen }) => {
  const { user, role, logout } = useAuth();

  const adminNav = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'AI & Analytics', icon: Sparkles, badge: 'New' },
    { id: 'rentals', label: 'Product Rentals (Orders)', icon: PackageCheck },
    { id: 'products', label: 'Rental Store (Products)', icon: Package },
    { id: 'properties', label: 'Properties & Units', icon: Building2 },
    { id: 'leases', label: 'Lease Agreements', icon: FileText },
    { id: 'payments', label: 'Payments & Revenue', icon: CreditCard },
    { id: 'maintenance', label: 'Maintenance Requests', icon: Wrench },
  ];

  const tenantNav = [
    { id: 'tenant-portal', label: 'My Rental Home', icon: Building },
    { id: 'products', label: 'Rental Store (Items)', icon: Package },
    { id: 'rentals', label: 'My Rented Items', icon: PackageCheck },
    { id: 'analytics', label: 'Fleet Analytics', icon: Sparkles },
    { id: 'payments', label: 'Rent Payments & Dues', icon: CreditCard },
    { id: 'maintenance', label: 'Maintenance Tickets', icon: Wrench },
    { id: 'leases', label: 'My Lease Agreement', icon: FileText },
  ];

  const navItems = role === 'admin' ? adminNav : tenantNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900/95 border-r border-slate-800/80 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800 gap-3">
          <img
            src="/logo.png"
            alt="Leaseify.co Logo"
            className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-teal-500/20 ring-1 ring-white/10 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h1 className="text-base font-black text-white tracking-tight leading-none">
                Lease<span className="text-[#a3e635]">ify</span><span className="text-xs text-sky-400 font-bold">.co</span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5 truncate">
              Lease your Luxury
            </p>
          </div>
        </div>

        {/* Account Status Badge (Read-Only) */}
        <div className="mx-4 my-4 p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                role === 'admin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {role === 'admin' ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">
                {role === 'admin' ? 'Property Administrator' : 'Resident Tenant'}
              </p>
              <p className="text-[10px] text-slate-400">Authenticated Session</p>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-md font-bold uppercase text-[9px] tracking-wider ${
              role === 'admin'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {role}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Menu Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-sky-400" />}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar}
              alt={user?.name}
              className="h-10 w-10 rounded-full object-cover border border-slate-700 ring-2 ring-sky-500/20"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
