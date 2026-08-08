import React from 'react';

export const StatCard = ({ title, value, change, changeType = 'positive', icon: Icon, color = 'sky', subtitle }) => {
  const colorMap = {
    sky: 'from-sky-500/20 to-sky-600/5 text-sky-400 border-sky-500/20',
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20',
    purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/20',
    rose: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/20',
  };

  const bgStyle = colorMap[color] || colorMap.sky;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800/80 p-5 shadow-lg hover:border-slate-700 transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h4 className="mt-2 text-2xl font-bold text-white tracking-tight">{value}</h4>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${bgStyle} border`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {change && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              changeType === 'positive'
                ? 'text-emerald-400'
                : changeType === 'negative'
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {change}
          </span>
          <span className="text-slate-500">vs last month</span>
        </div>
      )}
    </div>
  );
};
