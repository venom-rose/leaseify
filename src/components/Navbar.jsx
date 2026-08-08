import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Zap,
  LayoutGrid,
  KeyRound,
  LayoutDashboard,
  Boxes,
  Users,
  Moon,
  Sun,
  Bell,
  ShoppingBag,
  Calendar,
  ChevronDown,
  User,
  Truck,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  Sliders,
  LogOut,
  Menu,
  X,
  Shield,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar() {
  const {
    theme,
    toggleTheme,
    userRole,
    toggleUserRole,
    toggleNotifications,
    notifications,
    isProfileOpen,
    toggleProfile,
    simulatedDays,
    setSimulatedDays,
    currentUser,
    toast
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="saas-header">
        {/* Section 1: Left (Brand Logo & Title) */}
        <div className="saas-header-left">
          <div className="brand-logo-card" onClick={() => navigate('/marketplace')}>
            <div className="logo-icon-badge">
              <Zap style={{ width: 22, height: 22 }} />
            </div>
            <div className="logo-text-group">
              <span className="brand-title">
                Leaseify <span className="brand-accent">Marketplace</span>
              </span>
              <span className="brand-subtitle">Rental SaaS Platform</span>
            </div>
          </div>
        </div>

        {/* Section 2: Center (Primary Navigation with RBAC Filtering) */}
        <nav className={`saas-header-center ${isMobileMenuOpen ? 'show-mobile' : ''}`} id="primary-nav-menu">
          <NavLink
            to="/marketplace"
            className={({ isActive }) => (isActive ? 'nav-item-btn active' : 'nav-item-btn')}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <LayoutGrid style={{ width: 16, height: 16 }} />
            Marketplace
          </NavLink>

          <NavLink
            to="/bookings"
            className={({ isActive }) => (isActive ? 'nav-item-btn active' : 'nav-item-btn')}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <KeyRound style={{ width: 16, height: 16 }} />
            Bookings & Passes
            <span className="badge-counter">4</span>
          </NavLink>

          {/* Admin-Only Navigation Suite (RBAC Controlled) */}
          {userRole === 'admin' && (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'nav-item-btn active' : 'nav-item-btn')}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LayoutDashboard style={{ width: 16, height: 16 }} />
                Command Center
              </NavLink>

              <NavLink
                to="/inventory"
                className={({ isActive }) => (isActive ? 'nav-item-btn active' : 'nav-item-btn')}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Boxes style={{ width: 16, height: 16 }} />
                Inventory
              </NavLink>

              <NavLink
                to="/clients"
                className={({ isActive }) => (isActive ? 'nav-item-btn active' : 'nav-item-btn')}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users style={{ width: 16, height: 16 }} />
                Clients
              </NavLink>
            </>
          )}
        </nav>

        {/* Section 3: Right (Utilities & Profile) */}
        <div className="saas-header-right">
          {/* Dark / Light Mode Toggle Button */}
          <button
            className="header-icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Moon style={{ width: 18, height: 18 }} /> : <Sun style={{ width: 18, height: 18 }} />}
          </button>

          {/* Notifications Bell */}
          <div style={{ position: 'relative' }}>
            <button
              className="header-icon-btn notification-bell-btn"
              onClick={toggleNotifications}
              title="Notifications Stream"
            >
              <Bell style={{ width: 18, height: 18 }} />
              {unreadCount > 0 && <span className="notification-dot" />}
            </button>

            {/* Notification Stream Popover */}
            <NotificationDropdown />
          </div>

          {/* Date Filter Dropdown */}
          <div className="date-filter-wrapper">
            <Calendar className="date-filter-icon" style={{ width: 15, height: 15 }} />
            <select
              className="date-filter-select"
              value={simulatedDays}
              onChange={(e) => setSimulatedDays(parseInt(e.target.value))}
            >
              <option value={0}>Today (Live)</option>
              <option value={1}>+1 Day (Simulated)</option>
              <option value={3}>+3 Days (Simulated)</option>
              <option value={7}>+7 Days (Simulated)</option>
            </select>
          </div>

          {/* User Profile Card */}
          <div className="user-profile-card" onClick={toggleProfile}>
            <img src={currentUser.avatar} alt={currentUser.name} className="profile-avatar" />
            <div className="profile-text">
              <span className="profile-name">{currentUser.name}</span>
              <span className="profile-role">{currentUser.title}</span>
            </div>
            <ChevronDown className="profile-chevron" style={{ width: 14, height: 14 }} />

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="user-dropdown-menu show" onClick={(e) => e.stopPropagation()}>
                <div className="dropdown-header">
                  <strong>{currentUser.name}</strong>
                  <span>{currentUser.email}</span>
                </div>
                <div className="dropdown-divider" />

                {/* Role Persona Switcher Toggle */}
                <button className="dropdown-item" style={{ color: 'var(--gold)', fontWeight: 700 }} onClick={toggleUserRole}>
                  <Shield style={{ width: 16, height: 16 }} />
                  {userRole === 'admin' ? 'Switch to Customer Persona' : 'Switch to Admin Persona'}
                </button>

                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => alert('Editing Profile')}>
                  <User style={{ width: 16, height: 16 }} /> Edit Profile & Address
                </button>
                {userRole === 'admin' && (
                  <>
                    <button className="dropdown-item" onClick={() => navigate('/dashboard')}>
                      <Truck style={{ width: 16, height: 16 }} /> Intakes & Delivery
                    </button>
                    <button className="dropdown-item" onClick={() => navigate('/dashboard')}>
                      <ShieldCheck style={{ width: 16, height: 16 }} /> Escrow Vault
                    </button>
                    <button className="dropdown-item" onClick={() => navigate('/inventory')}>
                      <FileSpreadsheet style={{ width: 16, height: 16 }} /> Quotations
                    </button>
                    <button className="dropdown-item" onClick={() => navigate('/inventory')}>
                      <Layers style={{ width: 16, height: 16 }} /> Manage Categories
                    </button>
                  </>
                )}
                <div className="dropdown-divider" />
                <button className="dropdown-item logout-item" onClick={() => alert('Signed Out')}>
                  <LogOut style={{ width: 16, height: 16 }} /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>
        </div>
      </header>

      {/* Floating Toast Notification Banner */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, display: 'flex', alignItems: 'center', gap: 10, padding: '0.85rem 1.25rem', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--gold)', color: 'var(--text-main)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          {toast.type === 'success' ? <CheckCircle style={{ color: 'var(--emerald)', width: 18, height: 18 }} /> : <Info style={{ color: 'var(--gold)', width: 18, height: 18 }} />}
          <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{toast.message}</span>
        </div>
      )}
    </>
  );
}
