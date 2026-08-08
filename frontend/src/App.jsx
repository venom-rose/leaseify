import React, { useState, Component } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Sidebar } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';
import { OverviewTab } from './components/dashboard/OverviewTab';
import { PropertiesTab } from './components/properties/PropertiesTab';
import { ProductsTab } from './components/products/ProductsTab';
import { CartPage } from './components/products/CartPage';
import { RentalsTab } from './components/products/RentalsTab';
import { LeasesTab } from './components/leases/LeasesTab';
import { PaymentsTab } from './components/payments/PaymentsTab';
import { MaintenanceTab } from './components/maintenance/MaintenanceTab';
import { TenantPortalTab } from './components/tenant/TenantPortalTab';
import { AnalyticsPredictionsTab } from './components/analytics/AnalyticsPredictionsTab';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

// Robust UI Error Boundary to prevent any blank screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Runtime Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-slate-400">
              An unexpected render issue occurred. Click below to recover and reset the dashboard.
            </p>
            {this.state.error?.message && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 font-mono text-[11px] text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-500/25 transition-all"
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainApp = () => {
  const { isAuthenticated, role, currentTab, setCurrentTab } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);

  // If not authenticated, present dedicated Login or Signup page
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return <SignupPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateToSignup={() => setAuthView('signup')} />;
  }

  const validTabs = [
    'dashboard',
    'analytics',
    'properties',
    'products',
    'cart',
    'rentals',
    'leases',
    'payments',
    'maintenance',
    'tenant-portal',
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Smart Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNavigateTab={(tab) => setCurrentTab(tab)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onCartClick={() => setCurrentTab('cart')}
          onNotificationClick={() => setIsNotificationOpen(true)}
          onNewPropertyClick={
            role === 'admin'
              ? () => {
                  setCurrentTab('properties');
                  setIsAddPropertyModalOpen(true);
                }
              : null
          }
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Executive Dashboard */}
          {currentTab === 'dashboard' && (
            <OverviewTab
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onAddPropertyClick={() => {
                setCurrentTab('properties');
                setIsAddPropertyModalOpen(true);
              }}
            />
          )}

          {/* AI Overdue Risk Predictions & Product Availability Heatmap */}
          {currentTab === 'analytics' && (
            <AnalyticsPredictionsTab onNavigateTab={(tab) => setCurrentTab(tab)} />
          )}

          {/* Properties Catalog */}
          {currentTab === 'properties' && (
            <PropertiesTab
              isAddModalOpen={isAddPropertyModalOpen}
              setIsAddModalOpen={setIsAddPropertyModalOpen}
            />
          )}

          {/* Product Rental Store */}
          {currentTab === 'products' && (
            <ProductsTab onNavigateToCart={() => setCurrentTab('cart')} />
          )}

          {/* Rental Cart & Checkout */}
          {currentTab === 'cart' && (
            <CartPage
              onNavigateToProducts={() => setCurrentTab('products')}
              onNavigateToRentals={() => setCurrentTab('rentals')}
            />
          )}

          {/* My Rentals / Product Bookings */}
          {currentTab === 'rentals' && (
            <RentalsTab onNavigateToProducts={() => setCurrentTab('products')} />
          )}

          {/* Real Estate Lease Agreements */}
          {currentTab === 'leases' && <LeasesTab />}

          {/* Rent Payments & Dues */}
          {currentTab === 'payments' && <PaymentsTab />}

          {/* Maintenance Requests */}
          {currentTab === 'maintenance' && <MaintenanceTab />}

          {/* Resident Tenant Portal */}
          {currentTab === 'tenant-portal' && (
            <TenantPortalTab onNavigateTab={(tab) => setCurrentTab(tab)} />
          )}

          {/* Fallback to OverviewTab if currentTab is unrecognized */}
          {!validTabs.includes(currentTab) && (
            <OverviewTab
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onAddPropertyClick={() => {
                setCurrentTab('properties');
                setIsAddPropertyModalOpen(true);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <MainApp />
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
