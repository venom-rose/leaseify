import React, { useState } from 'react';
import { KeyRound, QrCode, CheckCircle, RotateCcw, ShieldCheck, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BookingsPage() {
  const { bookings, updateBookingStatus, showToast } = useApp();
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredBookings = filterStatus === 'ALL'
    ? bookings
    : bookings.filter((b) => b.status === filterStatus);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="stock-indicator in-stock">🟢 ACTIVE</span>;
      case 'PENDING':
        return <span className="stock-indicator low-stock">🟡 PENDING PICKUP</span>;
      case 'RETURNED':
        return <span className="badge-soft badge-emerald" style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800 }}>🔵 RETURNED & SETTLED</span>;
      case 'OVERDUE':
        return <span className="stock-indicator out-stock">🔴 OVERDUE (+PENALTY)</span>;
      default:
        return <span className="stock-indicator in-stock">{status}</span>;
    }
  };

  return (
    <div className="view-section" style={{ display: 'block' }}>
      {/* Header Bar */}
      <div className="showroom-header-bar" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="section-tag">LIFECYCLE STATUS WORKFLOW</span>
          <h2 className="section-title">Bookings & Pickup Passes</h2>
        </div>

        <span className="badge-soft badge-gold">{bookings.length} Total Bookings</span>
      </div>

      {/* Filter Tabs Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['ALL', 'ACTIVE', 'PENDING', 'OVERDUE', 'RETURNED'].map((st) => (
          <button
            key={st}
            className={`category-pill ${filterStatus === st ? 'active' : ''}`}
            onClick={() => setFilterStatus(st)}
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', textTransform: 'capitalize' }}
          >
            {st} ({st === 'ALL' ? bookings.length : bookings.filter((b) => b.status === st).length})
          </button>
        ))}
      </div>

      {/* Bookings Workflow Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {filteredBookings.map((r) => (
          <div key={r.id} className="saas-product-card">
            <div className="saas-card-img-box">
              <img src={r.image} alt={r.product_name} />
              <div style={{ position: 'absolute', top: 10, left: 10 }}>
                {getStatusBadge(r.status)}
              </div>
            </div>

            <div className="saas-card-body">
              <div style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 700 }}>{r.code}</div>
              <h3 className="saas-card-title">{r.product_name}</h3>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.4rem 0' }}>
                Customer: <strong>{r.customer}</strong>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.4rem 0' }}>
                Dates: <strong>{r.startDate} &rarr; {r.endDate}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Escrow Deposit:</span>
                  <div style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: '0.9rem' }}>${r.deposit.toFixed(2)}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {r.status === 'PENDING' && (
                    <button
                      className="btn btn-gold btn-sm"
                      style={{ borderRadius: 8 }}
                      onClick={() => updateBookingStatus(r.id, 'ACTIVE')}
                    >
                      Handover
                    </button>
                  )}

                  {(r.status === 'ACTIVE' || r.status === 'OVERDUE') && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ borderRadius: 8, borderColor: 'var(--emerald)', color: 'var(--emerald)' }}
                      onClick={() => updateBookingStatus(r.id, 'RETURNED')}
                    >
                      Process Return
                    </button>
                  )}

                  {r.status === 'RETURNED' && (
                    <button className="btn btn-sm btn-secondary" style={{ borderRadius: 8 }} disabled>
                      <ShieldCheck style={{ width: 14, height: 14 }} /> Deposit Settled
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
