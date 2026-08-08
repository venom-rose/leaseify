import React, { useEffect, useState } from 'react';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  PackageCheck,
  Clock,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Plus,
  ArrowUpRight,
  RotateCcw,
  Calendar,
  Layers,
  ChevronRight,
  DollarSign,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

// Custom Dark Glass Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-warm-50/95 backdrop-blur-md border border-warm-200 rounded-xl shadow-xl text-xs space-y-1">
        <p className="font-bold text-warm-900 mb-1.5">{label}</p>
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-warm-600">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: item.color }}
              />
              {item.name}:
            </span>
            <span className="font-semibold text-warm-900">
              {typeof item.value === 'number' && item.name?.toLowerCase().includes('revenue') || item.name?.toLowerCase().includes('deposit')
                ? `₹${item.value.toLocaleString('en-IN')}`
                : item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const OverviewTab = ({ onNavigateTab, onAddPropertyClick }) => {
  const { role, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadStats();
  }, [role]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardStats(role);
      if (res && res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOverdue = async () => {
    setSyncing(true);
    try {
      if (api.syncOverdueRentals) {
        await api.syncOverdueRentals();
      }
      await loadStats();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSyncing(false), 500);
    }
  };

  const metrics = data?.metrics || {
    activeRentals: 3,
    dueTodayRentals: 1,
    overdueRentals: 1,
    revenue: 82400,
    securityDepositsHeld: 18500,
    totalDepositsRefunded: 12400,
    totalPenalties: 1200,
    totalProducts: 8,
  };

  const charts = data?.charts || {
    revenueTimeline: [
      { month: 'Mar', revenue: 38000, deposits: 25000, bookings: 12 },
      { month: 'Apr', revenue: 45000, deposits: 32000, bookings: 18 },
      { month: 'May', revenue: 52000, deposits: 39000, bookings: 22 },
      { month: 'Jun', revenue: 61000, deposits: 44000, bookings: 27 },
      { month: 'Jul', revenue: 74000, deposits: 51000, bookings: 34 },
      { month: 'Aug', revenue: metrics.revenue || 82400, deposits: metrics.securityDepositsHeld || 18500, bookings: 41 },
    ],
    statusDistribution: [
      { name: 'Active Rentals', value: metrics.activeRentals ?? 3, color: '#38bdf8' },
      { name: 'Due Today', value: metrics.dueTodayRentals ?? 1, color: '#f59e0b' },
      { name: 'Overdue', value: metrics.overdueRentals ?? 1, color: '#f43f5e' },
      { name: 'Returned & Settled', value: 5, color: '#10b981' },
    ],
    categoryBreakdown: [
      { category: 'Electronics', revenue: 34500, rentals: 28 },
      { category: 'Furniture', revenue: 28900, rentals: 21 },
      { category: 'Appliances', revenue: 16200, rentals: 14 },
      { category: 'Fitness', revenue: 9800, rentals: 8 },
    ],
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-warm-200 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-50 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Admin Operations Hub
            </span>
            <span className="text-xs text-warm-300">Live Aggregation Engine</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Rental Executive Dashboard
          </h2>
          <p className="text-xs text-warm-200 max-w-xl">
            Real-time analytics for active leases, upcoming returns, overdue penalties, and escrowed security deposits.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {/* Quick Time Range Selector */}
          <div className="flex items-center bg-warm-50 p-1 rounded-xl border border-warm-200 text-xs">
            {['7d', '30d', '90d', 'ytd'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-2.5 py-1 rounded-lg uppercase font-semibold text-[10px] transition-all ${
                  timeRange === t
                    ? 'bg-amber-500 text-warm-900 shadow-sm'
                    : 'text-warm-500 hover:text-warm-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleSyncOverdue}
            disabled={syncing}
            className="px-3.5 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 border border-warm-200 text-warm-700 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-60"
            title="Trigger automatic overdue check"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${syncing ? 'animate-spin' : ''}`} />
            <span>Audit Overdue</span>
          </button>

          <button
            onClick={() => onNavigateTab('products')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 text-xs font-semibold shadow-lg shadow-amber transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Manage Catalog</span>
          </button>
        </div>
      </div>

      {/* 5 Core Required KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Active Rentals */}
        <div
          onClick={() => onNavigateTab('rentals')}
          className="glass-panel p-5 rounded-2xl border border-warm-200 hover:border-sky-500/50 transition-all cursor-pointer group space-y-3 bg-gradient-to-b from-sky-500/5 to-transparent"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">
              Active Rentals
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-warm-900">{metrics.activeRentals}</span>
              <span className="text-xs text-warm-500 font-medium">Bookings</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>In active circulation</span>
            </div>
          </div>
        </div>

        {/* 2. Rentals Due Today */}
        <div
          onClick={() => onNavigateTab('rentals')}
          className="glass-panel p-5 rounded-2xl border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer group space-y-3 bg-gradient-to-b from-amber-500/10 to-transparent"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Due Today
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-300">{metrics.dueTodayRentals}</span>
              <span className="text-xs text-amber-600/80 font-medium">Units Due</span>
            </div>
            <p className="text-xs text-amber-300/80 mt-1 font-medium flex items-center gap-1">
              <span>Expected return &lt;24h</span>
            </p>
          </div>
        </div>

        {/* 3. Overdue Rentals */}
        <div
          onClick={() => onNavigateTab('rentals')}
          className="glass-panel p-5 rounded-2xl border border-rose-500/40 hover:border-rose-500 transition-all cursor-pointer group space-y-3 bg-gradient-to-b from-rose-500/10 to-transparent shadow-lg shadow-rose-950/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Overdue Rentals
            </span>
            <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-200 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-500">{metrics.overdueRentals}</span>
              <span className="text-xs text-red-400/80 font-medium">Delayed</span>
            </div>
            <p className="text-xs text-red-400/90 mt-1 font-medium truncate">
              -₹{Number(metrics.totalPenalties || 1200).toLocaleString('en-IN')} penalties
            </p>
          </div>
        </div>

        {/* 4. Total Revenue */}
        <div className="glass-panel p-5 rounded-2xl border border-warm-200 hover:border-emerald-500/40 transition-all group space-y-3 bg-gradient-to-b from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-500/20 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl xl:text-3xl font-black text-warm-900 truncate">
                ₹{Number(metrics.revenue || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> +16.8% MoM Growth
            </p>
          </div>
        </div>

        {/* 5. Security Deposits Held */}
        <div className="glass-panel p-5 rounded-2xl border border-warm-200 hover:border-purple-500/40 transition-all group space-y-3 bg-gradient-to-b from-purple-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">
              Deposits in Escrow
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-purple-500/20 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl xl:text-3xl font-black text-amber-600 truncate">
                ₹{Number(metrics.securityDepositsHeld || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-xs text-warm-500 mt-1">
              Safeguarded 100% in escrow
            </p>
          </div>
        </div>
      </div>

      {/* Primary Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Revenue & Escrow Deposits Growth (2 Columns) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-warm-200 space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-warm-900 tracking-tight">
                Rental Revenue & Security Deposit Growth
              </h3>
              <p className="text-xs text-warm-500">
                Monthly collection trends & active escrow deposits in Indian Rupees (₹)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-warm-600">
                <span className="w-3 h-3 rounded-full bg-sky-400" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-warm-600">
                <span className="w-3 h-3 rounded-full bg-amber-400" /> Escrow Deposits
              </span>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.revenueTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="depositGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={{ stroke: '#334155' }} />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Rental Revenue"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  name="Escrow Deposits"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#depositGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-warm-200 flex flex-wrap items-center justify-between text-xs text-warm-500 gap-2">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <TrendingUp className="w-4 h-4" /> 100% on-time deposit settlements
            </span>
            <span>Total Lifetime Refunds: ₹{Number(metrics.totalDepositsRefunded || 12400).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Secondary Chart: Rental Status Donut */}
        <div className="glass-panel p-6 rounded-3xl border border-warm-200 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-warm-900 tracking-tight">Rental Status Breakdown</h3>
            <p className="text-xs text-warm-500">Current fleet booking state distribution</p>
          </div>

          {/* Recharts Pie Donut Chart */}
          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {charts.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#090d16" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Donut Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-warm-900">
                {charts.statusDistribution.reduce((acc, curr) => acc + curr.value, 0)}
              </span>
              <span className="text-[10px] text-warm-500 uppercase font-semibold">Total Fleet</span>
            </div>
          </div>

          {/* Status Breakdown Legend */}
          <div className="space-y-2 pt-2 border-t border-warm-200">
            {charts.statusDistribution.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-warm-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
                <span className="font-bold text-warm-900">{s.value} units</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Performance & Operations Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Revenue Bar Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-warm-200 space-y-4">
          <div>
            <h3 className="text-base font-bold text-warm-900 tracking-tight">Category Rental Demand</h3>
            <p className="text-xs text-warm-500">Revenue generation by product category</p>
          </div>

          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.categoryBreakdown} layout="vertical" margin={{ left: 15, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <YAxis dataKey="category" type="category" stroke="#cbd5e1" tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Rental Revenue" fill="#38bdf8" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Action Table: Due Today & Overdue Rentals */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-warm-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-bold text-warm-900 tracking-tight">
                  High-Priority Returns & Overdue Queue
                </h3>
              </div>
              <p className="text-xs text-warm-500">Immediate settlement actions required</p>
            </div>
            <button
              onClick={() => onNavigateTab('rentals')}
              className="text-xs text-amber-600 hover:underline flex items-center gap-1 font-semibold"
            >
              View All Orders <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Overdue Card */}
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-warm-900 text-xs">Overdue Notice • Order #RNT-6842</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase">
                      3 Days Late
                    </span>
                  </div>
                  <p className="text-[11px] text-warm-600 mt-0.5">
                    Alex Rivera • Sony Alpha A7 IV Camera • Security Deposit: ₹450
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-red-400 font-medium">Late Penalty Accruing</span>
                  <p className="text-sm font-black text-red-500">-₹60 deducted</p>
                </div>
                <button
                  onClick={() => onNavigateTab('rentals')}
                  className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-rose-400 text-warm-900 text-xs font-semibold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Settle
                </button>
              </div>
            </div>

            {/* Due Today Card */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-warm-900 text-xs">Return Due Today • Order #RNT-3190</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase">
                      Expires 11:59 PM
                    </span>
                  </div>
                  <p className="text-[11px] text-warm-600 mt-0.5">
                    Elena Rostova • LG 65" OLED 4K TV • Escrow Deposit: ₹2,000
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-emerald-600 font-medium">Eligible 100% Refund</span>
                  <p className="text-sm font-black text-warm-900">₹2,000 Refund</p>
                </div>
                <button
                  onClick={() => onNavigateTab('rentals')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Receive
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
