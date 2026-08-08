import React, { useState } from 'react';
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
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

const MainApp = () => {
  const { isAuthenticated, role, currentTab, setCurrentTab } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);

  // If not authenticated, present dedicated Login or Signup page
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return <SignupPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateToSignup={() => setAuthView('signup')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onCartClick={() => setCurrentTab('cart')}
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
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}
