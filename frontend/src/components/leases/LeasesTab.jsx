import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Calendar,
  DollarSign,
  User,
  Plus,
  ShieldCheck,
  Building2,
  Clock,
} from 'lucide-react';

export const LeasesTab = () => {
  const { role } = useAuth();
  const [leases, setLeases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewLeaseModalOpen, setIsNewLeaseModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    property: '',
    tenantName: 'Alex Rivera',
    tenantEmail: 'tenant@leaseify.com',
    startDate: '2026-09-01',
    endDate: '2027-08-31',
    monthlyRent: '',
    securityDeposit: '',
    terms: '12-month standard lease agreement.',
  });

  useEffect(() => {
    fetchLeases();
    if (role === 'admin') fetchProperties();
  }, [role]);

  const fetchLeases = async () => {
    setLoading(true);
    const res = await api.getLeases();
    if (res.success) setLeases(res.data);
    setLoading(false);
  };

  const fetchProperties = async () => {
    const res = await api.getProperties({ status: 'available' });
    if (res.success) {
      setProperties(res.data);
      if (res.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          property: res.data[0]._id,
          monthlyRent: res.data[0].rentAmount,
          securityDeposit: res.data[0].securityDeposit || res.data[0].rentAmount,
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      property: formData.property,
      tenantName: formData.tenantName,
      tenantEmail: formData.tenantEmail,
      startDate: formData.startDate,
      endDate: formData.endDate,
      monthlyRent: Number(formData.monthlyRent),
      securityDeposit: Number(formData.securityDeposit),
      terms: formData.terms,
    };

    const res = await api.createLease(payload);
    if (res.success) {
      setIsNewLeaseModalOpen(false);
      fetchLeases();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-warm-900 tracking-tight">Lease Agreements</h2>
          <p className="text-sm text-warm-500 mt-1">
            Manage legal tenancies, rental terms, and active renewal dates.
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsNewLeaseModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 text-xs font-semibold shadow-lg shadow-amber transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Lease
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {leases.map((lease) => (
          <div
            key={lease._id}
            className="glass-panel p-6 rounded-2xl border border-warm-200 space-y-4 hover:border-warm-200 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-warm-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-warm-900">Lease Agreement</span>
                </div>
                <Badge variant={lease.status}>{lease.status}</Badge>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs text-warm-500">Rented Unit</p>
                  <h3 className="text-base font-semibold text-warm-900 mt-0.5">
                    {lease.property?.title || 'Skyline Luxury Penthouse'}
                  </h3>
                </div>

                <div className="p-3 rounded-xl bg-warm-50/60 border border-warm-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-warm-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-warm-900">
                        {lease.tenant?.name || 'Alex Rivera'}
                      </p>
                      <p className="text-[11px] text-warm-500">
                        {lease.tenant?.email || 'tenant@leaseify.com'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-warm-50 border border-warm-200">
                    <p className="text-warm-500">Monthly Rent</p>
                    <p className="text-sm font-bold text-emerald-600 mt-0.5">
                      ₹{lease.monthlyRent?.toLocaleString('en-IN')} / mo
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-warm-50 border border-warm-200">
                    <p className="text-warm-500">Security Deposit</p>
                    <p className="text-sm font-bold text-warm-700 mt-0.5">
                      ₹{lease.securityDeposit?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-warm-500 pt-1">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>
                    {new Date(lease.startDate).toLocaleDateString()} —{' '}
                    {new Date(lease.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-warm-200 text-xs text-warm-500">
              <p className="italic">"{lease.terms}"</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Lease Modal */}
      <Modal
        isOpen={isNewLeaseModalOpen}
        onClose={() => setIsNewLeaseModalOpen(false)}
        title="Draft New Lease Agreement"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Select Property</label>
            <select
              value={formData.property}
              onChange={(e) => {
                const prop = properties.find((p) => p._id === e.target.value);
                setFormData({
                  ...formData,
                  property: e.target.value,
                  monthlyRent: prop?.rentAmount || '',
                  securityDeposit: prop?.securityDeposit || '',
                });
              }}
              className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
            >
              {properties.map((p) => (
                <option key={p._id} value={p._id} className="bg-white">
                  {p.title} (₹{Number(p.rentAmount || 0).toLocaleString('en-IN')}/mo)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Tenant Name</label>
              <input
                type="text"
                required
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Tenant Email</label>
              <input
                type="email"
                required
                value={formData.tenantEmail}
                onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Monthly Rent (₹)</label>
              <input
                type="number"
                required
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Security Deposit (₹)</label>
              <input
                type="number"
                required
                value={formData.securityDeposit}
                onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Lease Terms & Conditions</label>
            <textarea
              rows="2"
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 font-semibold rounded-xl text-xs shadow-lg shadow-amber transition-all"
          >
            Issue & Sign Lease Agreement
          </button>
        </form>
      </Modal>
    </div>
  );
};
