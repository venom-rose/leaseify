import React from 'react';

export const StatCard = ({ title, value, change, changeType = 'positive', icon: Icon, color = 'amber', subtitle }) => {
  const colorMap = {
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    sky: 'bg-sky-50 text-sky-600 border-sky-200',
    rose: 'bg-red-50 text-red-500 border-red-200',
  };

  const bgStyle = colorMap[color] || colorMap.amber;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-warm-200 p-5 shadow-card hover:shadow-card-hover transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-warm-500">{title}</p>
          <h4 className="mt-2 text-2xl font-bold text-warm-900 tracking-tight">{value}</h4>
          {subtitle && <p className="mt-1 text-xs text-warm-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${bgStyle}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {change && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              changeType === 'positive'
                ? 'text-emerald-600'
                : changeType === 'negative'
                ? 'text-red-500'
                : 'text-warm-500'
            }`}
          >
            {change}
          </span>
          <span className="text-warm-400">vs last month</span>
        </div>
      )}
    </div>
  );
};
