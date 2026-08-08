import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';

export const EmailReminderModal = ({ isOpen, onClose, rental, onSent }) => {
  if (!rental) return null;

  const isLate = rental.status === 'late' || rental.status === 'overdue';
  const [reminderType, setReminderType] = useState(isLate ? 'overdue_warning' : 'due_reminder');
  const [customNote, setCustomNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState(null);

  const recipientEmail = rental.user?.email || 'tenant@leaseify.com';
  const recipientName = rental.user?.name || 'Alex Rivera';
  const returnDateFormatted = new Date(rental.endDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSendEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sendReminderEmail?.(rental._id, {
        reminderType,
        customMessage: customNote,
      }) || { success: true };

      if (res.success) {
        setSentSuccess(true);
        onSent?.(res.data);
        setTimeout(() => {
          setSentSuccess(false);
          onClose();
        }, 1800);
      } else {
        setError(res.message || 'Failed to dispatch email');
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch reminder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispatch Email Reminder"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Template Selector */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setReminderType('due_reminder')}
            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              reminderType === 'due_reminder'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>24h Due Reminder</span>
          </button>

          <button
            type="button"
            onClick={() => setReminderType('overdue_warning')}
            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              reminderType === 'overdue_warning'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue Warning</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Responsive Email Client Simulation Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl text-xs">
          {/* Email Header bar */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">To:</span>
              <span className="font-mono text-white font-medium truncate max-w-[280px]">
                {recipientName} &lt;{recipientEmail}&gt;
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Subject:</span>
              <span className="font-bold text-sky-400 truncate max-w-[280px]">
                {reminderType === 'due_reminder'
                  ? `🔔 Return Due Reminder: Order #${rental.transactionId}`
                  : `🚨 URGENT: Overdue Notice for Order #${rental.transactionId}`}
              </span>
            </div>
          </div>

          {/* Email Body Preview */}
          <div className="p-4 space-y-3 bg-slate-950/80 text-slate-300 leading-relaxed">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-bold">Leaseify Logistics Notification</p>
                <p className="text-[11px] text-slate-400">Automated Escrow & Fleet Manager</p>
              </div>
            </div>

            <p>
              Hello <strong>{recipientName}</strong>,
            </p>

            {reminderType === 'due_reminder' ? (
              <p>
                This is a courteous reminder that your rental for{' '}
                <strong className="text-white">
                  {rental.items?.map((i) => i.name).join(', ') || 'Rented Item'}
                </strong>{' '}
                is scheduled to be returned on <strong className="text-white">{returnDateFormatted}</strong>.
                Returning on time preserves <strong>100% of your ₹{rental.depositTotal} security deposit</strong>.
              </p>
            ) : (
              <p className="text-rose-300">
                Your rental return is currently <strong>overdue</strong>. Daily late penalties are currently accruing and will be deducted from your ₹{rental.depositTotal} escrow security deposit upon return. Please bring items to our nearest hub immediately.
              </p>
            )}

            {customNote && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 italic text-[11px]">
                "{customNote}"
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[11px]">
              <span>Return Counter:</span>
              <span className="font-semibold text-white">
                {rental.pickupLocation || 'Main Hub (Gate 1)'}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Admin Note Input */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Include Custom Staff Message (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Please bring the original power adapter and case."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Dispatch Action Button */}
        <button
          type="button"
          disabled={loading || sentSuccess}
          onClick={handleSendEmail}
          className={`w-full py-3 text-white font-bold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
            sentSuccess
              ? 'bg-emerald-500 shadow-emerald-500/25'
              : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-sky-500/25'
          } disabled:opacity-50`}
        >
          {sentSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Email Dispatched Successfully!</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{loading ? 'Sending Email Reminder...' : 'Send Reminder Email Now'}</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};
