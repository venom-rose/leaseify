import React, { useState, useEffect } from 'react';
import { Badge } from '../common/Badge';
import { ReturnModal } from './ReturnModal';
import { PickupModal } from './PickupModal';
import { QRScanModal } from './QRScanModal';
import { InvoiceModal } from './InvoiceModal';
import { EmailReminderModal } from './EmailReminderModal';
import { LateFeeSettingsModal } from './LateFeeSettingsModal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  PackageCheck,
  Calendar,
  DollarSign,
  ShieldCheck,
  FileText,
  RotateCcw,
  Clock,
  AlertTriangle,
  Settings,
  Filter,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  QrCode,
  MapPin,
  Camera,
  Check,
  Mail,
} from 'lucide-react';

export const RentalsTab = () => {
  const { role } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // all, booked, picked, late, returned
  const [selectedForReturn, setSelectedForReturn] = useState(null);
  const [selectedForPickup, setSelectedForPickup] = useState(null);
  const [selectedForQR, setSelectedForQR] = useState(null);
  const [selectedForEmail, setSelectedForEmail] = useState(null);
  const [qrDefaultAction, setQrDefaultAction] = useState('pickup');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [policy, setPolicy] = useState({ lateFeePerDay: 20, gracePeriodDays: 1 });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadRentals();
    loadPolicy();
  }, [statusFilter]);

  const loadRentals = async () => {
    setLoading(true);
    try {
      const res = await api.getRentals(statusFilter);
      if (res && res.success) {
        setRentals(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load rentals:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPolicy = async () => {
    try {
      const res = await api.getRentalSettings();
      if (res && res.success && res.data) {
        setPolicy(res.data);
      }
    } catch (err) {
      console.error('Failed to load rental policy:', err);
    }
  };

  const handleSyncOverdue = async () => {
    setSyncing(true);
    try {
      await api.syncOverdueRentals();
      await loadRentals();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setTimeout(() => setSyncing(false), 400);
    }
  };

  const handleViewInvoice = async (rentalId) => {
    try {
      const res = await api.getInvoice(rentalId);
      if (res && res.success) {
        setSelectedInvoice(res.data);
      }
    } catch (err) {
      console.error('Failed to load invoice:', err);
    }
  };

  const openQRModal = (rental, action = 'pickup') => {
    setSelectedForQR(rental);
    setQrDefaultAction(action);
  };

  // Filter count statistics
  const bookedCount = rentals.filter((r) => r.status === 'booked' || r.status === 'pending').length;
  const pickedCount = rentals.filter((r) => r.status === 'picked' || r.status === 'active').length;
  const lateCount = rentals.filter((r) => r.status === 'late' || r.status === 'overdue').length;
  const returnedCount = rentals.filter((r) => r.status === 'returned' || r.status === 'completed').length;

  const filteredRentals = rentals.filter((r) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'booked') return r.status === 'booked' || r.status === 'pending';
    if (statusFilter === 'picked') return r.status === 'picked' || r.status === 'active';
    if (statusFilter === 'late') return r.status === 'late' || r.status === 'overdue';
    if (statusFilter === 'returned') return r.status === 'returned' || r.status === 'completed';
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 font-semibold text-[11px] uppercase tracking-wider">
              Pickup & Return Workflow
            </span>
            <span className="text-xs text-slate-400">Escrow & Logistics Hub</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">
            Rental Status & Handover Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track order lifecycle from <strong>Booked ➔ Picked ➔ Returned</strong> with condition checks and deposit refunds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* QR Scanner Trigger */}
          <button
            onClick={() => {
              const target = rentals[0] || { _id: 'demo-1', transactionId: 'RNT-DEMO' };
              openQRModal(target, 'pickup');
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Scan customer QR code pass at counter"
          >
            <Camera className="w-4 h-4 text-sky-400" />
            <span>QR Scanner</span>
          </button>

          {/* Audit Overdue Button */}
          <button
            onClick={handleSyncOverdue}
            disabled={syncing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Trigger automatic overdue check"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${syncing ? 'animate-spin' : ''}`} />
            <span>Audit Overdue</span>
          </button>

          {/* Admin Policy Settings */}
          {role === 'admin' && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Late Fee Policy</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-State Filter Navigation Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: `All Orders (${rentals.length})` },
            { id: 'booked', label: `📅 Booked (${bookedCount})` },
            { id: 'picked', label: `📦 Picked (${pickedCount})` },
            { id: 'late', label: `🚨 Late (${lateCount})` },
            { id: 'returned', label: `✅ Returned (${returnedCount})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Policy Summary Pill */}
        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 shrink-0">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Grace: <strong>{policy.gracePeriodDays} Day(s)</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-amber-400">
            Late Fee: <strong>₹{Number(policy.lateFeePerDay || 0).toLocaleString('en-IN')}/day</strong>
          </span>
        </div>
      </div>

      {/* Rentals List */}
      {filteredRentals.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
          <PackageCheck className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Rental Bookings Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {statusFilter === 'late'
              ? 'Great news! No overdue rentals found in this category.'
              : 'Browse our catalog to rent furniture, electronics, or appliances.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRentals.map((rental) => {
            const isBooked = rental.status === 'booked' || rental.status === 'pending';
            const isPicked = rental.status === 'picked' || rental.status === 'active';
            const isLate = rental.status === 'late' || rental.status === 'overdue';
            const isReturned = rental.status === 'returned' || rental.status === 'completed';

            return (
              <div
                key={rental._id}
                className={`glass-panel p-6 rounded-3xl border space-y-4 transition-all ${
                  isLate
                    ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500'
                    : isBooked
                    ? 'border-sky-500/30 bg-sky-500/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                        isLate
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                          : isPicked
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isBooked
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isLate ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isPicked ? (
                        <PackageCheck className="w-5 h-5" />
                      ) : (
                        <Calendar className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          Order #{rental.transactionId || 'RNT-DEMO'}
                        </span>
                        {isLate && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase">
                            🚨 Late by {rental.lateDays || 1} day(s)
                          </span>
                        )}
                        {isBooked && (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold uppercase">
                            📅 Ready for Pickup
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Renter: <strong className="text-white">{rental.user?.name || 'Alex Rivera'}</strong> • Invoice:{' '}
                        <span className="text-sky-400 font-mono">{rental.invoiceNumber || 'INV-001'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions & QR trigger */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={rental.status}>{rental.status}</Badge>

                    {/* QR Code Pass Trigger */}
                    <button
                      onClick={() => openQRModal(rental, isBooked ? 'pickup' : 'return')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 transition-colors flex items-center gap-1 text-xs font-semibold"
                      title="Show QR code pass"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QR Pass</span>
                    </button>

                    {/* Email Reminder Trigger */}
                    {!isReturned && (
                      <button
                        onClick={() => setSelectedForEmail(rental)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1"
                        title="Send email reminder to tenant"
                      >
                        <Mail className="w-3.5 h-3.5 text-sky-400" />
                        <span className="hidden sm:inline">Reminder</span>
                      </button>
                    )}

                    {/* View Invoice */}
                    <button
                      onClick={() => handleViewInvoice(rental._id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      Invoice
                    </button>

                    {/* Contextual Workflow Action Button */}
                    {isBooked && (
                      <button
                        onClick={() => setSelectedForPickup(rental)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all flex items-center gap-1.5"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Schedule / Mark Picked
                      </button>
                    )}

                    {(isPicked || isLate) && (
                      <button
                        onClick={() => setSelectedForReturn(rental)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Inspect & Process Return
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Step Lifecycle Status Tracker Line */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-3 gap-2 text-xs">
                  <div className={`flex items-center gap-2 ${isBooked || isPicked || isLate || isReturned ? 'text-sky-400 font-bold' : 'text-slate-500'}`}>
                    <div className="h-6 w-6 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span>1. Booked</span>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {new Date(rental.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 ${isPicked || isLate || isReturned ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                    <div className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 ${isPicked || isLate || isReturned ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800'}`}>
                      <PackageCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span>2. Picked Up</span>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {rental.pickedAt ? new Date(rental.pickedAt).toLocaleDateString() : 'Awaiting Handover'}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 ${isReturned ? 'text-emerald-400 font-bold' : isLate ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                    <div className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 ${isReturned ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : isLate ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-slate-900 border-slate-800'}`}>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span>3. {isReturned ? 'Returned & Settled' : isLate ? 'Late Return' : 'Return Due'}</span>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {new Date(rental.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Overdue Warning Alert Banner */}
                {isLate && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        <strong>Late Notice:</strong> Return deadline expired on{' '}
                        {new Date(rental.endDate).toLocaleDateString()}. Accruing ₹
                        {Number(policy.lateFeePerDay || 0).toLocaleString('en-IN')}/day.
                      </span>
                    </div>
                    <span className="font-bold text-rose-200">
                      Accrued Penalty: -₹{Number(rental.accruedPenalty || rental.lateDays * policy.lateFeePerDay || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Product Items List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(rental.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-12 w-12 rounded-xl object-cover bg-slate-900 shrink-0 border border-slate-800"
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

                {/* Footer Logistics & Escrow Settlement Info */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Hub: {rental.pickupLocation || 'Main Hub Counter #1'}
                    </span>

                    {/* Escrow Deposit & Condition Badge */}
                    {isReturned ? (
                      rental.penaltyAmount > 0 ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-[11px]">
                          <AlertTriangle className="w-3 h-3" />
                          Deduction: -₹{Number(rental.penaltyAmount || 0).toLocaleString('en-IN')} • Refunded: ₹
                          {Number(rental.refundedDepositAmount || 0).toLocaleString('en-IN')} ({rental.itemCondition?.replace('_', ' ')})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          100% Full Deposit Refunded: ₹{Number(rental.refundedDepositAmount || rental.depositTotal || 0).toLocaleString('en-IN')} ({rental.itemCondition?.replace('_', ' ')})
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

      {/* Pickup Handover Modal */}
      {selectedForPickup && (
        <PickupModal
          isOpen={!!selectedForPickup}
          onClose={() => setSelectedForPickup(null)}
          rental={selectedForPickup}
          onPickupSuccess={() => {
            loadRentals();
          }}
          onOpenQR={(r) => openQRModal(r, 'pickup')}
        />
      )}

      {/* Return & Condition Inspection Modal */}
      {selectedForReturn && (
        <ReturnModal
          isOpen={!!selectedForReturn}
          onClose={() => setSelectedForReturn(null)}
          rental={selectedForReturn}
          onReturnSuccess={() => {
            loadRentals();
          }}
          onOpenQR={(r) => openQRModal(r, 'return')}
        />
      )}

      {/* QR Code Scanner Simulation Modal */}
      {selectedForQR && (
        <QRScanModal
          isOpen={!!selectedForQR}
          onClose={() => setSelectedForQR(null)}
          rental={selectedForQR}
          defaultAction={qrDefaultAction}
          onSuccess={() => {
            loadRentals();
          }}
        />
      )}

      {/* Email Reminder Modal */}
      {selectedForEmail && (
        <EmailReminderModal
          isOpen={!!selectedForEmail}
          onClose={() => setSelectedForEmail(null)}
          rental={selectedForEmail}
          onSent={() => {
            loadRentals();
          }}
        />
      )}

      {/* Invoice Breakdown Modal */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
        />
      )}

      {/* Late Fee Settings Policy Modal */}
      {isSettingsOpen && (
        <LateFeeSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSaved={() => {
            loadPolicy();
            loadRentals();
          }}
        />
      )}
    </div>
  );
};
