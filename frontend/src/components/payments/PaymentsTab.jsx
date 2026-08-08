import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard,
  Search,
  Plus,
  ArrowDownLeft,
  DollarSign,
  CheckCircle2,
  Calendar,
  Filter,
} from 'lucide-react';

export const PaymentsTab = () => {
  const { role } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    amount: '3850',
    dueDate: '2026-09-01',
    paymentMethod: 'Bank Transfer',
    type: 'Rent',
  });

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    const res = await api.getPayments(statusFilter);
    if (res.success) setPayments(res.data);
    setLoading(false);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const payload = {
      amount: Number(formData.amount),
      dueDate: formData.dueDate,
      paymentMethod: formData.paymentMethod,
      type: formData.type,
      status: 'paid',
    };

    const res = await api.createPayment(payload);
    if (res.success) {
      setIsPayModalOpen(false);
      fetchPayments();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-warm-900 tracking-tight">Payments & Invoicing</h2>
          <p className="text-sm text-warm-500 mt-1">
            Track rent collections, incoming deposits, and pending tenant balances.
          </p>
        </div>

        <button
          onClick={() => setIsPayModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 text-xs font-semibold shadow-lg shadow-amber transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {role === 'admin' ? 'Record Payment' : 'Pay Rent Now'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-warm-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-warm-500" />
          <span className="text-xs text-warm-500 font-medium">Filter by Status:</span>
        </div>
        <div className="flex gap-2">
          {['all', 'paid', 'pending', 'overdue'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? 'bg-amber-500 text-warm-900 shadow-md shadow-amber'
                  : 'bg-warm-50 border border-warm-200 text-warm-500 hover:text-warm-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="glass-panel rounded-2xl border border-warm-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-50/60 border-b border-warm-200 text-warm-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Property / Tenant</th>
                <th className="px-6 py-4">Type & Method</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {payments.map((p) => (
                <tr key={p._id} className="hover:bg-warm-100/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-warm-600">
                    {p.transactionId || 'TXN-DEFAULT'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-warm-900">{p.property?.title || 'Apartment Unit'}</p>
                    <p className="text-warm-500 text-[11px]">{p.tenant?.name || 'Alex Rivera'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-warm-700">{p.type || 'Rent'}</span>
                    <p className="text-[11px] text-warm-500">{p.paymentMethod || 'Bank Transfer'}</p>
                  </td>
                  <td className="px-6 py-4 text-warm-600">
                    {new Date(p.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-emerald-600">
                      ₹{p.amount?.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant={p.status}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={role === 'admin' ? 'Record Rent Payment' : 'Submit Rent Payment'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Amount (₹)</label>
            <input
              type="number"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
            >
              <option value="Bank Transfer">Bank Transfer (ACH)</option>
              <option value="Credit Card">Credit Card / Debit Card</option>
              <option value="Stripe">Stripe Checkout</option>
              <option value="Cash">Cash Deposit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Payment Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
            >
              <option value="Rent">Monthly Rent</option>
              <option value="Deposit">Security Deposit</option>
              <option value="Utility">Utility Re-charge</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-emerald-400 hover:to-teal-500 text-warm-900 font-semibold rounded-xl text-xs shadow-lg shadow-amber transition-all"
          >
            Confirm & Process Payment
          </button>
        </form>
      </Modal>
    </div>
  );
};
