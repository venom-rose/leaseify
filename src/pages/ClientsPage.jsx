import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader2, AlertCircle, X, CheckCircle } from 'lucide-react';
import { getClients, createClient } from '../services/api';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    activeBookings: 0
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClients();
      setClients(data);
    } catch (err) {
      setError('Failed to fetch client profiles from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.contact) return;

    try {
      setSubmitting(true);
      const newClient = await createClient(formData);

      setClients((prev) => [newClient, ...prev]);
      setIsModalOpen(false);
      setFormData({ name: '', contact: '', activeBookings: 0 });
      setSuccessMsg('Client profile created successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert('Error creating client: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="view-section" style={{ display: 'block' }}>
      {/* Header Bar */}
      <div className="showroom-header-bar" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="section-tag">CLIENT CRM & ACCESS CONTROL</span>
          <h2 className="section-title">Registered Clients & Accounts</h2>
        </div>

        <button className="btn btn-gold btn-sm" style={{ borderRadius: 8 }} onClick={() => setIsModalOpen(true)}>
          <Plus style={{ width: 14, height: 14 }} /> Add New Client
        </button>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--emerald)', borderRadius: 8, color: 'var(--emerald)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle style={{ width: 18, height: 18 }} /> {successMsg}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--rose)', borderRadius: 8, color: 'var(--rose)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle style={{ width: 18, height: 18 }} /> {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: 'var(--gold)', marginBottom: '0.5rem' }} />
          <div>Fetching client profiles from backend...</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Client Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Role & Membership</th>
                <th style={{ padding: '0.85rem 1rem' }}>Contact Info</th>
                <th style={{ padding: '0.85rem 1rem' }}>Active Bookings</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c._id || c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge-soft badge-gold">{c.tier || 'Standard Client'}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{c.contact}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--gold)' }}>
                    {c.activeBookings || 0} Rentals
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="modal-overlay active" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Add New Client Account</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Elena Rostova"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Contact (Email or Phone)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="elena.r@example.com or +1 (555) 987-6543"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Initial Active Bookings
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.activeBookings}
                  onChange={(e) => setFormData({ ...formData, activeBookings: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
