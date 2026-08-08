// backend/routes/router.js - Centralized API Router Dispatcher
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const rentalController = require('../controllers/rentalController');
const quotationController = require('../controllers/quotationController');
const pricelistController = require('../controllers/pricelistController');
const userController = require('../controllers/userController');
const analyticsController = require('../controllers/analyticsController');
const configController = require('../controllers/configController');
const depositController = require('../controllers/depositController');
const penaltyController = require('../controllers/penaltyController');
const dispatchController = require('../controllers/dispatchController');
const maintenanceController = require('../controllers/maintenanceController');
const reminderController = require('../controllers/reminderController');

async function handleApiRequest(req, res, pathname, query, body, user) {
  if (!pathname.startsWith('/api')) {
    return null; // pass to static file handler
  }

  try {
    // ----------------------------------------------------
    // AUTHENTICATION ROUTES
    // ----------------------------------------------------
    if (pathname === '/api/auth/signup' && req.method === 'POST') {
      return authController.signup(body);
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      return authController.login(body);
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      if (!user) return { status: 401, data: { error: 'Unauthorized or expired session' } };
      return authController.getProfile(user.id);
    }

    if (pathname === '/api/auth/profile' && req.method === 'PUT') {
      if (!user) return { status: 401, data: { error: 'Unauthorized session' } };
      return authController.updateProfile(user.id, body);
    }

    // ----------------------------------------------------
    // PRICING CALCULATION & ENGINE
    // ----------------------------------------------------
    if (pathname === '/api/pricing/calculate' && req.method === 'POST') {
      return pricelistController.calculatePrice(body);
    }

    // ----------------------------------------------------
    // PICKUP & RETURN MANAGEMENT / DISPATCH ROUTES
    // ----------------------------------------------------
    if (pathname === '/api/dispatch/pickups/daily' && req.method === 'GET') {
      const dateFilter = query.date || null;
      return dispatchController.getDailyPickups(dateFilter);
    }

    if (pathname === '/api/dispatch/pickups/optimized-route' && req.method === 'GET') {
      const dateFilter = query.date || null;
      return dispatchController.getOptimizedRoute(dateFilter);
    }

    if (pathname.startsWith('/api/dispatch/pickups/') && pathname.endsWith('/notify') && req.method === 'POST') {
      const rentalId = parseInt(pathname.split('/')[4], 10);
      return dispatchController.notifyCustomerPickup(rentalId);
    }

    if (pathname.startsWith('/api/dispatch/pickups/') && pathname.endsWith('/confirm') && req.method === 'POST') {
      const rentalId = parseInt(pathname.split('/')[4], 10);
      return dispatchController.confirmPickup(rentalId, body);
    }

    if (pathname === '/api/dispatch/returns/daily' && req.method === 'GET') {
      const date = query.get('date');
      return dispatchController.getDailyReturns(date);
    }

    if (pathname.startsWith('/api/dispatch/returns/') && pathname.endsWith('/inspect-confirm') && req.method === 'POST') {
      const rentalId = parseInt(pathname.split('/')[4], 10);
      return dispatchController.confirmReturnInspection(rentalId, body);
    }

    if (pathname === '/api/dispatch/repairs' && req.method === 'GET') {
      return dispatchController.getRepairOrders();
    }

    if (pathname.startsWith('/api/dispatch/repairs/') && pathname.endsWith('/complete') && req.method === 'POST') {
      const repairId = parseInt(pathname.split('/')[4], 10);
      return dispatchController.completeRepairOrder(repairId, body);
    }

    // ----------------------------------------------------
    // AUTOMATED LATE PENALTIES & PENALTY INVOICES
    // ----------------------------------------------------
    if (pathname === '/api/penalties/outstanding' && req.method === 'GET') {
      return penaltyController.getOutstandingPenalties();
    }

    if (pathname.startsWith('/api/penalties/invoice/') && req.method === 'GET') {
      const rentalId = parseInt(pathname.split('/')[4], 10);
      return penaltyController.getPenaltyInvoice(rentalId);
    }

    // ----------------------------------------------------
    // SECURITY DEPOSIT ESCROW ROUTES
    // ----------------------------------------------------
    if (pathname === '/api/deposits' && req.method === 'GET') {
      return depositController.getDepositLedger();
    }

    if (pathname.startsWith('/api/deposits/rental/') && req.method === 'GET') {
      const rentalId = parseInt(pathname.split('/')[4], 10);
      return depositController.getRentalDepositHistory(rentalId);
    }

    // ----------------------------------------------------
    // PRODUCTS, ATTRIBUTES & VARIANTS ROUTES
    // ----------------------------------------------------
    if (pathname === '/api/categories' && req.method === 'GET') {
      return productController.getCategories();
    }

    if (pathname === '/api/products' && req.method === 'GET') {
      const categoryId = query.get('category');
      return productController.getProducts(categoryId);
    }

    if (pathname.startsWith('/api/products/') && !pathname.includes('/variants') && req.method === 'GET') {
      const id = parseInt(pathname.split('/')[3], 10);
      return productController.getProductById(id);
    }

    if (pathname === '/api/products' && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      return productController.createProduct(body);
    }

    if (pathname.startsWith('/api/products/') && !pathname.includes('/variants') && req.method === 'PUT') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const id = parseInt(pathname.split('/')[3], 10);
      return productController.updateProduct(id, body);
    }

    // Product Variants Endpoints
    if (pathname.startsWith('/api/products/') && pathname.endsWith('/variants') && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const productId = parseInt(pathname.split('/')[3], 10);
      return productController.createProductVariant(productId, body);
    }

    if (pathname.startsWith('/api/variants/') && req.method === 'PUT') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const variantId = parseInt(pathname.split('/')[3], 10);
      return productController.updateProductVariant(variantId, body);
    }

    if (pathname.startsWith('/api/variants/') && req.method === 'DELETE') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const variantId = parseInt(pathname.split('/')[3], 10);
      return productController.deleteProductVariant(variantId);
    }

    // ----------------------------------------------------
    // PRICELISTS & RENTAL PERIOD PRESETS
    // ----------------------------------------------------
    if (pathname === '/api/pricelists' && req.method === 'GET') {
      return pricelistController.getPricelists();
    }

    if (pathname.startsWith('/api/pricelists/') && pathname.endsWith('/set-default') && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const id = parseInt(pathname.split('/')[3], 10);
      return pricelistController.setDefaultPricelist(id);
    }

    if (pathname === '/api/pricelists' && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      return pricelistController.createPricelist(body);
    }

    if (pathname.startsWith('/api/pricelists/') && req.method === 'PUT') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const id = parseInt(pathname.split('/')[3], 10);
      return pricelistController.updatePricelist(id, body);
    }

    if (pathname === '/api/rental-presets' && req.method === 'GET') {
      return pricelistController.getRentalPeriodPresets();
    }

    if (pathname === '/api/rental-presets' && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      return pricelistController.createRentalPeriodPreset(body);
    }

    // ----------------------------------------------------
    // USER & CLIENT MANAGEMENT ROUTES
    // ----------------------------------------------------
    if (pathname === '/api/users' && req.method === 'GET') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      return userController.getUsers();
    }

    if (pathname === '/api/users' && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      return userController.createUser(body);
    }

    if (pathname.startsWith('/api/users/') && req.method === 'PUT') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const id = parseInt(pathname.split('/')[3], 10);
      return userController.updateUser(id, body);
    }

    // ----------------------------------------------------
    // OFFLINE QUOTATIONS & CONVERSIONS
    // ----------------------------------------------------
    if (pathname === '/api/quotations' && req.method === 'GET') {
      return quotationController.getQuotations();
    }

    if (pathname.startsWith('/api/quotations/') && req.method === 'GET' && !pathname.endsWith('/convert')) {
      const id = parseInt(pathname.split('/')[3], 10);
      return quotationController.getQuotationById(id);
    }

    if (pathname === '/api/quotations' && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      return quotationController.createQuotation(body);
    }

    if (pathname.startsWith('/api/quotations/') && pathname.endsWith('/convert') && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const id = parseInt(pathname.split('/')[3], 10);
      return quotationController.convertToInvoice(id, body);
    }

    // ----------------------------------------------------
    // RENTALS & ORDERS ROUTES
    // ----------------------------------------------------
    if (pathname === '/api/rentals' && req.method === 'GET') {
      const userId = query.get('userId');
      const status = query.get('status');
      return rentalController.getRentals({ userId, status });
    }

    if (pathname.startsWith('/api/rentals/') && req.method === 'GET') {
      const id = parseInt(pathname.split('/')[3], 10);
      return rentalController.getRentalById(id);
    }

    if (pathname === '/api/rentals/checkout' && req.method === 'POST') {
      return rentalController.createRental(body);
    }

    if (pathname.startsWith('/api/rentals/') && pathname.endsWith('/status') && req.method === 'POST') {
      const id = parseInt(pathname.split('/')[3], 10);
      return rentalController.updateRentalStatus(id, body);
    }

    // Customer / Store Return Hub
    if (pathname.startsWith('/api/rentals/') && pathname.endsWith('/return-store') && req.method === 'POST') {
      const id = parseInt(pathname.split('/')[3], 10);
      return rentalController.processStoreReturn(id, body);
    }

    // Diagnostic Return Inspection Terminal (Admin)
    if (pathname.startsWith('/api/rentals/') && pathname.endsWith('/inspect') && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const id = parseInt(pathname.split('/')[3], 10);
      return rentalController.inspectAndCompleteRental(id, body);
    }

    // ----------------------------------------------------
    // ANALYTICS, FORECASTING & TELEMETRY
    // ----------------------------------------------------
    if (pathname === '/api/analytics' && req.method === 'GET') {
      return analyticsController.getAnalytics();
    }

    if (pathname === '/api/analytics/forecasting' && req.method === 'GET') {
      const horizon = query.horizon || 30;
      return analyticsController.getAvailabilityForecasting(horizon);
    }

    if (pathname === '/api/analytics/kpis' && req.method === 'GET') {
      return analyticsController.getKpiDeepDive();
    }

    if (pathname === '/api/analytics/export-report' && req.method === 'GET') {
      return analyticsController.exportExecutiveReport();
    }

    // ----------------------------------------------------
    // PREDICTIVE MAINTENANCE & VEHICLE TELEMETRY
    // ----------------------------------------------------
    if (pathname === '/api/maintenance/predictive' && req.method === 'GET') {
      return maintenanceController.getPredictiveMaintenanceSuggestions();
    }

    if (pathname.startsWith('/api/maintenance/telemetry/') && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      const productId = parseInt(pathname.split('/')[4], 10);
      return maintenanceController.updateVehicleTelemetry(productId, body);
    }

    // ----------------------------------------------------
    // AUTOMATIC CUSTOMER REMINDERS & COMMUNICATIONS
    // ----------------------------------------------------
    if (pathname === '/api/reminders' && req.method === 'GET') {
      return reminderController.getReminders();
    }

    if (pathname === '/api/reminders/trigger-auto' && req.method === 'POST') {
      const count = reminderController.triggerAutoReminders();
      return { status: 200, data: { message: `Auto reminder engine swept ${count} active bookings.` } };
    }

    if (pathname === '/api/reminders/send-manual' && req.method === 'POST') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      return reminderController.sendManualReminder(body);
    }

    // ----------------------------------------------------
    // SYSTEM CONFIG & SIMULATION TIME MACHINE
    // ----------------------------------------------------
    if (pathname === '/api/config' && req.method === 'GET') {
      return configController.getConfig();
    }

    if (pathname === '/api/config' && req.method === 'PUT') {
      if (!user || user.role !== 'admin') return { status: 403, data: { error: 'Admin role required' } };
      return configController.updateConfig(body);
    }

    if (pathname === '/api/config/simulate-time' && req.method === 'POST') {
      return configController.simulateDaysOffset(body.days_offset);
    }

    // API route not found
    return { status: 404, data: { error: 'API route not found' } };
  } catch (err) {
    console.error('API Router Exception:', err);
    return { status: 500, data: { error: 'Internal Server Error: ' + err.message } };
  }
}

module.exports = {
  handleApiRequest
};
