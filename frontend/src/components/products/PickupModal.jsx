import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { api } from '../../api/client';
import {
  Calendar,
  MapPin,
  QrCode,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

export const PickupModal = ({ isOpen, onClose, rental, onPickupSuccess, onOpenQR }) => {
  if (!rental) return null;

  const [pickupDate, setPickupDate] = useState(
    rental.scheduledPickupDate
      ? new Date(rental.scheduledPickupDate).toISOString().split('T')[0]
      : new Date(rental.startDate).toISOString().split('T')[0]
  );
  const [pickupLocation, setPickupLocation] = useState(
    rental.pickupLocation || 'Main Logistics Counter (Gate 1)'
  );
  const [recipientName, setRecipientName] = useState(rental.user?.name || '');
  const [recipientPhone, setRecipientPhone] = useState(rental.user?.phone || '');
  const [idNumber, setIdNumber] = useState('');
  const [notes, setNotes] = useState(rental.pickupNotes || '');
  const [loading, setLoading] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [error, setError] = useState(null);

  const verificationCode = rental.pickupVerificationCode || 'PKP-894210';

  const handleMarkPicked = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.markAsPicked(rental._id, {
        pickedByName: recipientName,
        pickedByPhone: recipientPhone,
        idNumber,
        notes,
      });

      if (res && res.success) {
        onPickupSuccess?.(res.data);
        onClose();
      } else {
        setError(res?.message || 'Failed to mark as picked up');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.schedulePickup(rental._id, {
        scheduledPickupDate: pickupDate,
        pickupLocation,
        pickupNotes: notes,
      });

      if (res && res.success) {
        setRescheduleMode(false);
        onPickupSuccess?.(res.data);
      } else {
        setError(res?.message || 'Failed to update schedule');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pickup Fulfillment & Handover"
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {/* Top Order Badge & Verification Pill */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-slate-900 to-indigo-500/10 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Reservation Verified
            </span>
            <h4 className="text-sm font-black text-white mt-0.5">
              Order #{rental.transactionId || 'RNT-990'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Renter: <strong className="text-white">{rental.user?.name || 'Alex Rivera'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pickup Pass</span>
              <span className="font-mono text-xs font-black text-emerald-400 tracking-wider">
                {verificationCode}
              </span>
            </div>

            {onOpenQR && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQR(rental, 'pickup');
                }}
                className="p-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 transition-all flex flex-col items-center justify-center gap-0.5"
                title="Open QR Scanner & Pass"
              >
                <QrCode className="w-4 h-4" />
                <span className="text-[9px] font-bold">QR Pass</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pickup Location & Date Card */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Scheduled Logistics
            </span>
            <button
              type="button"
              onClick={() => setRescheduleMode(!rescheduleMode)}
              className="text-sky-400 hover:underline font-semibold"
            >
              {rescheduleMode ? 'Cancel' : 'Change Date / Hub'}
            </button>
          </div>

          {rescheduleMode ? (
            <div className="space-y-3 pt-1 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Pickup Date</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Pickup Hub / Counter</label>
                  <select
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="Main City Center Hub (Counter #1)">Main City Center Hub (Counter #1)</option>
                    <option value="West Logistics Warehouse (Bay 4)">West Logistics Warehouse (Bay 4)</option>
                    <option value="Express Locker Station B">Express Locker Station B</option>
                    <option value="Direct Courier Delivery">Direct Courier Handover</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={handleScheduleSave}
                disabled={loading}
                className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Save Scheduled Handover
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  Date: <strong>{new Date(pickupDate).toLocaleDateString()}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{pickupLocation}</span>
              </div>
            </div>
          )}
        </div>

        {/* Handover Recipient Verification Form */}
        <form onSubmit={handleMarkPicked} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Recipient / Tenant Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Recipient Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Govt ID / Verification Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. DL / Aadhaar / Passport #9821"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Handover Notes / Checklist
              </label>
              <input
                type="text"
                placeholder="e.g. Inspected pristine, power cable provided"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Action Handover Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-600 hover:from-sky-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PackageCheck className="w-4 h-4" />
            <span>
              {loading ? 'Processing Handover...' : 'Confirm Pickup & Activate Rental'}
            </span>
          </button>
        </form>
      </div>
    </Modal>
  );
};
