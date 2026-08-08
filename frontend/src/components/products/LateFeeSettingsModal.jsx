import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import {
  Settings,
  Clock,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react';

export const LateFeeSettingsModal = ({ isOpen, onClose, onSettingsUpdated }) => {
  const [settings, setSettings] = useState({
    lateFeePerDay: 20,
    gracePeriodDays: 1,
    autoOverdueCheck: true,
    feeCalculationType: 'flat_rate',
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setLoading(true);
    const res = await api.getRentalSettings();
    if (res.success && res.data) {
      setSettings(res.data);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    const res = await api.updateRentalSettings(settings);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Rental late fee and grace period policies updated successfully! ✨');
      if (onSettingsUpdated) onSettingsUpdated(res.data);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    }
  };

  const handleSyncOverdue = async () => {
    setSyncing(true);
    const res = await api.syncOverdueRentals();
    setSyncing(false);
    if (res.success) {
      setSuccessMsg(res.message || 'Overdue rentals sync complete!');
      if (onSettingsUpdated) onSettingsUpdated();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Late Return Fee & Grace Period Policy"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Header explanation banner */}
        <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 text-xs text-warm-500 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>Automatic Penalty & Deposit Protection</span>
          </div>
          <p>
            When a rental exceeds the scheduled end date plus the grace period, daily late fees are calculated and deducted from the renter's security deposit.
          </p>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Late Fee Rate Per Day */}
          <div>
            <label className="block text-xs font-semibold text-warm-700 mb-1.5">
              Late Fee Rate Per Overdue Day (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-warm-500 font-bold">₹</span>
              <input
                type="number"
                min="0"
                required
                value={settings.lateFeePerDay}
                onChange={(e) => setSettings({ ...settings, lateFeePerDay: Number(e.target.value) })}
                className="w-full pl-8 pr-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-[11px] text-warm-400 mt-1">
              Charged daily in Indian Rupees (₹) once scheduled rental duration and grace period expire.
            </p>
          </div>

          {/* Grace Period (Days) */}
          <div>
            <label className="block text-xs font-semibold text-warm-700 mb-1.5">
              Grace Period (Days Before Penalties Begin)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="7"
                required
                value={settings.gracePeriodDays}
                onChange={(e) => setSettings({ ...settings, gracePeriodDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-[11px] text-warm-400 mt-1">
              e.g. Set to <strong>1 day</strong> for 24-hour courtesy buffer before deducting penalties.
            </p>
          </div>

          {/* Calculation Mode */}
          <div>
            <label className="block text-xs font-semibold text-warm-700 mb-1.5">
              Penalty Model
            </label>
            <select
              value={settings.feeCalculationType}
              onChange={(e) => setSettings({ ...settings, feeCalculationType: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:outline-none focus:border-amber-500"
            >
              <option value="flat_rate">Standard Flat Rate per Day (₹{Number(settings.lateFeePerDay || 0).toLocaleString('en-IN')}/day)</option>
              <option value="daily_rate_multiplier">1.5× Daily Item Rental Rate</option>
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-warm-200">
          <button
            type="button"
            disabled={syncing}
            onClick={handleSyncOverdue}
            className="w-full sm:w-auto px-3.5 py-2 bg-warm-100 hover:bg-warm-200 text-warm-600 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sweeping...' : 'Run Overdue Audit'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-600 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 sm:w-auto px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 text-xs font-bold rounded-xl shadow-lg shadow-amber transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{loading ? 'Saving...' : 'Save Policy Settings'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
