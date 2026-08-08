import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../common/Badge';
import { ReturnModal } from './ReturnModal';
import { InvoiceModal } from './InvoiceModal';
import { LateFeeSettingsModal } from './LateFeeSettingsModal';
import { useAuth } from '../../context/AuthContext';
import {
  PackageCheck,
  Calendar,
  DollarSign,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  ShoppingBag,
  FileText,
  AlertTriangle,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

export const RentalsTab = ({ onNavigateToProducts }) => {
  const { role } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedForReturn, setSelectedForReturn] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [policy, setPolicy] = useState({ lateFeePerDay: 20, gracePeriodDays: 1 });

  useEffect(() => {
    fetchRentals();
    fetchPolicy();
  }, [statusFilter]);

  const fetchPolicy = async () => {
    const res = await api.getRentalSettings();
    if (res.success && res.data) setPolicy(res.data);
  };

  const fetchRentals = async () => {
    setLoading(true);
    const res = await api.getRentals();
    if (res.success) {
      setRentals(res.data);
    }
    setLoading(false);
  };

  const handleReturnSuccess = async (id, returnDate) => {
    const res = await api.processReturn(id, returnDate);
    if (res.success) {
      fetchRentals();
    }
  };

  const handleViewInvoice = async (id) => {
    const res = await api.getInvoice(id);
    if (res.success) {
      setSelectedInvoice(res.data);
    }
  };

  const filteredRentals = rentals.filter((r) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') return r.status === 'overdue' || r.isLate;
    return r.status === statusFilter;
  });

  const overdueCount = rentals.filter((r) => r.status === 'overdue' || (r.isLate && r.status !== 'returned')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {role === 'admin' ? 'Rental Orders & Overdue Tracker' : 'My Rental Bookings'}
            </h2>
            {overdueCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs animate-pulse">
                {overdueCount} Overdue
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Track active item reservations, return deadlines, automated late penalties, and invoices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {role === 'admin' && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Late Fee Policy</span>
            </button>
          )}

          <button
            onClick={onNavigateToProducts}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            Browse Store
          </button>
        </div>
      </div>

      {/* Filter Tabs & Policy Summary Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'active', label: 'Active Rentals' },
            { id: 'overdue', label: `🚨 Overdue (${overdueCount})` },
            { id: 'returned', label: 'Returned & Settled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Grace Period: <strong>{policy.gracePeriodDays} Day(s)</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-amber-400">
            <DollarSign className="w-3.5 h-3.5 hidden" />
            Late Fee: <strong>₹{Number(policy.lateFeePerDay || 0).toLocaleString('en-IN')}/day</strong>
          </span>
        </div>
      </div>

      {filteredRentals.length === 0 ? (
        <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center space-y-3">
          <PackageCheck className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Rental Bookings Found</h3>
          <p className="text-xs text-slate-400">
            {statusFilter === 'overdue'
              ? 'Great news! No overdue rentals found at this time.'
              : 'Browse our catalog to rent furniture, electronics, or appliances.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRentals.map((rental) => {
            const isReturned = rental.status === 'returned' || rental.status === 'completed';
            const isOverdue = rental.status === 'overdue';

            return (
              <div
                key={rental._id}
                className={`glass-panel p-6 rounded-2xl border space-y-4 transition-all ${
                  isOverdue
                    ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                        isOverdue
                          ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400 animate-pulse'
                          : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                      }`}
                    >
                      {isOverdue ? <AlertTriangle className="w-5 h-5" /> : <PackageCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          Order #{rental.transactionId || 'RNT-DEMO'}
                        </span>
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                            🚨 Overdue by {rental.lateDays || 1} day(s)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Renter: {rental.user?.name || 'Alex Rivera'} • Invoice:{' '}
                        <span className="text-sky-400 font-mono">
                          {rental.invoiceNumber || 'INV-001'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={rental.status}>{rental.status}</Badge>

                    {/* View Invoice Button */}
                    <button
                      onClick={() => handleViewInvoice(rental._id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-sky-400 transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Invoice
                    </button>

                    {/* Process Return Button */}
                    {!isReturned && (
                      <button
                        onClick={() => setSelectedForReturn(rental)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-xs font-semibold text-white shadow-md shadow-sky-500/20 transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Process Return & Refund
                      </button>
                    )}
                  </div>
                </div>

                {/* Overdue Warning Alert Banner if Active & Overdue */}
                {isOverdue && !isReturned && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        <strong>Overdue Notice:</strong> Scheduled deadline was{' '}
                        {new Date(rental.endDate).toLocaleDateString()}. Accruing ₹
                        {Number(policy.lateFeePerDay || 0).toLocaleString('en-IN')}/day penalty.
                      </span>
                    </div>
                    <span className="font-bold text-rose-200">
                      Accrued Penalty: -₹{Number(rental.accruedPenalty || rental.lateDays * policy.lateFeePerDay || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Items List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(rental.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover bg-slate-900 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate max-w-[200px]">
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            ₹{Number(item.pricePerDay || 0).toLocaleString('en-IN')}/day • {item.days} days
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-white">
                          ₹{Number(item.subtotal || 0).toLocaleString('en-IN')}
                        </span>
                        <p className="text-[10px] text-amber-400">
                          +₹{Number(item.deposit || 0).toLocaleString('en-IN')} dep
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Accounting & Deposit Status */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
                      Term: {new Date(rental.startDate).toLocaleDateString()} —{' '}
                      {new Date(rental.endDate).toLocaleDateString()}
                    </span>

                    {/* Deposit & Refund Status Pill */}
                    {isReturned ? (
                      rental.penaltyAmount > 0 ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-[11px]">
                          <AlertTriangle className="w-3 h-3" />
                          Late Penalty Deducted: -₹{Number(rental.penaltyAmount || 0).toLocaleString('en-IN')} • Refunded: ₹
                          {Number(rental.refundedDepositAmount || 0).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Full Deposit Refunded: ₹{Number(rental.refundedDepositAmount || rental.depositTotal || 0).toLocaleString('en-IN')}
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Deposit in Escrow: ₹{Number(rental.depositTotal || 0).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400">Total Charged: </span>
                    <span className="text-sm font-bold text-white">
                      ₹{Number(rental.grandTotal || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return Simulator Modal */}
      {selectedForReturn && (
        <ReturnModal
          rental={selectedForReturn}
          isOpen={!!selectedForReturn}
          onClose={() => setSelectedForReturn(null)}
          onReturnSuccess={handleReturnSuccess}
        />
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Admin Late Fee Policy Settings Modal */}
      <LateFeeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={() => {
          fetchRentals();
          fetchPolicy();
        }}
      />
    </div>
  );
};
