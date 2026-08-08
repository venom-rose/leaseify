import React from 'react';

export const Badge = ({ variant = 'default', children, className = '' }) => {
  const styles = {
    available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rented: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    maintenance: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    booked: 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-semibold',
    picked: 'bg-teal-500/15 text-teal-300 border-teal-500/30 font-semibold',
    returned: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold',
    late: 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-semibold',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    overdue: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    open: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    urgent: 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-semibold',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    admin: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    user: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    default: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const currentStyle = styles[variant.toLowerCase()] || styles.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStyle} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75 animate-pulse"></span>
      {children}
    </span>
  );
};
