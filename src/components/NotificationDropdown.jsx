import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function NotificationDropdown() {
  const { isNotificationsOpen, notifications } = useApp();

  if (!isNotificationsOpen) return null;

  return (
    <div
      className="user-dropdown-menu show"
      style={{ width: 310, right: 0, padding: '0.75rem' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Bell style={{ width: 15, height: 15, color: 'var(--gold)' }} /> Notification Stream
        </strong>
        <span className="badge-soft badge-gold" style={{ fontSize: '0.68rem' }}>
          {notifications.length} New
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
        {notifications.map((n) => {
          const IconComp = n.type === 'warning' ? AlertTriangle : n.type === 'success' ? CheckCircle : Info;
          const color = n.type === 'warning' ? 'var(--rose)' : n.type === 'success' ? 'var(--emerald)' : 'var(--gold)';

          return (
            <div
              key={n.id}
              style={{
                display: 'flex',
                gap: '0.6rem',
                padding: '0.6rem',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <IconComp style={{ width: 16, height: 16, color, flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {n.message}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 4 }}>
                  {n.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
