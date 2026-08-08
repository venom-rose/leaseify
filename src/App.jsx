import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Layout & Components
import Navbar from './components/Navbar';

// Pages
import MarketplacePage from './pages/MarketplacePage';
import BookingsPage from './pages/BookingsPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ClientsPage from './pages/ClientsPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-root">
          {/* Top Navbar with AppContext */}
          <Navbar />

          {/* Main Route Content */}
          <main className="main-content" style={{ padding: '2rem 1.5rem', maxWidth: 1400, margin: '0 auto' }}>
            <Routes>
              {/* Default Route Redirect */}
              <Route path="/" element={<Navigate to="/marketplace" replace />} />

              {/* Application Routes */}
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/clients" element={<ClientsPage />} />

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/marketplace" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
