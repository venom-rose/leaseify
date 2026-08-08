import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';
import {
  RotateCcw,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const ReturnModal = ({ rental, isOpen, onClose, onReturnSuccess }) => {
  if (!rental) return null;

  const scheduledEnd = new Date(rental.endDate);
  const [returnDateStr, setReturnDateStr] = useState(() => {
    return scheduledEnd.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState({ lateFeePerDay: 20, gracePeriodDays: 1 });

  useEffect(() => {
    if (isOpen) {
      api.getRentalSettings().then((res) => {
        if (res.success && res.data) setPolicy(res.data);
      });
    }
  }, [isOpen]);

  const gracePeriodDays = policy.gracePeriodDays !== undefined ? policy.gracePeriodDays : 1;
  const lateFeePerDay = policy.lateFeePerDay || 20;

  // Deadline including grace period
  const deadlineWithGrace = new Date(scheduledEnd.getTime() + gracePeriodDays * 86400000);
  const actualReturn = new Date(returnDateStr);

  const isOverdue = actualReturn.getTime() > deadlineWithGrace.getTime();
  const rawOverdueDays = isOverdue
    ? Math.ceil((actualReturn.getTime() - deadlineWithGrace.getTime()) / 86400000)
    : 0;

  const penaltyAmount = Math.min(rawOverdueDays * lateFeePerDay, rental.depositTotal);
  const refundAmount = Math.max(0, rental.depositTotal - penaltyAmount);

  const handleSimulatePreset = (offsetDays) => {
    const target = new Date(scheduledEnd);
    target.setDate(target.getDate() + offsetDays);
    setReturnDateStr(target.toISOString().split('T')[0]);
  };

  const handleConfirmReturn = async () => {
    setLoading(true);
    await onReturnSuccess(rental._id, returnDateStr);
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Process Return & Security Deposit Refund"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Scheduled Due Date & Policy Notice */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400">Scheduled End Date:</span>
              <p className="text-sm font-bold text-white mt-0.5">
                {scheduledEnd.toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Deposit in Escrow:</span>
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

        {/* Interactive Return Date Selector & Simulation Presets */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-slate-200">
            Actual Return Date (Test & Simulation Presets)
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleSimulatePreset(0)}
              className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition-all ${
                !isOverdue
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ✅ On-Time Return
            </button>
            <button
              type="button"
              onClick={() => handleSimulatePreset(1)}
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
              onClick={() => handleSimulatePreset(3)}
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

        {/* Live Calculation Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isOverdue
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Return Status & Refund Breakdown
            </span>
            <Badge variant={isOverdue ? 'urgent' : 'resolved'}>
              {isOverdue ? `${rawOverdueDays} Days Past Grace` : 'Eligible for Full Refund'}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 pt-1">
            <div className="flex justify-between">
              <span>Original Security Deposit:</span>
              <span className="font-semibold text-white">
                ₹{Number(rental.depositTotal || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {isOverdue ? (
              <div className="flex justify-between text-rose-400 font-semibold">
                <span>
                  Late Penalty ({rawOverdueDays} days × ₹{Number(lateFeePerDay || 0).toLocaleString('en-IN')}/day):
                </span>
                <span>-₹{Number(penaltyAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            ) : (
              <div className="flex justify-between text-emerald-400">
                <span>Late Penalty:</span>
                <span>₹0 (No penalty deducted)</span>
              </div>
            )}

            <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
              <span>Security Deposit Refunded to Tenant:</span>
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
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{loading ? 'Processing Refund...' : 'Confirm Return & Settle Deposit'}</span>
        </button>
      </div>
    </Modal>
  );
};
