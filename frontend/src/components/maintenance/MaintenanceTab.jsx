import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Building,
  User,
  Check,
} from 'lucide-react';

export const MaintenanceTab = () => {
  const { role } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Plumbing',
    priority: 'medium',
    description: '',
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const res = await api.getMaintenance();
    if (res.success) setRequests(res.data);
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    const res = await api.updateMaintenanceStatus(id, newStatus);
    if (res.success) {
      setRequests((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r))
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.createMaintenance(formData);
    if (res.success) {
      setIsNewTicketModalOpen(false);
      fetchRequests();
      setFormData({
        title: '',
        category: 'Plumbing',
        priority: 'medium',
        description: '',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-warm-900 tracking-tight">Maintenance & Repairs</h2>
          <p className="text-sm text-warm-500 mt-1">
            Service request ticketing, priority assignments, and resolution tracking.
          </p>
        </div>

        <button
          onClick={() => setIsNewTicketModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 text-xs font-semibold shadow-lg shadow-amber transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Submit Ticket
        </button>
      </div>

      {/* Ticket Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {requests.map((item) => (
          <div
            key={item._id}
            className="glass-panel p-5 rounded-2xl border border-warm-200 flex flex-col justify-between space-y-4 hover:border-warm-200 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <Badge variant={item.priority}>{item.priority} Priority</Badge>
                <Badge variant={item.status}>{item.status}</Badge>
              </div>

              <h3 className="text-base font-bold text-warm-900">{item.title}</h3>
              <p className="text-xs text-warm-500 mt-1 line-clamp-3 leading-relaxed">
                {item.description}
              </p>

              <div className="mt-4 p-3 rounded-xl bg-warm-50/60 border border-warm-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-warm-500">Category:</span>
                  <span className="text-warm-700 font-medium">{item.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-warm-500">Property:</span>
                  <span className="text-warm-700 font-medium truncate max-w-[150px]">
                    {item.property?.title || 'Skyline Penthouse'}
                  </span>
                </div>
                {item.estimatedCost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-warm-500">Est. Cost:</span>
                    <span className="text-emerald-600 font-bold">
                      ₹{Number(item.estimatedCost || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions for changing status */}
            <div className="pt-3 border-t border-warm-200 flex items-center justify-between gap-2">
              <span className="text-[11px] text-warm-400">Update Status:</span>
              <div className="flex gap-1">
                {['open', 'in_progress', 'resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(item._id, st)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${
                      item.status === st
                        ? 'bg-amber-500 text-warm-900'
                        : 'bg-warm-100 text-warm-500 hover:text-warm-900'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Maintenance Ticket Modal */}
      <Modal
        isOpen={isNewTicketModalOpen}
        onClose={() => setIsNewTicketModalOpen(false)}
        title="Submit Maintenance Request"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Issue Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Water heater leaking in basement"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 placeholder-warm-400 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="HVAC">HVAC / AC</option>
                <option value="Appliance">Appliance</option>
                <option value="Pest Control">Pest Control</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="low">Low (Standard)</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent / Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Description & Location</label>
            <textarea
              rows="3"
              required
              placeholder="Describe what happened, where the issue is, and any urgent hazard..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 placeholder-warm-400 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 font-semibold rounded-xl text-xs shadow-lg shadow-amber transition-all"
          >
            Dispatch Ticket to Maintenance
          </button>
        </form>
      </Modal>
    </div>
  );
};
