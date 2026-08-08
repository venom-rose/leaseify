import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import {
  Building2,
  Calendar,
  CreditCard,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export const TenantPortalTab = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [rentPaidSuccess, setRentPaidSuccess] = useState(false);

  const handleQuickPay = () => {
    setRentPaidSuccess(true);
    setTimeout(() => setRentPaidSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl border border-warm-200 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <Badge variant="user" className="mb-3">
            Tenant Resident Portal
          </Badge>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome home, {user?.name?.split(' ')[0] || 'Alex'}!
          </h2>
          <p className="text-sm text-warm-200 mt-2 leading-relaxed">
            Your resident dashboard for Skyline Luxury Penthouse (Suite 44B). Manage monthly rent, request repairs, and view your lease terms.
          </p>
        </div>
      </div>

      {rentPaidSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Rent payment of ₹38,500 processed successfully! Receipt #TXN-AUG26-001 issued.</span>
        </div>
      )}

      {/* Rented Property & Next Due Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rented Home Card */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden border border-warm-200 flex flex-col sm:flex-row">
          <div className="sm:w-1/2 h-56 sm:h-auto bg-warm-50 relative">
            <img
              src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80"
              alt="Skyline Luxury Penthouse"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3">
              <Badge variant="active">Active Lease</Badge>
            </div>
          </div>

          <div className="p-6 sm:w-1/2 flex flex-col justify-between space-y-4">
            <div>
              <p className="text-xs text-warm-500 font-semibold uppercase tracking-wider">Your Unit</p>
              <h3 className="text-lg font-bold text-warm-900 mt-1">Skyline Luxury Penthouse</h3>
              <p className="text-xs text-warm-500 mt-1">742 Evergreen Terrace, Suite 44B, Mumbai, MH</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-warm-50/60 border border-warm-200">
                <span className="text-warm-500">Monthly Rent:</span>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">₹38,500 / mo</p>
              </div>
              <div className="p-2.5 rounded-xl bg-warm-50/60 border border-warm-200">
                <span className="text-warm-500">Lease Ends:</span>
                <p className="text-xs font-semibold text-warm-900 mt-0.5">Dec 31, 2026</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('leases')}
              className="w-full py-2 rounded-xl bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-warm-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-600" />
              View Full Lease Terms
            </button>
          </div>
        </div>

        {/* Rent Due & Quick Pay Box */}
        <div className="glass-panel p-6 rounded-2xl border border-warm-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">
                Upcoming Rent Due
              </span>
              <Badge variant="paid">Up to Date</Badge>
            </div>

            <div className="mt-4">
              <span className="text-3xl font-extrabold text-warm-900">₹38,500</span>
              <span className="text-xs text-warm-500"> INR</span>
              <div className="flex items-center gap-1.5 text-xs text-warm-600 mt-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Due Date: September 1, 2026</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-6">
            <button
              onClick={handleQuickPay}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-emerald-400 hover:to-teal-500 text-warm-900 font-semibold rounded-xl text-xs shadow-lg shadow-amber transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Pay Rent with Card / ACH
            </button>
            <p className="text-[11px] text-center text-warm-400">
              Autopay is enabled for the 1st of each month.
            </p>
          </div>
        </div>
      </div>

      {/* Shortcuts & Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Maintenance Ticket */}
        <div className="glass-panel p-6 rounded-2xl border border-warm-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-semibold text-warm-900">Need a Repair in Your Unit?</h3>
            </div>
            <p className="text-xs text-warm-500 leading-relaxed">
              Report any plumbing, electrical, HVAC, or appliance issues directly to property management for rapid dispatch.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('maintenance')}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-sky-400 text-warm-900 text-xs font-semibold shadow-md shadow-amber transition-all flex items-center justify-center gap-2"
          >
            <Wrench className="w-3.5 h-3.5" />
            Open Maintenance Request
          </button>
        </div>

        {/* Property Manager Emergency Contact */}
        <div className="glass-panel p-6 rounded-2xl border border-warm-200 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-semibold text-warm-900">Property Management Office</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-warm-50/60 border border-warm-200">
              <span className="text-warm-500">Manager:</span>
              <span className="text-warm-900 font-medium">Sarah Jenkins</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-warm-50/60 border border-warm-200">
              <div className="flex items-center gap-2 text-warm-500">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span>Office Phone:</span>
              </div>
              <span className="text-warm-900 font-medium">+1 (555) 234-5678</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-warm-50/60 border border-warm-200">
              <div className="flex items-center gap-2 text-warm-500">
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>Emergency Email:</span>
              </div>
              <span className="text-warm-900 font-medium">admin@leaseify.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
