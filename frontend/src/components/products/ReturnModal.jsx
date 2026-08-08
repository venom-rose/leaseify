import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';
import {
  RotateCcw,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  QrCode,
} from 'lucide-react';

export const ReturnModal = ({ isOpen, onClose, rental, onReturnSuccess, onOpenQR }) => {
  if (!rental) return null;

  const [returnDateStr, setReturnDateStr] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [itemCondition, setItemCondition] = useState('excellent');
  const [conditionNotes, setConditionNotes] = useState('');
  const [customDamagePenalty, setCustomDamagePenalty] = useState(0);
  const [policy, setPolicy] = useState({ lateFeePerDay: 20, gracePeriodDays: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const res = await api.getRentalSettings();
      if (res.success && res.data) {
        setPolicy(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scheduledEnd = new Date(rental.endDate);
  const actualReturn = new Date(returnDateStr + 'T23:59:59');
  const gracePeriodDays = policy.gracePeriodDays ?? 1;
  const lateFeePerDay = policy.lateFeePerDay ?? 20;

  // Grace Period buffer deadline
  const gracePeriodMs = gracePeriodDays * 86400000;
  const deadlineWithGrace = new Date(scheduledEnd.getTime() + gracePeriodMs);

  // Late return calculation
  const isOverdue = actualReturn > deadlineWithGrace;
  const rawOverdueDays = isOverdue
    ? Math.ceil((actualReturn.getTime() - deadlineWithGrace.getTime()) / 86400000)
    : 0;
  const latePenalty = isOverdue ? rawOverdueDays * lateFeePerDay : 0;

  // Condition damage penalty calculation
  let damageFee = Number(customDamagePenalty);
  if (damageFee === 0) {
    if (itemCondition === 'minor_damage') {
      damageFee = Math.round((rental.depositTotal || 0) * 0.25);
    } else if (itemCondition === 'severe_damage') {
      damageFee = Math.round((rental.depositTotal || 0) * 0.75);
    }
  }

  // Combined total deductions & net refund
  const totalDeduction = Math.min(latePenalty + damageFee, rental.depositTotal || 0);
  const refundAmount = Math.max(0, (rental.depositTotal || 0) - totalDeduction);

  const handleSimulatePreset = (daysOffset, condition = 'excellent') => {
    const d = new Date(scheduledEnd);
    d.setDate(d.getDate() + daysOffset);
    setReturnDateStr(d.toISOString().split('T')[0]);
    setItemCondition(condition);
    setCustomDamagePenalty(0);
  };

  const handleConfirmReturn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.processReturn(rental._id, {
        returnDate: returnDateStr,
        itemCondition,
        conditionNotes,
        damagePenalty: damageFee,
      });

      if (res && res.success) {
        onReturnSuccess?.(res.data);
        onClose();
      } else {
        setError(res?.message || 'Failed to process return');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while processing return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Return Inspection & Security Deposit Refund"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Header Summary & Escrow Pill */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400">Order ID:</span>
              <p className="text-sm font-bold text-white font-mono mt-0.5">
                #{rental.transactionId || 'RNT-DEMO'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Security Deposit in Escrow:</span>
              <p className="text-sm font-bold text-amber-400 mt-0.5">
                ₹{Number(rental.depositTotal || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Grace Period: {gracePeriodDays} Day(s) Buffer
            </span>
            <span className="text-slate-300">
              Late Fee Rate: <strong>₹{Number(lateFeePerDay || 0).toLocaleString('en-IN')}/day</strong>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* 1. Actual Return Date & Presets */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-200">
            1. Return Date (Test & Simulation Presets)
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleSimulatePreset(0, 'excellent')}
              className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition-all ${
                !isOverdue
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ✅ On-Time
            </button>
            <button
              type="button"
              onClick={() => handleSimulatePreset(1, 'excellent')}
              className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition-all ${
                rawOverdueDays === 0 && actualReturn > scheduledEnd
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ⏳ In Grace Period
            </button>
            <button
              type="button"
              onClick={() => handleSimulatePreset(3, 'excellent')}
              className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition-all ${
                rawOverdueDays > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              🚨 3 Days Overdue
            </button>
          </div>

          <input
            type="date"
            value={returnDateStr}
            onChange={(e) => setReturnDateStr(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* 2. Product Physical Condition Inspection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-200">
            2. Physical Inspection & Condition Assessment
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { id: 'excellent', label: '✨ Pristine / Like New', fee: 0 },
              { id: 'good', label: '👍 Good / Light Wear', fee: 0 },
              { id: 'minor_damage', label: '⚠️ Minor Scratches', fee: Math.round((rental.depositTotal || 0) * 0.25) },
              { id: 'severe_damage', label: '❌ Heavy Damage', fee: Math.round((rental.depositTotal || 0) * 0.75) },
            ].map((cond) => (
              <button
                key={cond.id}
                type="button"
                onClick={() => {
                  setItemCondition(cond.id);
                  setCustomDamagePenalty(cond.fee);
                }}
                className={`p-2 rounded-xl border text-left text-xs transition-all ${
                  itemCondition === cond.id
                    ? cond.id.includes('damage')
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="block truncate text-[11px]">{cond.label}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {cond.fee > 0 ? `Deducts ₹${cond.fee}` : '100% Refund'}
                </span>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Inspection remarks (e.g. Lens and sensors checked, full accessories verified)"
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* 3. Live Settlement Breakdown & Refund Calculation */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            totalDeduction > 0
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Escrow Settlement Breakdown
            </span>
            <Badge variant={totalDeduction > 0 ? 'urgent' : 'resolved'}>
              {totalDeduction > 0 ? `₹${totalDeduction} Deducted` : '100% Full Refund'}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 pt-1">
            <div className="flex justify-between">
              <span>Security Deposit in Escrow:</span>
              <span className="font-semibold text-white">
                ₹{Number(rental.depositTotal || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {latePenalty > 0 && (
              <div className="flex justify-between text-rose-400 font-semibold">
                <span>Late Return Penalty ({rawOverdueDays} days past grace):</span>
                <span>-₹{Number(latePenalty || 0).toLocaleString('en-IN')}</span>
              </div>
            )}

            {damageFee > 0 && (
              <div className="flex justify-between text-rose-400 font-semibold">
                <span>Condition Damage Deduction:</span>
                <span>-₹{Number(damageFee || 0).toLocaleString('en-IN')}</span>
              </div>
            )}

            {totalDeduction === 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Deductions / Fees:</span>
                <span>₹0 (On-time & Excellent Condition)</span>
              </div>
            )}

            <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
              <span>Net Deposit Refunded to Renter:</span>
              <span className="text-emerald-400">
                ₹{Number(refundAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleConfirmReturn}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-600 to-sky-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          <span>
            {loading ? 'Releasing Security Deposit...' : `Confirm Return & Refund ₹${refundAmount.toLocaleString('en-IN')}`}
          </span>
        </button>
      </div>
    </Modal>
  );
};
