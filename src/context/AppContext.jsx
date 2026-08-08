import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('leaseify_theme') || 'dark');

  // Role-Based Access Control (RBAC) State: 'admin' | 'customer'
  const [userRole, setUserRole] = useState('admin');

  // UI Dropdowns State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Date Machine Simulation State (0, 1, 3, 7 days)
  const [simulatedDays, setSimulatedDays] = useState(0);

  // Toast Banner Alert State
  const [toast, setToast] = useState(null);

  // User Profile Object
  const currentUser = {
    name: userRole === 'admin' ? 'Sarah Connor' : 'Alex Rivera',
    email: userRole === 'admin' ? 'sarah.c@leaseify.io' : 'alex.rivera@example.com',
    role: userRole,
    avatar: userRole === 'admin' 
      ? 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' 
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    title: userRole === 'admin' ? 'Fleet Director' : 'Black Card Elite'
  };

  // Live Bookings Workflow State
  const [bookings, setBookings] = useState([
    {
      id: 1,
      code: 'RNT-992-GT3RS',
      product_name: 'Porsche 911 GT3 RS (Weissach Package)',
      customer: 'Alex Rivera',
      startDate: '2026-08-05',
      endDate: '2026-08-10',
      status: 'ACTIVE',
      deposit: 1500,
      image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200'
    },
    {
      id: 2,
      code: 'RNT-A7M4-RIG',
      product_name: 'Sony Alpha A7 IV Video Rig',
      customer: 'Sarah Connor',
      startDate: '2026-08-01',
      endDate: '2026-08-07',
      status: 'OVERDUE',
      deposit: 250,
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200'
    },
    {
      id: 3,
      code: 'RNT-MBP-M3MAX',
      product_name: 'MacBook Pro 16" M3 Max',
      customer: 'Elena Rostova',
      startDate: '2026-08-12',
      endDate: '2026-08-18',
      status: 'PENDING',
      deposit: 300,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200'
    },
    {
      id: 4,
      code: 'RNT-AERON-CHAIR',
      product_name: 'Herman Miller Aeron Ergonomic Chair',
      customer: 'David Miller',
      startDate: '2026-07-20',
      endDate: '2026-07-27',
      status: 'RETURNED',
      deposit: 120,
      image: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=1200'
    }
  ]);

  // Notifications Stream State
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Overdue Return Alert', message: 'RNT-A7M4-RIG Sony Alpha camera is overdue.', time: '10m ago', type: 'warning', read: false },
    { id: 2, title: 'Pickup Staging Pass Ready', message: 'Porsche 911 GT3 RS staging pass generated.', time: '1h ago', type: 'info', read: false },
    { id: 3, title: 'Escrow Deposit Released', message: '$1,500 deposit auto-settled for clean return.', time: '3h ago', type: 'success', read: true }
  ]);

  // Sync theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('leaseify_theme', theme);
  }, [theme]);

  // Auto-close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsNotificationsOpen(false);
      setIsProfileOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    showToast(`Switched to ${nextTheme.toUpperCase()} mode`, 'info');
  };

  const toggleUserRole = () => {
    const nextRole = userRole === 'admin' ? 'customer' : 'admin';
    setUserRole(nextRole);
    showToast(`Switched role to ${nextRole === 'admin' ? 'Fleet Director (Admin)' : 'Client Explorer (Customer)'}`, 'success');
  };

  const toggleNotifications = (e) => {
    if (e) e.stopPropagation();
    setIsProfileOpen(false);
    setIsNotificationsOpen((prev) => !prev);
  };

  const toggleProfile = (e) => {
    if (e) e.stopPropagation();
    setIsNotificationsOpen(false);
    setIsProfileOpen((prev) => !prev);
  };

  const updateBookingStatus = (id, newStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
    showToast(`Booking ${id} status updated to ${newStatus}`, 'success');
  };

  const markNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Dynamic Dashboard Telemetry metrics based on simulatedDays & live bookings
  const getMetrics = () => {
    const activeCount = bookings.filter((b) => b.status === 'ACTIVE').length;
    const pendingCount = bookings.filter((b) => b.status === 'PENDING' || b.status === 'OVERDUE').length;
    const baseRevenue = 42850;
    const extraOverdueFee = simulatedDays * 850;

    return {
      activeRentals: Math.max(0, activeCount + Math.floor(simulatedDays * 1.2)),
      totalRevenue: baseRevenue + Math.round(extraOverdueFee),
      escrowHeld: Math.max(5000, 18400 - (simulatedDays * 1200)),
      overduePenalties: Math.round(2670 * (simulatedDays === 0 ? 1 : 1 + simulatedDays * 0.8)),
      pendingReturns: pendingCount + Math.floor(simulatedDays * 1.5)
    };
  };

  const value = {
    theme,
    toggleTheme,
    userRole,
    setUserRole,
    toggleUserRole,
    isNotificationsOpen,
    toggleNotifications,
    notifications,
    markNotificationRead,
    isProfileOpen,
    toggleProfile,
    simulatedDays,
    setSimulatedDays,
    currentUser,
    bookings,
    updateBookingStatus,
    metrics: getMetrics(),
    toast,
    showToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
