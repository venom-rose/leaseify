import React from 'react';
import { TrendingUp, PieChart, BarChart3 } from 'lucide-react';

export default function AnalyticsCharts({ trendData, categoriesShare }) {
  const defaultTrend = trendData || [
    { day: 'Mon', revenue: 2100, bookings: 12 },
    { day: 'Tue', revenue: 2800, bookings: 14 },
    { day: 'Wed', revenue: 3200, bookings: 16 },
    { day: 'Thu', revenue: 2900, bookings: 15 },
    { day: 'Fri', revenue: 4100, bookings: 19 },
    { day: 'Sat', revenue: 4800, bookings: 22 },
    { day: 'Sun', revenue: 3450, bookings: 18 }
  ];

  const defaultCategories = categoriesShare || [
    { name: 'Electronics & Gadgets', percentage: 42, color: 'var(--gold)' },
    { name: 'Vehicles & Mobility', percentage: 28, color: 'var(--cyan)' },
    { name: 'Furniture & Living', percentage: 18, color: 'var(--emerald)' },
    { name: 'Home Appliances', percentage: 12, color: 'var(--amber)' }
  ];

  const maxRevenue = Math.max(...defaultTrend.map((d) => d.revenue));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', margin: '2rem 0' }}>
      {/* 7-Day Revenue & Booking Volume Bar Chart */}
      <div className="saas-product-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart3 style={{ width: 18, height: 18, color: 'var(--gold)' }} /> Revenue & Booking Volume
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>7-day revenue performance ($)</span>
          </div>
          <span className="badge-soft badge-gold" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp style={{ width: 12, height: 12 }} /> +18.4% WoW
          </span>
        </div>

        {/* Visual Bar Chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, gap: 8, padding: '0 0.5rem' }}>
          {defaultTrend.map((item, idx) => {
            const heightPercent = Math.round((item.revenue / maxRevenue) * 100);
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>
                  ${(item.revenue / 1000).toFixed(1)}k
                </span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 28,
                    height: `${heightPercent}%`,
                    background: 'linear-gradient(180deg, var(--gold), #d97706)',
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                  }}
                  title={`${item.day}: $${item.revenue} (${item.bookings} bookings)`}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, fontWeight: 600 }}>
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Revenue Share Progress Meters */}
      <div className="saas-product-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PieChart style={{ width: 18, height: 18, color: 'var(--cyan)' }} /> Category Revenue Distribution
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Revenue breakdown by product type</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          {defaultCategories.map((cat, idx) => (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-main)' }}>{cat.name}</span>
                <span style={{ color: cat.color }}>{cat.percentage}%</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${cat.percentage}%`,
                    height: '100%',
                    background: cat.color,
                    borderRadius: 10,
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
