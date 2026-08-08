import React, { useState } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  Clock,
  PackageCheck,
  CheckCircle2,
  Mail,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const NotificationDrawer = ({ isOpen, onClose, onNavigateTab }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      type: 'overdue',
      title: '🚨 Overdue Return Alert',
      message: 'Alex Rivera is 3 days past scheduled deadline for Sony Alpha A7 IV. Accruing ₹20/day.',
      time: '12m ago',
      read: false,
      tab: 'rentals',
    },
    {
      id: 'notif-2',
      type: 'due_today',
      title: '⏳ Return Due in < 24 Hours',
      message: 'Elena Rostova scheduled return for LG 65" 4K OLED TV expires tonight at 11:59 PM.',
      time: '45m ago',
      read: false,
      tab: 'rentals',
    },
    {
      id: 'notif-3',
      type: 'pickup',
      title: '📦 Order Ready for Pickup',
      message: 'New order #RNT-3810 reserved. Renter arriving at Main Logistics Gate 1.',
      time: '2h ago',
      read: false,
      tab: 'rentals',
    },
    {
      id: 'notif-4',
      type: 'inventory',
      title: '⚠️ Low Inventory Warning',
      message: 'Modular Velvet Sofa stock dropped to 1 remaining unit in inventory.',
      time: '4h ago',
      read: true,
      tab: 'products',
    },
    {
      id: 'notif-5',
      type: 'refund',
      title: '✅ Full Deposit Refund Settled',
      message: '₹2,000 security deposit released in full to customer card.',
      time: '1d ago',
      read: true,
      tab: 'rentals',
    },
  ]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.tab && onNavigateTab) {
      onNavigateTab(notif.tab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white/95 backdrop-blur-xl border-l border-warm-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-warm-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-warm-900 flex items-center gap-1.5">
              Smart Alerts
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-warm-900 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-warm-500">Automated rental fleet monitoring</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] text-amber-600 hover:underline font-semibold"
            >
              Mark read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-warm-500 hover:text-warm-900 hover:bg-warm-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
        {notifications.map((n) => {
          let iconBg = 'bg-amber-500/20 text-amber-600';
          let IconComp = Bell;

          if (n.type === 'overdue') {
            iconBg = 'bg-red-500/20 text-red-500';
            IconComp = AlertTriangle;
          } else if (n.type === 'due_today') {
            iconBg = 'bg-amber-500/20 text-amber-300';
            IconComp = Clock;
          } else if (n.type === 'pickup') {
            iconBg = 'bg-amber-500/20 text-amber-600';
            IconComp = PackageCheck;
          } else if (n.type === 'refund') {
            iconBg = 'bg-emerald-50 text-emerald-600';
            IconComp = CheckCircle2;
          }

          return (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`pt-2.5 p-3 rounded-2xl transition-all cursor-pointer border ${
                n.read
                  ? 'bg-warm-50/40 border-warm-200/60 opacity-75 hover:opacity-100 hover:bg-warm-50'
                  : 'bg-warm-50 border-amber-200 shadow-md shadow-sky-950/20 hover:border-sky-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-warm-900 truncate">{n.title}</h4>
                    <span className="text-[10px] text-warm-400 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-warm-600 mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer Footer */}
      <div className="p-3 bg-warm-50 border-t border-warm-200 text-center">
        <span className="text-[11px] text-warm-400 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-600" />
          Real-time AI Alert & Escrow Monitor
        </span>
      </div>
    </div>
  );
};
