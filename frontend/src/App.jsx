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
import { ProfileModal } from './components/common/ProfileModal';

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
        <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: '#FBF9F5' }}>
          <div className="max-w-md p-8 rounded-3xl bg-white border border-amber-200 shadow-xl space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-warm-950">Something went wrong</h2>
            <p className="text-xs text-warm-600">
              An unexpected render issue occurred. Click below to recover and reset the dashboard.
            </p>
            {this.state.error?.message && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-mono text-[11px] text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full py-2.5 btn-amber rounded-xl text-xs shadow-amber"
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
    <div className="min-h-screen flex" style={{ background: '#FBF9F5' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onProfileClick={() => setIsProfileOpen(true)}
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
          onProfileClick={() => setIsProfileOpen(true)}
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
      {/* Profile Settings Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
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
