import React from 'react';

export const Badge = ({ variant = 'default', children, className = '' }) => {
  const styles = {
    available: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    rented: 'bg-sky-50 text-sky-600 border-sky-200',
    maintenance: 'bg-amber-50 text-amber-600 border-amber-200',
    active: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
    booked: 'bg-sky-50 text-sky-600 border-sky-200 font-semibold',
    picked: 'bg-teal-50 text-teal-600 border-teal-200 font-semibold',
    returned: 'bg-emerald-50 text-emerald-600 border-emerald-200 font-semibold',
    late: 'bg-red-50 text-red-500 border-red-200 font-semibold',
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    paid: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    overdue: 'bg-red-50 text-red-500 border-red-200',
    open: 'bg-red-50 text-red-500 border-red-200',
    in_progress: 'bg-amber-50 text-amber-600 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    urgent: 'bg-red-50 text-red-500 border-red-200 font-semibold',
    high: 'bg-orange-50 text-orange-600 border-orange-200',
    medium: 'bg-sky-50 text-sky-600 border-sky-200',
    low: 'bg-warm-100 text-warm-600 border-warm-200',
    admin: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
    user: 'bg-teal-50 text-teal-600 border-teal-200 font-semibold',
    default: 'bg-warm-100 text-warm-600 border-warm-200',
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
