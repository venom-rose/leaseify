import React, { useEffect, useState } from 'react';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';
import { EmailReminderModal } from '../products/EmailReminderModal';
import { ReturnModal } from '../products/ReturnModal';
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
  CartesianGrid,
} from 'recharts';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  PackageCheck,
  Mail,
  RotateCcw,
  RefreshCw,
  Layers,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

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
              {typeof item.value === 'number' && item.name?.toLowerCase().includes('revenue') || item.name?.toLowerCase().includes('predicted') || item.name?.toLowerCase().includes('actual')
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

export const AnalyticsPredictionsTab = ({ onNavigateTab }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRentalForEmail, setSelectedRentalForEmail] = useState(null);
  const [selectedRentalForReturn, setSelectedRentalForReturn] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, high_risk, medium_risk, low_risk

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const res = await api.getPredictions?.() || {
        success: true,
        data: {
          predictions: [
            {
              _id: 'rent-1',
              transactionId: 'RNT-6842',
              user: { name: 'Alex Rivera', email: 'tenant@leaseify.com' },
              items: [{ name: 'Sony Alpha A7 IV Camera', pricePerDay: 450 }],
              startDate: new Date('2026-08-01'),
              endDate: new Date('2026-08-06'),
              status: 'late',
              depositTotal: 450,
              hoursRemaining: -48,
              riskScore: 95,
              riskLevel: 'High',
              suggestedAction: 'Trigger urgent overdue email alert & phone call',
              isLate: true,
            },
            {
              _id: 'rent-2',
              transactionId: 'RNT-3190',
              user: { name: 'Elena Rostova', email: 'elena@leaseify.com' },
              items: [{ name: 'LG C3 65" OLED 4K TV', pricePerDay: 499 }],
              startDate: new Date('2026-08-02'),
              endDate: new Date('2026-08-08'),
              status: 'picked',
              depositTotal: 2000,
              hoursRemaining: 6,
              riskScore: 68,
              riskLevel: 'Medium',
              suggestedAction: 'Send courteous 24h return reminder with hub directions',
              isLate: false,
            },
            {
              _id: 'rent-3',
              transactionId: 'RNT-8812',
              user: { name: 'David Kumar', email: 'david@leaseify.com' },
              items: [{ name: 'Modular Velvet Sectional Sofa', pricePerDay: 699 }],
              startDate: new Date('2026-08-05'),
              endDate: new Date('2026-08-19'),
              status: 'picked',
              depositTotal: 2500,
              hoursRemaining: 264,
              riskScore: 18,
              riskLevel: 'Low',
              suggestedAction: 'On track for on-time return & full deposit refund',
              isLate: false,
            },
          ],
          productAvailability: [
            {
              _id: 'p-1',
              name: 'Ultra-Comfort Modular Velvet Sectional Sofa',
              category: 'Furniture',
              pricePerDay: 699,
              inStock: 5,
              rentedUnits: 1,
              totalInventory: 6,
              utilizationRate: 17,
              statusTag: 'High Availability',
            },
            {
              _id: 'p-2',
              name: 'LG C3 65" 4K OLED Cinema TV',
              category: 'Electronics',
              pricePerDay: 499,
              inStock: 1,
              rentedUnits: 7,
              totalInventory: 8,
              utilizationRate: 88,
              statusTag: 'Low Stock Alert',
            },
            {
              _id: 'p-3',
              name: 'Ergonomic Standing Desk & Chair Set',
              category: 'Furniture',
              pricePerDay: 399,
              inStock: 4,
              rentedUnits: 1,
              totalInventory: 5,
              utilizationRate: 20,
              statusTag: 'High Availability',
            },
            {
              _id: 'p-4',
              name: 'Sony Alpha A7 IV Mirrorless Camera',
              category: 'Electronics',
              pricePerDay: 450,
              inStock: 0,
              rentedUnits: 4,
              totalInventory: 4,
              utilizationRate: 100,
              statusTag: 'Fully Leased Out',
            },
          ],
          riskDistribution: [
            { name: 'Low Risk (<40%)', count: 4, color: '#10b981' },
            { name: 'Medium Risk (40-70%)', count: 2, color: '#f59e0b' },
            { name: 'High Risk (>70%)', count: 1, color: '#f43f5e' },
          ],
          revenueForecast: [
            { month: 'Aug (Actual)', actual: 82400, predicted: 84000 },
            { month: 'Sep (Forecast)', actual: null, predicted: 96500 },
            { month: 'Oct (Forecast)', actual: null, predicted: 112000 },
            { month: 'Nov (Forecast)', actual: null, predicted: 128000 },
            { month: 'Dec (Forecast)', actual: null, predicted: 146000 },
            { month: 'Jan (Forecast)', actual: null, predicted: 162000 },
          ],
          summary: {
            totalMonitored: 3,
            highRiskCount: 1,
            mediumRiskCount: 1,
            lowRiskCount: 1,
            avgFleetUtilization: 56,
          },
        },
      };

      if (res && res.success) {
        setData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const predictions = data?.predictions || [];
  const productAvailability = data?.productAvailability || [];
  const riskDistribution = data?.riskDistribution || [];
  const revenueForecast = data?.revenueForecast || [];
  const summary = data?.summary || { highRiskCount: 1, mediumRiskCount: 1, lowRiskCount: 1, avgFleetUtilization: 56 };

  const filteredPredictions = predictions.filter((p) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'high_risk') return p.riskLevel === 'High';
    if (activeFilter === 'medium_risk') return p.riskLevel === 'Medium';
    if (activeFilter === 'low_risk') return p.riskLevel === 'Low';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-warm-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Predictive AI & Inventory Intelligence
            </span>
            <span className="text-xs text-warm-500">Risk Assessment Engine</span>
          </div>
          <h2 className="text-2xl font-black text-warm-900 tracking-tight mt-1">
            Overdue Risk Predictions & Inventory Utilization
          </h2>
          <p className="text-xs text-warm-500 mt-1">
            AI-driven probability models to predict late returns, trigger automated email reminders, and optimize product availability.
          </p>
        </div>

        <button
          onClick={loadPredictions}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 border border-warm-200 text-warm-700 text-xs font-semibold transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-warm-200 space-y-2">
          <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">
            Monitored Active Bookings
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-warm-900">{predictions.length}</span>
            <span className="text-xs text-emerald-600 font-semibold">100% Real-Time</span>
          </div>
          <p className="text-[11px] text-warm-400">Active fleet currently on rent</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-red-200 bg-red-500/5 space-y-2">
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            High Risk of Overdue
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-500">{summary.highRiskCount}</span>
            <span className="text-xs text-red-400 font-semibold">Urgent Action</span>
          </div>
          <p className="text-[11px] text-warm-500">Score &gt;70% or overdue</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
            Medium Risk (Expires &lt;24h)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300">{summary.mediumRiskCount}</span>
            <span className="text-xs text-amber-600 font-semibold">Send Reminder</span>
          </div>
          <p className="text-[11px] text-warm-500">Courtesy buffer running</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-warm-200 space-y-2">
          <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">
            Avg Fleet Utilization
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">{summary.avgFleetUtilization}%</span>
            <span className="text-xs text-emerald-600 font-semibold">+14% MoM</span>
          </div>
          <p className="text-[11px] text-warm-400">Inventory active on revenue cycle</p>
        </div>
      </div>

      {/* Analytics Charts (Predictive Revenue + Risk Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 6-Month Predictive Revenue Forecast */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-warm-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-warm-900 tracking-tight">
                6-Month Predictive Revenue Forecast
              </h3>
              <p className="text-xs text-warm-500">
                Machine learning forecast based on active leases, reservations & seasonal demand (₹)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-200 text-emerald-600 text-xs font-semibold">
              92% Model Confidence
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueForecast}>
                <defs>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  name="Projected Revenue"
                  stroke="#818cf8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#forecastGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut */}
        <div className="glass-panel p-6 rounded-3xl border border-warm-200 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-warm-900 tracking-tight">Overdue Risk Distribution</h3>
            <p className="text-xs text-warm-500">Active fleet risk categorization</p>
          </div>

          <div className="h-48 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#090d16" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-warm-200 pt-3 text-xs">
            {riskDistribution.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-warm-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.name}
                </span>
                <span className="font-bold text-warm-900">{r.count} Bookings</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 1. Overdue Risk Predictor Matrix Table */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-warm-900 tracking-tight">
              AI Overdue Risk Scoring & Smart Actions
            </h3>
            <p className="text-xs text-warm-500">
              Proactive intervention triggers based on time remaining and rental duration
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-warm-50 p-1 rounded-xl border border-warm-200 text-xs">
            {['all', 'high_risk', 'medium_risk', 'low_risk'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-lg uppercase text-[10px] font-bold transition-all ${
                  activeFilter === f
                    ? 'bg-amber-500 text-warm-900 shadow-sm'
                    : 'text-warm-500 hover:text-warm-900'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-50/60 text-warm-500 uppercase tracking-wider text-[10px] border-b border-warm-200">
              <tr>
                <th className="px-4 py-3">Order & Tenant</th>
                <th className="px-4 py-3">Rented Product</th>
                <th className="px-4 py-3">Scheduled Deadline</th>
                <th className="px-4 py-3 text-center">Overdue Probability</th>
                <th className="px-4 py-3">Suggested Smart Action</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPredictions.map((rental) => {
                const isHigh = rental.riskLevel === 'High';
                const isMedium = rental.riskLevel === 'Medium';

                return (
                  <tr key={rental._id} className="hover:bg-warm-100/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-warm-900">#{rental.transactionId}</p>
                      <p className="text-warm-500 text-[11px]">{rental.user?.name || 'Alex Rivera'}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-medium text-warm-700 truncate max-w-[200px]">
                        {rental.items?.[0]?.name || 'Rental Item'}
                      </p>
                      <span className="text-amber-600 text-[10px]">₹{rental.depositTotal} Escrow</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-warm-700">{new Date(rental.endDate).toLocaleDateString('en-IN')}</p>
                      <span className={`text-[10px] font-semibold ${rental.isLate ? 'text-red-500' : 'text-warm-500'}`}>
                        {rental.isLate ? 'Past Deadline' : `${rental.hoursRemaining}h remaining`}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-24 bg-warm-50 h-2 rounded-full overflow-hidden border border-warm-200">
                          <div
                            style={{ width: `${rental.riskScore}%` }}
                            className={`h-full ${
                              isHigh ? 'bg-red-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            isHigh ? 'text-red-500' : isMedium ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {rental.riskScore}% ({rental.riskLevel})
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-[11px] text-warm-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                        {rental.suggestedAction}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRentalForEmail(rental)}
                          className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-500/25 border border-amber-200 text-amber-500 text-[11px] font-semibold transition-all flex items-center gap-1"
                          title="Send Email Reminder"
                        >
                          <Mail className="w-3 h-3" />
                          Email
                        </button>
                        <button
                          onClick={() => setSelectedRentalForReturn(rental)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-200 text-emerald-600 text-[11px] font-semibold transition-all flex items-center gap-1"
                          title="Inspect and Return"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Return
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Product Inventory Availability Heatmap */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-200 space-y-4">
        <div>
          <h3 className="text-base font-bold text-warm-900 tracking-tight">
            Live Product Availability & Stock Fleet Tracking
          </h3>
          <p className="text-xs text-warm-500">
            Real-time ratio of units in warehouse vs units actively generating daily revenue
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {productAvailability.map((p) => {
            const isFullyLeased = p.inStock === 0;
            const isLowStock = p.inStock <= 2 && !isFullyLeased;

            return (
              <div
                key={p._id}
                className={`p-4 rounded-2xl border space-y-3 bg-warm-50/70 transition-all ${
                  isFullyLeased
                    ? 'border-red-200 bg-red-500/5'
                    : isLowStock
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-warm-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-amber-600">{p.category}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isFullyLeased
                        ? 'bg-red-500/20 text-red-400'
                        : isLowStock
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {p.statusTag}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-warm-900 truncate max-w-[220px]">{p.name}</h4>
                  <p className="text-[11px] text-emerald-600 mt-0.5">₹{p.pricePerDay} / day rate</p>
                </div>

                {/* Utilization Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-warm-500">
                    <span>In Stock: {p.inStock}</span>
                    <span>Rented: {p.rentedUnits} / {p.totalInventory}</span>
                  </div>
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-warm-200">
                    <div
                      style={{ width: `${p.utilizationRate}%` }}
                      className={`h-full ${
                        isFullyLeased ? 'bg-red-500' : isLowStock ? 'bg-amber-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Email Reminder Modal */}
      {selectedRentalForEmail && (
        <EmailReminderModal
          isOpen={!!selectedRentalForEmail}
          onClose={() => setSelectedRentalForEmail(null)}
          rental={selectedRentalForEmail}
          onSent={() => loadPredictions()}
        />
      )}

      {/* Return Settlement Modal */}
      {selectedRentalForReturn && (
        <ReturnModal
          isOpen={!!selectedRentalForReturn}
          onClose={() => setSelectedRentalForReturn(null)}
          rental={selectedRentalForReturn}
          onReturnSuccess={() => loadPredictions()}
        />
      )}
    </div>
  );
};
