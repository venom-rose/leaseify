// app.js - Full-Stack Client Logic with Rental Flow, Invoices, Store Return & Escrow Settlement

class LeaseifyApp {
  constructor() {
    this.apiBase = '/api';
    this.token = localStorage.getItem('leaseify_jwt_token') || null;
    this.currentUser = null;
    this.currentView = 'splash';

    // State data
    this.products = [];
    this.categories = [];
    this.rentals = [];
    this.analytics = null;
    this.config = null;
    this.selectedCategory = 'all';
    this.currentFilterStatus = 'ALL';

    // Cart & Checkout State
    this.cartProduct = null;
    this.checkoutStep = 1;
    this.fulfillmentType = 'PICKUP'; // 'PICKUP' | 'DELIVERY'
    this.paymentMethod = 'CREDIT_CARD'; // 'CREDIT_CARD' | 'APPLE_PAY' | 'CRYPTO'

    this.activeInspectionRental = null;

    this.init();
  }

  async init() {
    await this.fetchConfig();
    await this.fetchCategories();
    await this.fetchProducts();

    // Check existing JWT authentication session
    const isAuthenticated = await this.verifyCurrentSession();

    if (isAuthenticated) {
      this.showAppLayout();
      if (this.currentUser.role === 'admin') {
        this.navigate('admin');
      } else {
        this.navigate('store');
      }
      await this.fetchRentals();
      await this.fetchAnalytics();
    } else {
      this.showSplashScreen();
    }

    this.setupDatePickers();
    this.initFloatingBookingBar();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // ==========================================
  // JWT AUTHENTICATION & SESSION MANAGEMENT
  // ==========================================
  async verifyCurrentSession() {
    if (!this.token) return false;

    try {
      const res = await fetch(`${this.apiBase}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (res.ok) {
        this.currentUser = await res.json();
        this.updateUserUI();
        return true;
      } else {
        this.token = null;
        localStorage.removeItem('leaseify_jwt_token');
        return false;
      }
    } catch (err) {
      console.error('Session validation error:', err);
      return false;
    }
  }

  showSplashScreen() {
    this.currentView = 'splash';
    document.getElementById('view-splash').style.display = 'flex';
    document.getElementById('main-navbar').style.display = 'none';
    document.getElementById('main-container').style.display = 'none';
    if (window.lucide) window.lucide.createIcons();
  }

  showAppLayout() {
    document.getElementById('view-splash').style.display = 'none';
    document.getElementById('main-navbar').style.display = 'flex';
    document.getElementById('main-container').style.display = 'block';
  }

  continueAsGuest() {
    this.currentUser = {
      id: 0,
      name: 'Guest Explorer',
      email: 'guest@leaseify.io',
      role: 'customer',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      membership_tier: 'Guest'
    };
    this.showAppLayout();
    this.updateUserUI();
    this.navigate('store');
    this.showToast('Welcome to Leaseify Fleet Showroom as Guest.', 'info');
  }

  showAuthModal(type = 'login') {
    if (type === 'login') {
      this.closeModal('signup-modal');
      this.openModal('login-modal');
    } else {
      this.closeModal('login-modal');
      this.openModal('signup-modal');
    }
  }

  switchAuthModal(type) {
    this.showAuthModal(type);
  }

  fillDemoCredentials(role) {
    if (role === 'admin') {
      document.getElementById('login-email').value = 'admin@leaseify.io';
      document.getElementById('login-password').value = 'admin123';
      this.showToast('Admin demo credentials populated.', 'info');
    } else {
      document.getElementById('login-email').value = 'alex.rivera@example.com';
      document.getElementById('login-password').value = 'user123';
      this.showToast('Client demo credentials populated.', 'info');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const btn = document.getElementById('btn-login-submit');
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader"></i> Authenticating...`;

    try {
      const res = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        this.token = data.token;
        this.currentUser = data.user;
        localStorage.setItem('leaseify_jwt_token', this.token);

        this.closeModal('login-modal');
        this.showAppLayout();
        this.updateUserUI();

        await this.fetchRentals();
        await this.fetchAnalytics();

        if (this.currentUser.role === 'admin') {
          this.navigate('admin');
          this.showToast(`Welcome Fleet Director ${this.currentUser.name}!`, 'success');
        } else {
          this.navigate('store');
          this.showToast(`Welcome back, ${this.currentUser.name}!`, 'success');
        }
      } else {
        this.showToast(data.error || 'Authentication failed', 'error');
      }
    } catch (err) {
      this.showToast('Connection error during login: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="log-in"></i> Sign In to Dashboard`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const address = document.getElementById('signup-address').value.trim();
    const avatar = document.getElementById('signup-avatar').value.trim();

    const btn = document.getElementById('btn-signup-submit');
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader"></i> Creating Profile...`;

    try {
      const res = await fetch(`${this.apiBase}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, address, avatar })
      });

      const data = await res.json();

      if (res.ok) {
        this.token = data.token;
        this.currentUser = data.user;
        localStorage.setItem('leaseify_jwt_token', this.token);

        this.closeModal('signup-modal');
        this.showAppLayout();
        this.updateUserUI();

        await this.fetchRentals();
        await this.fetchAnalytics();

        this.navigate('store');
        this.showToast(`Welcome to Leaseify, ${this.currentUser.name}! Profile created.`, 'success');
      } else {
        this.showToast(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      this.showToast('Error during registration: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="user-check"></i> Register & Enter Showroom`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    this.cartProduct = null;
    this.updateCartBadge();
    localStorage.removeItem('leaseify_jwt_token');
    this.closeModal('profile-modal');
    this.showSplashScreen();
    this.showToast('You have been securely signed out.', 'info');
  }

  // Profile Management
  openProfileModal() {
    if (!this.currentUser || this.currentUser.id === 0) {
      this.showAuthModal('login');
      return;
    }

    const u = this.currentUser;
    document.getElementById('prof-img-preview').src = u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
    document.getElementById('prof-name-title').innerText = u.name;
    document.getElementById('prof-tier-badge').innerText = u.membership_tier || (u.role === 'admin' ? 'Executive Admin' : 'Standard Driver');
    document.getElementById('prof-email-sub').innerText = u.email;

    document.getElementById('prof-name').value = u.name;
    document.getElementById('prof-email').value = u.email;
    document.getElementById('prof-address').value = u.address || '';
    document.getElementById('prof-avatar').value = u.avatar || '';

    this.openModal('profile-modal');
  }

  async handleProfileUpdate(e) {
    e.preventDefault();
    if (!this.currentUser || !this.token) return;

    const payload = {
      name: document.getElementById('prof-name').value.trim(),
      address: document.getElementById('prof-address').value.trim(),
      avatar: document.getElementById('prof-avatar').value.trim()
    };

    try {
      const res = await fetch(`${this.apiBase}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        this.currentUser = data.user;
        this.updateUserUI();
        this.closeModal('profile-modal');
        this.showToast('Profile & delivery address updated successfully!', 'success');
      } else {
        this.showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      this.showToast('Error updating profile', 'error');
    }
  }

  // ==========================================
  // API Fetch Helpers
  // ==========================================
  async fetchConfig() {
    try {
      const res = await fetch(`${this.apiBase}/config`);
      this.config = await res.json();
      this.updateSimulatedTimeBadge();
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  }

  async fetchCategories() {
    try {
      const res = await fetch(`${this.apiBase}/categories`);
      this.categories = await res.json();
      this.renderCategoryPills();
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }

  async fetchProducts() {
    try {
      const res = await fetch(`${this.apiBase}/products`);
      this.products = await res.json();
      this.renderProducts();
      this.renderInventoryTable();
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }

  async fetchRentals() {
    try {
      const res = await fetch(`${this.apiBase}/rentals`);
      this.rentals = await res.json();
      this.updateCustomerRentalsCount();
      this.renderCustomerRentals();
      this.renderAdminOrdersTable();
    } catch (err) {
      console.error('Error fetching rentals:', err);
    }
  }

  async fetchAnalytics() {
    try {
      const res = await fetch(`${this.apiBase}/analytics`);
      this.analytics = await res.json();
      this.renderAdminDashboard();
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  }

  // ==========================================
  // RENTAL FLOW STEPS (1 TO 7): CART & CHECKOUT
  // ==========================================

  // Step 2 & 3: Select Product & Choose Period
  openBookingModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.cartProduct = product;
    this.updateCartBadge();

    // Populate Cart Modal Step 1
    const pBox = document.getElementById('cart-product-summary');
    if (pBox) {
      pBox.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="cart-hero-img">
        <div style="flex: 1;">
          <span style="font-size: 0.725rem; color: var(--gold); font-weight: 800; text-transform: uppercase;">${product.category_name || product.category_id}</span>
          <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.35rem; margin: 0.2rem 0;">${product.name}</h3>
          <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            <span>Daily Rate: <strong style="color: var(--gold);">$${product.daily_rate.toFixed(2)}/day</strong></span>
            <span>Security Deposit: <strong style="color: var(--amber);">$${product.deposit_amount.toFixed(2)}</strong></span>
          </div>
        </div>
      `;
    }

    const barStart = document.getElementById('bar-pickup-date')?.value;
    const barEnd = document.getElementById('bar-return-date')?.value;

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    const fmt = (d) => d.toISOString().split('T')[0];

    document.getElementById('cart-start-date').value = barStart || fmt(start);
    document.getElementById('cart-end-date').value = barEnd || fmt(end);

    // Pre-populate address from user profile
    if (this.currentUser && this.currentUser.address) {
      const streetInput = document.getElementById('deliv-street');
      if (streetInput && !streetInput.value) {
        streetInput.value = this.currentUser.address;
      }
    }

    this.goToCheckoutStep(1);
    this.recalculateCartPricing();
    this.openModal('cart-modal');
  }

  openCartModal() {
    if (!this.cartProduct) {
      if (this.products.length > 0) {
        this.openBookingModal(this.products[0].id);
      } else {
        this.showToast('Please browse products and select a vehicle to rent.', 'info');
      }
      return;
    }
    this.openModal('cart-modal');
  }

  updateCartBadge() {
    const badge = document.getElementById('nav-cart-count');
    if (badge) {
      badge.innerText = this.cartProduct ? '1' : '0';
    }
  }

  goToCheckoutStep(step) {
    if (step > 1 && (!this.currentUser || this.currentUser.id === 0)) {
      this.showToast('Please sign in or create an account to proceed with checkout', 'info');
      this.showAuthModal('login');
      return;
    }

    this.checkoutStep = step;

    // Update Stepper Nodes
    for (let i = 1; i <= 3; i++) {
      const node = document.getElementById(`step-node-${i}`);
      const content = document.getElementById(`checkout-step-${i}`);
      const line = document.getElementById(`step-line-${i}`);

      if (node) node.classList.toggle('active', i <= step);
      if (content) content.classList.toggle('active', i === step);
      if (line) line.classList.toggle('active', i < step);
    }

    this.recalculateCartPricing();
    if (window.lucide) window.lucide.createIcons();
  }

  setFulfillmentType(type) {
    this.fulfillmentType = type;

    const pickupCard = document.getElementById('opt-pickup-card');
    const delivCard = document.getElementById('opt-delivery-card');
    const delivForm = document.getElementById('delivery-address-form');

    if (pickupCard) pickupCard.classList.toggle('active', type === 'PICKUP');
    if (delivCard) delivCard.classList.toggle('active', type === 'DELIVERY');
    if (delivForm) delivForm.style.display = type === 'DELIVERY' ? 'block' : 'none';

    const rPickup = document.getElementById('radio-pickup');
    const rDeliv = document.getElementById('radio-delivery');
    if (rPickup) rPickup.checked = (type === 'PICKUP');
    if (rDeliv) rDeliv.checked = (type === 'DELIVERY');

    this.recalculateCartPricing();
  }

  setPaymentMethod(method) {
    this.paymentMethod = method;
    document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));

    const tab = document.getElementById(`pay-tab-${method === 'CREDIT_CARD' ? 'card' : method === 'APPLE_PAY' ? 'apple' : 'wire'}`);
    if (tab) tab.classList.add('active');

    const cardBox = document.getElementById('card-inputs-box');
    if (cardBox) {
      cardBox.style.display = method === 'CREDIT_CARD' ? 'block' : 'none';
    }
  }

  recalculateCartPricing() {
    if (!this.cartProduct) return;

    const startVal = document.getElementById('cart-start-date')?.value;
    const endVal = document.getElementById('cart-end-date')?.value;

    if (!startVal || !endVal) return;

    const start = new Date(startVal);
    const end = new Date(endVal);

    if (end < start) {
      this.showToast('Return date cannot be earlier than pick-up date', 'error');
      return;
    }

    const diffMs = end.getTime() - start.getTime();
    const durationDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    let baseFee = 0;
    const p = this.cartProduct;

    if (durationDays >= 7 && p.weekly_rate > 0) {
      const weeks = Math.floor(durationDays / 7);
      const remDays = durationDays % 7;
      baseFee = (weeks * p.weekly_rate) + (remDays * p.daily_rate);
    } else {
      baseFee = durationDays * p.daily_rate;
    }

    const deposit = p.deposit_amount;
    const deliveryFee = this.fulfillmentType === 'DELIVERY' ? 150.0 : 0.0;
    const totalDue = baseFee + deposit + deliveryFee;

    const durEl = document.getElementById('cart-ledger-duration');
    const baseEl = document.getElementById('cart-ledger-base');
    const delivEl = document.getElementById('cart-ledger-deliv');
    const depEl = document.getElementById('cart-ledger-deposit');
    const totEl = document.getElementById('cart-ledger-total');

    if (durEl) durEl.innerText = `${durationDays} Day(s) ${durationDays >= 7 ? '(VIP Weekly Rate)' : ''}`;
    if (baseEl) baseEl.innerText = `$${baseFee.toFixed(2)}`;
    if (delivEl) delivEl.innerText = `$${deliveryFee.toFixed(2)} (${this.fulfillmentType === 'DELIVERY' ? 'Flatbed Transporter' : 'Store Pickup'})`;
    if (depEl) depEl.innerText = `$${deposit.toFixed(2)}`;
    if (totEl) totEl.innerText = `$${totalDue.toFixed(2)}`;
  }

  // Step 6 & 7: Execute Payment & Generate Invoice
  async executePaymentCheckout() {
    if (!this.cartProduct || !this.currentUser) return;

    const startVal = document.getElementById('cart-start-date').value;
    const endVal = document.getElementById('cart-end-date').value;
    const tripNotes = document.getElementById('cart-trip-notes').value;

    let address = 'Leaseify Executive Lounge, 850 Sunset Blvd, West Hollywood';
    if (this.fulfillmentType === 'DELIVERY') {
      const street = document.getElementById('deliv-street').value;
      const city = document.getElementById('deliv-city').value;
      const state = document.getElementById('deliv-state').value;
      address = `${street}, ${city}, ${state}`.trim();

      if (!street) {
        this.showToast('Please enter your delivery street address', 'error');
        this.goToCheckoutStep(2);
        return;
      }
    }

    const btn = document.getElementById('btn-pay-confirm');
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader"></i> Processing Secure Escrow Payment...`;

    try {
      const payload = {
        user_id: this.currentUser.id,
        product_id: this.cartProduct.id,
        start_date: startVal,
        end_date: endVal,
        fulfillment_type: this.fulfillmentType,
        delivery_address: address,
        payment_method: this.paymentMethod,
        customer_notes: tripNotes
      };

      const res = await fetch(`${this.apiBase}/rentals/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        this.closeModal('cart-modal');
        this.cartProduct = null;
        this.updateCartBadge();
        this.showToast(`Payment of $${data.total_paid.toFixed(2)} Confirmed! Invoice ${data.invoice_number} generated.`, 'success');

        await this.fetchProducts();
        await this.fetchRentals();
        await this.fetchAnalytics();

        this.renderProducts();
        this.renderCustomerRentals();

        // Display Generated Official Tax Invoice
        this.showInvoice(data.rental.id);
      } else {
        this.showToast(data.error || 'Payment failed', 'error');
      }
    } catch (err) {
      this.showToast('Error during payment processing: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="lock"></i> Pay & Confirm Reservation`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // ==========================================
  // INVOICE VIEWER & DOWNLOAD/PRINT (STEP 7)
  // ==========================================
  async showInvoice(rentalId) {
    try {
      const res = await fetch(`${this.apiBase}/rentals/${rentalId}`);
      if (!res.ok) throw new Error('Invoice not found');
      const r = await res.json();

      const invTitle = document.getElementById('inv-header-title');
      if (invTitle) invTitle.innerText = `Invoice #${r.invoice_number || r.rental_code}`;

      const totalPaid = r.base_rental_fee + r.deposit_amount + (r.delivery_fee || 0);

      const html = `
        <div class="printable-invoice-body">
          <div class="invoice-header-grid">
            <div class="inv-brand-box">
              <h2>LEASEIFY<span style="color: var(--gold);">.FLEET</span></h2>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                Leaseify Premier Automotive Inc.<br>
                850 Sunset Blvd, West Hollywood, CA 90069<br>
                Tax ID: US-94-8832104 • concierge@leaseify.io
              </p>
            </div>
            <div class="inv-meta-box">
              <div class="inv-number">${r.invoice_number || `INV-2026-${r.id}`}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">Order Code: <strong>${r.rental_code}</strong></div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Issue Date: ${r.paid_at || r.created_at}</div>
              <div style="margin-top: 0.35rem;">
                <span class="badge-soft badge-gold">Payment Status: PAID & SECURED</span>
              </div>
            </div>
          </div>

          <div class="inv-client-vehicle-grid">
            <div>
              <div class="inv-section-title">Billed & Registered To:</div>
              <strong style="color: #fff; font-size: 1.05rem;">${r.user_name}</strong>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${r.user_email}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">${r.user_phone || '+1 (555) 876-5432'}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.35rem;">
                Fulfillment Address: <strong style="color: #fff;">${r.delivery_address || 'Store Hub Pickup'}</strong>
              </div>
            </div>

            <div>
              <div class="inv-section-title">Vehicle Telemetry Specs:</div>
              <strong style="color: #fff; font-size: 1.05rem;">${r.product_name}</strong>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">Brand/Model: ${r.product_brand} • Serial: ${r.product_serial || 'VIN-AUTO'}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Rental Window: <strong>${r.start_date}</strong> to <strong>${r.end_date}</strong> (${r.duration_days} days)</div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">Handover Option: <span class="text-gold">${r.fulfillment_type === 'DELIVERY' ? 'White-Glove Flatbed Delivery' : 'VIP Store Pickup'}</span></div>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Rate / Period</th>
                <th>Qty</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${r.product_name} — Vehicle Rental</strong>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">Scheduled Duration: ${r.start_date} &rarr; ${r.end_date}</div>
                </td>
                <td>$${r.daily_rate.toFixed(2)} / day</td>
                <td>${r.duration_days} Days</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">$${r.base_rental_fee.toFixed(2)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Handover & Logistics (${r.fulfillment_type})</strong>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">${r.delivery_address}</div>
                </td>
                <td>${r.delivery_fee > 0 ? '$150.00 Flat' : 'Complimentary'}</td>
                <td>1</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">$${(r.delivery_fee || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Security Deposit Escrow (100% Refundable)</strong>
                  <div style="font-size: 0.75rem; color: var(--emerald);">Held in isolated escrow account. Released upon vehicle return.</div>
                </td>
                <td>Escrow Lock</td>
                <td>1</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--amber);">$${r.deposit_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div class="inv-escrow-guarantee">
              <i data-lucide="shield-check" style="width: 28px; height: 28px; color: var(--emerald); flex-shrink: 0;"></i>
              <div>
                <strong>Deposit Escrow Guarantee:</strong><br>
                <span>Upon returning the vehicle at our store lounge on time, your $${r.deposit_amount.toFixed(2)} security deposit is automatically refunded in full to your payment card.</span>
              </div>
            </div>

            <div class="invoice-totals-box">
              <div class="ledger-row">
                <span class="ledger-lbl">Subtotal Rental:</span>
                <span class="ledger-val">$${r.base_rental_fee.toFixed(2)}</span>
              </div>
              <div class="ledger-row">
                <span class="ledger-lbl">Logistics / Delivery:</span>
                <span class="ledger-val">$${(r.delivery_fee || 0).toFixed(2)}</span>
              </div>
              <div class="ledger-row">
                <span class="ledger-lbl text-amber">Security Escrow Deposit:</span>
                <span class="ledger-val text-amber">$${r.deposit_amount.toFixed(2)}</span>
              </div>
              <div class="ledger-divider"></div>
              <div class="ledger-row ledger-total">
                <span>Total Amount Paid:</span>
                <span class="total-amount text-gold">$${totalPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('printable-invoice-content').innerHTML = html;
      this.openModal('invoice-modal');
    } catch (err) {
      this.showToast('Could not load invoice: ' + err.message, 'error');
    }
  }

  // ==========================================
  // STORE RETURN FLOW (ON-TIME VS LATE ESCROW SETTLEMENT)
  // ==========================================
  openStoreReturnModal(rentalId) {
    const r = this.rentals.find(item => item.id === rentalId);
    if (!r) return;

    // Determine on-time vs late based on simulated time
    const config = this.config || { simulated_days_offset: 0, late_fee_daily_multiplier: 1.5 };
    const offset = config.simulated_days_offset || 0;
    const now = new Date();
    now.setDate(now.getDate() + offset);

    const end = new Date(r.end_date + 'T23:59:59');
    const isLate = now.getTime() > end.getTime();

    let lateDays = 0;
    let lateFee = 0;

    if (isLate) {
      const diffMs = now.getTime() - end.getTime();
      lateDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      lateFee = Math.round(lateDays * (r.daily_rate * (config.late_fee_daily_multiplier || 1.5)) * 100) / 100;
    }

    const deposit = r.deposit_amount;
    const netRefund = Math.max(0, deposit - lateFee);

    const html = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; gap: 1rem; align-items: center; background: rgba(10, 14, 23, 0.6); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <img src="${r.product_image}" style="width: 100px; height: 68px; object-fit: cover; border-radius: 6px;">
          <div>
            <span class="cust-rental-code">${r.rental_code}</span>
            <h4 style="color: #fff; font-size: 1.15rem; margin: 0.15rem 0;">${r.product_name}</h4>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Scheduled Return Date: <strong>${r.end_date}</strong></span>
          </div>
        </div>

        <div style="background: ${isLate ? 'var(--rose-bg)' : 'var(--emerald-bg)'}; border: 1px solid ${isLate ? 'var(--rose-border)' : 'var(--emerald-border)'}; border-radius: var(--radius-md); padding: 1.15rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: ${isLate ? 'var(--rose)' : 'var(--emerald)'}; font-weight: 800; font-size: 0.95rem; margin-bottom: 0.35rem;">
            <i data-lucide="${isLate ? 'alert-triangle' : 'check-circle'}"></i>
            <span>${isLate ? `Late Return Detected (${lateDays} Day(s) Overdue)` : 'On-Time Return at Store Hub!'}</span>
          </div>
          <p style="font-size: 0.825rem; color: ${isLate ? '#fecdd3' : '#a7f3d0'}; line-height: 1.4;">
            ${isLate ? `Your scheduled return was on ${r.end_date}. Under our policy, a late penalty of $${lateFee.toFixed(2)} will be deducted from your escrow deposit.` : `Thank you for returning on time! 100% of your $${deposit.toFixed(2)} security deposit is eligible for immediate refund.`}
          </p>
        </div>

        <div class="settlement-reconciliation-card" style="margin: 0;">
          <h5>Escrow Settlement Breakdown</h5>
          <div class="settle-row">
            <span>Original Security Deposit Held:</span>
            <span>$${deposit.toFixed(2)}</span>
          </div>
          ${isLate ? `
            <div class="settle-row text-rose">
              <span>Late Return Penalty (${lateDays}d × 1.5x):</span>
              <span>-$${lateFee.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="settle-divider"></div>
          <div class="settle-row settle-final">
            <span>Net Escrow Refund to Your Card:</span>
            <span class="refund-badge" style="color: ${isLate ? 'var(--amber)' : 'var(--emerald)'};">$${netRefund.toFixed(2)}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="return-notes-input">Driver Return Feedback (Optional)</label>
          <input type="text" id="return-notes-input" class="form-input" placeholder="e.g. Tank full, returned at West Hollywood Lounge bay 01...">
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal('return-store-modal')">Cancel</button>
          <button type="button" class="btn btn-gold" onclick="app.submitStoreReturn(${r.id})">
            <i data-lucide="check-check"></i> Complete Store Return & Release Escrow
          </button>
        </div>
      </div>
    `;

    document.getElementById('return-store-content').innerHTML = html;
    this.openModal('return-store-modal');
  }

  async submitStoreReturn(rentalId) {
    const notes = document.getElementById('return-notes-input')?.value || '';
    try {
      const res = await fetch(`${this.apiBase}/rentals/${rentalId}/return-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          return_notes: notes,
          inspector_name: this.currentUser ? this.currentUser.name : 'Store Concierge'
        })
      });

      const data = await res.json();
      if (res.ok) {
        this.closeModal('return-store-modal');
        this.showToast(data.message, data.is_late ? 'info' : 'success');

        await this.fetchProducts();
        await this.fetchRentals();
        await this.fetchAnalytics();

        this.renderProducts();
        this.renderCustomerRentals();
      } else {
        this.showToast(data.error || 'Failed to complete store return', 'error');
      }
    } catch (err) {
      this.showToast('Error during store return: ' + err.message, 'error');
    }
  }

  // ==========================================
  // VIEW 2: CUSTOMER DASHBOARD ("MY BOOKINGS")
  // ==========================================
  updateCustomerRentalsCount() {
    const countEl = document.getElementById('my-rentals-count');
    if (!countEl || !this.currentUser) return;
    const myRentals = this.rentals.filter(r => r.user_id === this.currentUser.id && r.status !== 'CANCELLED');
    countEl.innerText = myRentals.length;
  }

  renderCustomerRentals() {
    const container = document.getElementById('customer-rentals-list');
    if (!container) return;

    const myRentals = this.currentUser ? this.rentals.filter(r => r.user_id === this.currentUser.id) : [];

    const activeCount = myRentals.filter(r => r.status === 'ACTIVE' || r.status === 'READY_FOR_PICKUP' || r.status === 'PENDING_APPROVAL').length;
    const escrowHeld = myRentals.filter(r => r.deposit_status === 'HELD').reduce((sum, r) => sum + r.deposit_amount, 0);
    const refunded = myRentals.reduce((sum, r) => sum + (r.deposit_refunded_amount || 0), 0);

    const activeEl = document.getElementById('cust-active-count');
    const heldEl = document.getElementById('cust-escrow-held');
    const refEl = document.getElementById('cust-refunded-deposits');

    if (activeEl) activeEl.innerText = activeCount;
    if (heldEl) heldEl.innerText = `$${escrowHeld.toFixed(2)}`;
    if (refEl) refEl.innerText = `$${refunded.toFixed(2)}`;

    if (myRentals.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 4rem 2rem;">
          <i data-lucide="car" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 1rem;"></i>
          <h3 style="color: #fff; font-size: 1.25rem;">No Active Vehicle Reservations</h3>
          <p style="color: var(--text-muted); margin-top: 0.5rem; margin-bottom: 1.5rem;">Explore our showroom of luxury supercars and electric GTs.</p>
          <button class="btn btn-gold" onclick="app.navigate('store')">
            <i data-lucide="compass"></i> Explore Showroom
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = myRentals.map(r => {
      const statusBadge = this.getStatusBadgeHtml(r.status);
      const isOverdue = r.status === 'OVERDUE';
      const totalPaid = r.base_rental_fee + r.deposit_amount + (r.delivery_fee || 0);

      return `
        <div class="customer-rental-card ${isOverdue ? 'border-danger-subtle' : ''}">
          <img src="${r.product_image}" alt="${r.product_name}" class="cust-card-img" onerror="this.src='https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200'">
          
          <div class="cust-card-info">
            <div class="cust-card-top">
              <span class="cust-rental-code">${r.rental_code}</span>
              ${statusBadge}
              <span style="font-size: 0.75rem; color: var(--text-dim); margin-left: auto;">${r.fulfillment_type === 'DELIVERY' ? '🚚 Home Delivery' : '🏢 Store Pickup'}</span>
            </div>

            <h3 class="cust-prod-name">${r.product_name}</h3>
            
            <div class="cust-dates-box">
              <i data-lucide="calendar"></i>
              <span>${r.start_date} &rarr; <strong>${r.end_date}</strong> (${r.duration_days} days)</span>
            </div>

            ${isOverdue ? `
              <div style="color: var(--rose); font-size: 0.8rem; font-weight: 700; margin-top: 0.4rem; display: flex; align-items: center; gap: 0.35rem;">
                <i data-lucide="alert-circle" style="width: 14px; height: 14px;"></i>
                <span>Vehicle Past Due (${r.late_days_count} day(s)). Accrued late fee: $${r.late_penalty_fee.toFixed(2)}</span>
              </div>
            ` : ''}

            <!-- Payment & Escrow Breakdown Strip -->
            <div style="display: flex; flex-wrap: wrap; gap: 1.25rem; font-size: 0.825rem; margin-top: 0.65rem; color: var(--text-muted); background: rgba(0,0,0,0.25); padding: 0.5rem 0.75rem; border-radius: 6px;">
              <span>Rental: <strong style="color: #fff;">$${r.base_rental_fee.toFixed(2)}</strong></span>
              <span>Deposit Escrow: <strong style="color: var(--amber);">$${r.deposit_amount.toFixed(2)} (${r.deposit_status})</strong></span>
              ${r.delivery_fee > 0 ? `<span>Delivery: <strong>$${r.delivery_fee.toFixed(2)}</strong></span>` : ''}
              <span>Total Paid: <strong style="color: var(--gold);">$${totalPaid.toFixed(2)}</strong></span>
              ${r.deposit_refunded_amount > 0 ? `<span>Refunded: <strong style="color: var(--emerald);">$${r.deposit_refunded_amount.toFixed(2)}</strong></span>` : ''}
            </div>
          </div>

          <div class="cust-card-actions">
            <!-- Download Invoice Action -->
            <button class="btn btn-gold btn-sm" onclick="app.showInvoice(${r.id})">
              <i data-lucide="file-text"></i> View / Download Invoice
            </button>

            <!-- Store Return Action -->
            ${(r.status === 'ACTIVE' || r.status === 'OVERDUE' || r.status === 'READY_FOR_PICKUP') ? `
              <button class="btn btn-emerald btn-sm" onclick="app.openStoreReturnModal(${r.id})">
                <i data-lucide="arrow-down-left"></i> Return at Store Hub
              </button>
            ` : ''}

            ${r.status === 'READY_FOR_PICKUP' ? `
              <button class="btn btn-secondary btn-sm" onclick="app.showInvoice(${r.id})">
                <i data-lucide="qr-code"></i> Show VIP Pass
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // VIEW 1: FLEET SHOWROOM & CATALOG
  // ==========================================
  renderCategoryPills() {
    const container = document.getElementById('category-pills-container');
    if (!container) return;

    let html = `
      <button class="cat-pill ${this.selectedCategory === 'all' ? 'active' : ''}" onclick="app.selectCategory('all')">
        <i data-lucide="grid"></i> All Fleet (${this.products.length})
      </button>
    `;

    for (const cat of this.categories) {
      const count = this.products.filter(p => p.category_id === cat.id).length;
      html += `
        <button class="cat-pill ${this.selectedCategory === cat.id ? 'active' : ''}" onclick="app.selectCategory('${cat.id}')">
          <i data-lucide="${cat.icon || 'car'}"></i> ${cat.name} (${count})
        </button>
      `;
    }

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  selectCategory(catId) {
    this.selectedCategory = catId;
    const barSelect = document.getElementById('bar-category-select');
    if (barSelect) barSelect.value = catId;
    this.renderCategoryPills();
    this.filterProducts();
  }

  filterProducts() {
    let filtered = this.products.filter(p => {
      const matchesCat = this.selectedCategory === 'all' || p.category_id === this.selectedCategory;
      return matchesCat;
    });

    this.renderProducts(filtered);
  }

  renderProducts(list = this.products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
          <i data-lucide="car" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 1rem;"></i>
          <h3 style="color: #fff; font-size: 1.25rem;">No Vehicles Found in Category</h3>
          <p style="color: var(--text-muted); margin-top: 0.5rem;">Select another category or view all vehicles.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    grid.innerHTML = list.map(p => {
      const isAvailable = p.available_stock > 0;

      return `
        <div class="fleet-card">
          <div class="fleet-img-wrapper">
            <img src="${p.image}" alt="${p.name}" class="fleet-card-img" onerror="this.src='https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200'">
            <span class="fleet-stock-badge ${isAvailable ? 'stock-in' : 'stock-out'}">
              ${isAvailable ? `${p.available_stock} Available` : 'Reserved'}
            </span>
          </div>

          <div class="fleet-card-body">
            <div class="fleet-brand-model">
              <span class="fleet-cat-tag">${p.category_name || p.category_id}</span>
              <span style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">${p.brand}</span>
            </div>

            <h3 class="fleet-car-name">${p.name}</h3>

            <!-- Telemetry specs strip -->
            <div class="fleet-specs-strip">
              <div>
                <div class="spec-mini-val">${p.acceleration || '3.2s'}</div>
                <div class="spec-mini-lbl">0-100 KM/H</div>
              </div>
              <div>
                <div class="spec-mini-val">${p.top_speed || '300 KM/H'}</div>
                <div class="spec-mini-lbl">TOP SPEED</div>
              </div>
              <div>
                <div class="spec-mini-val">${p.horsepower || '500 HP'}</div>
                <div class="spec-mini-lbl">POWER</div>
              </div>
            </div>

            <div class="fleet-card-footer">
              <div class="fleet-price-box">
                <span class="fleet-daily-price">$${p.daily_rate.toFixed(2)} <span class="per-day">/ day</span></span>
                <span class="fleet-deposit-req">+$${p.deposit_amount.toFixed(2)} Escrow Deposit</span>
              </div>

              <button class="btn btn-gold btn-sm" ${!isAvailable ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} onclick="app.openBookingModal(${p.id})">
                <i data-lucide="key"></i> Rent Car
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // NAVIGATION & ADMIN HELPERS
  // ==========================================
  navigate(viewId) {
    if ((viewId === 'admin' || viewId === 'inventory' || viewId === 'settings') && (!this.currentUser || this.currentUser.role !== 'admin')) {
      this.showToast('Access Restricted: Fleet Operations Hub is for authorized Administrators only.', 'error');
      this.showAuthModal('login');
      return;
    }

    this.currentView = viewId;
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    const viewEl = document.getElementById(`view-${viewId}`);
    const navEl = document.getElementById(`nav-${viewId}`);

    if (viewEl) viewEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    if (viewId === 'store') {
      this.renderProducts();
    } else if (viewId === 'my-rentals') {
      this.renderCustomerRentals();
    } else if (viewId === 'admin') {
      this.fetchAnalytics().then(() => {
        this.fetchRentals().then(() => this.renderAdminDashboard());
      });
    } else if (viewId === 'inventory') {
      this.fetchProducts().then(() => this.renderInventoryTable());
    } else if (viewId === 'settings') {
      this.fetchConfig().then(() => this.populateSettingsForm());
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  updateUserUI() {
    if (!this.currentUser) return;

    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name-display');
    const tierEl = document.getElementById('user-tier-display');
    const roleBadgeText = document.getElementById('nav-role-text');

    if (avatarEl) avatarEl.src = this.currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
    if (nameEl) nameEl.innerText = this.currentUser.name;
    if (tierEl) tierEl.innerText = this.currentUser.membership_tier || (this.currentUser.role === 'admin' ? 'Fleet Director' : 'VIP Member');

    if (roleBadgeText) {
      roleBadgeText.innerText = this.currentUser.role === 'admin' ? 'Fleet Director (Admin)' : 'Client Portal';
    }

    const adminLinks = document.querySelectorAll('.admin-only');
    adminLinks.forEach(el => {
      el.style.display = this.currentUser.role === 'admin' ? 'flex' : 'none';
    });
  }

  updateSimulatedTimeBadge() {
    const timeDisplay = document.getElementById('simulated-time-display');
    if (!timeDisplay || !this.config) return;

    const offset = this.config.simulated_days_offset || 0;
    if (offset === 0) {
      timeDisplay.innerText = 'Today (Live)';
      timeDisplay.parentElement.style.color = '#f59e0b';
    } else {
      timeDisplay.innerText = `+${offset}d Fast-Fwd`;
      timeDisplay.parentElement.style.color = '#f43f5e';
    }
  }

  async simulateTimeOffset(days) {
    try {
      const res = await fetch(`${this.apiBase}/config/simulate-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days_offset: days })
      });
      const data = await res.json();
      this.config = data.config;
      this.updateSimulatedTimeBadge();

      await this.fetchRentals();
      await this.fetchAnalytics();

      this.renderAdminDashboard();
      this.renderCustomerRentals();

      this.showToast(data.message, days > 0 ? 'info' : 'success');
    } catch (err) {
      this.showToast('Failed to adjust simulation time', 'error');
    }
  }

  setHeroColor(colorHex, imgUrl, colorName) {
    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
    if (event && event.target) {
      event.target.classList.add('active');
    }

    const img = document.getElementById('spotlight-car-img');
    const box = document.getElementById('spotlight-img-box');
    if (img) img.src = imgUrl;
    if (box) box.style.filter = `drop-shadow(0 0 25px ${colorHex}40)`;

    this.showToast(`Selected ${colorName} Paintwork Finish`, 'info');
  }

  initFloatingBookingBar() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);

    const fmt = (d) => d.toISOString().split('T')[0];
    const pickupEl = document.getElementById('bar-pickup-date');
    const returnEl = document.getElementById('bar-return-date');
    if (pickupEl) pickupEl.value = fmt(start);
    if (returnEl) returnEl.value = fmt(end);
  }

  syncBookingBar() {
    const pDate = document.getElementById('bar-pickup-date')?.value;
    const rDate = document.getElementById('bar-return-date')?.value;
    if (pDate && rDate) {
      const s = new Date(pDate);
      const e = new Date(rDate);
      if (e < s) {
        this.showToast('Return date must be after pick-up date', 'error');
      }
    }
  }

  selectCategoryFromBar(catId) {
    this.selectCategory(catId);
  }

  // ==========================================
  // VIEW 3: ADMIN CENTRAL OPERATIONS DASHBOARD
  // ==========================================
  renderAdminDashboard() {
    if (!this.analytics) return;

    const { kpis, overdue_items, funnel, category_distribution, recent_activity } = this.analytics;

    document.getElementById('kpi-active-rentals').innerText = kpis.active_rentals;
    document.getElementById('kpi-ready-pickup').innerText = kpis.ready_for_pickup;
    document.getElementById('kpi-pending-approval').innerText = kpis.pending_approval;

    document.getElementById('kpi-overdue-rentals').innerText = kpis.overdue_rentals;
    document.getElementById('kpi-overdue-penalties').innerText = `$${kpis.late_penalty_revenue.toFixed(2)} accrued penalties`;

    document.getElementById('kpi-gross-revenue').innerText = `$${kpis.total_gross_revenue.toFixed(2)}`;
    document.getElementById('kpi-base-rev').innerText = `$${kpis.base_rental_revenue.toFixed(2)}`;
    document.getElementById('kpi-penalties-rev').innerText = `$${(kpis.late_penalty_revenue + kpis.damage_fee_revenue).toFixed(2)}`;

    document.getElementById('kpi-escrow-held').innerText = `$${kpis.current_escrow_held.toFixed(2)}`;
    document.getElementById('kpi-escrow-refunded').innerText = `$${kpis.total_deposit_refunded.toFixed(2)}`;

    document.getElementById('kpi-utilization-rate').innerText = `${kpis.utilization_rate}%`;
    document.getElementById('kpi-rented-items').innerText = kpis.rented_fleet_items;
    document.getElementById('kpi-total-items').innerText = kpis.total_fleet_items;

    const banner = document.getElementById('overdue-alert-banner');
    if (banner) {
      if (kpis.overdue_rentals > 0) {
        banner.style.display = 'flex';
        document.getElementById('overdue-count-banner').innerText = kpis.overdue_rentals;
      } else {
        banner.style.display = 'none';
      }
    }

    this.renderFunnelBars(funnel, kpis.total_rentals);
    this.renderCategoryBars(category_distribution);
    this.renderAdminOrdersTable();
    this.renderActivityFeed(recent_activity);

    if (window.lucide) window.lucide.createIcons();
  }

  renderFunnelBars(funnel, total) {
    const container = document.getElementById('funnel-bars-container');
    if (!container || !funnel) return;

    const max = Math.max(1, total);
    const stages = [
      { label: 'Pending Approval', count: funnel.pending_approval, color: '#fbbf24' },
      { label: 'Ready for Handover', count: funnel.ready_for_pickup, color: '#22d3ee' },
      { label: 'Active on Road', count: funnel.active, color: '#34d399' },
      { label: 'Overdue At-Risk', count: funnel.overdue, color: '#fb7185' },
      { label: 'Return Intake Diagnostic', count: funnel.return_submitted, color: '#c084fc' },
      { label: 'Completed & Escrow Settled', count: funnel.completed, color: '#94a3b8' }
    ];

    container.innerHTML = stages.map(s => {
      const pct = Math.round((s.count / max) * 100);
      return `
        <div class="funnel-item">
          <div class="funnel-header">
            <span style="color: #cbd5e1;">${s.label}</span>
            <span style="color: ${s.color}; font-family: var(--font-mono); font-weight: 700;">${s.count} (${pct}%)</span>
          </div>
          <div class="funnel-bar-bg">
            <div class="funnel-bar-fill" style="width: ${Math.max(5, pct)}%; background: ${s.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCategoryBars(dist = []) {
    const container = document.getElementById('category-distribution-container');
    if (!container) return;

    container.innerHTML = dist.map(c => {
      return `
        <div class="funnel-item">
          <div class="funnel-header">
            <span style="color: #cbd5e1;">${c.name}</span>
            <span style="color: var(--gold); font-family: var(--font-mono); font-weight: 700;">$${(c.category_revenue || 0).toFixed(2)} (${c.rental_count || 0} bookings)</span>
          </div>
          <div class="funnel-bar-bg">
            <div class="funnel-bar-fill" style="width: ${Math.min(100, Math.max(10, (c.rental_count || 0) * 20))}%; background: var(--gold);"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  filterAdminTable(status) {
    this.currentFilterStatus = status;
    document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));

    const activeTab = Array.from(document.querySelectorAll('.status-tab')).find(t => t.innerText.toUpperCase().includes(status.replace('_', ' ')));
    if (activeTab) activeTab.classList.add('active');

    this.renderAdminOrdersTable();
  }

  searchAdminTable() {
    this.renderAdminOrdersTable();
  }

  renderAdminOrdersTable() {
    const tbody = document.getElementById('admin-rentals-table-body');
    if (!tbody) return;

    const searchInput = document.getElementById('admin-table-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let list = this.rentals.filter(r => {
      const matchesStatus = this.currentFilterStatus === 'ALL' || r.status === this.currentFilterStatus;
      const matchesSearch = !query ||
        r.rental_code.toLowerCase().includes(query) ||
        r.user_name.toLowerCase().includes(query) ||
        r.product_name.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });

    const countEl = document.getElementById('admin-orders-count');
    if (countEl) countEl.innerText = `${list.length} Bookings`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">
            No vehicle rentals found matching current status filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(r => {
      const statusBadge = this.getStatusBadgeHtml(r.status);
      const isOverdue = r.status === 'OVERDUE';

      return `
        <tr>
          <td>
            <span style="font-family: var(--font-mono); font-weight: 800; color: var(--gold);">${r.rental_code}</span>
            <div style="font-size: 0.7rem; color: var(--text-dim);">${r.invoice_number || 'INV-2026'} • ${r.created_at ? r.created_at.split(' ')[0] : ''}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${r.user_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${r.user_email}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${r.product_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${r.product_brand} • ${r.product_serial || 'VIN-AUTO'}</div>
          </td>
          <td>
            <div style="font-size: 0.8rem; color: #cbd5e1;">${r.start_date} &rarr; <strong>${r.end_date}</strong></div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">${r.duration_days} Day(s) • ${r.fulfillment_type}</div>
          </td>
          <td>
            <div style="font-family: var(--font-mono); font-weight: 700; color: #fff;">$${r.base_rental_fee.toFixed(2)}</div>
            <div style="font-size: 0.75rem; color: var(--amber);">Dep: $${r.deposit_amount.toFixed(2)} (${r.deposit_status})</div>
          </td>
          <td>
            ${isOverdue || r.late_penalty_fee > 0 ? `
              <div style="font-family: var(--font-mono); font-weight: 800; color: var(--rose);">
                +$${r.late_penalty_fee.toFixed(2)}
                <span style="font-size: 0.7rem; display: block;">(${r.late_days_count}d Late)</span>
              </div>
            ` : '<span style="color: var(--text-dim); font-size: 0.8rem;">$0.00</span>'}
            ${r.damage_fee > 0 ? `<div style="color: var(--rose); font-size: 0.75rem;">Dmg: $${r.damage_fee.toFixed(2)}</div>` : ''}
          </td>
          <td>${statusBadge}</td>
          <td class="text-right">
            <button class="btn btn-sm btn-secondary" onclick="app.showInvoice(${r.id})" title="View Official Tax Invoice">
              <i data-lucide="file-text"></i> Invoice
            </button>
            ${this.getAdminActionButtons(r)}
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  getAdminActionButtons(rental) {
    if (rental.status === 'PENDING_APPROVAL') {
      return `
        <button class="btn btn-sm btn-gold" onclick="app.updateRentalStatus(${rental.id}, 'READY_FOR_PICKUP')">
          <i data-lucide="check"></i> Approve
        </button>
      `;
    }

    if (rental.status === 'READY_FOR_PICKUP') {
      return `
        <button class="btn btn-sm btn-emerald" onclick="app.updateRentalStatus(${rental.id}, 'ACTIVE')">
          <i data-lucide="key"></i> Handover Key
        </button>
      `;
    }

    if (rental.status === 'ACTIVE' || rental.status === 'OVERDUE' || rental.status === 'RETURN_SUBMITTED') {
      return `
        <button class="btn btn-sm btn-emerald" onclick="app.openStoreReturnModal(${rental.id})">
          <i data-lucide="clipboard-check"></i> Return Diagnostic
        </button>
      `;
    }

    return '';
  }

  async updateRentalStatus(rentalId, newStatus) {
    try {
      const res = await fetch(`${this.apiBase}/rentals/${rentalId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          status: newStatus,
          actor_name: this.currentUser ? this.currentUser.name : 'Fleet Director',
          actor_role: 'admin',
          notes: `Status updated via Admin Central Dashboard to ${newStatus}`
        })
      });

      if (res.ok) {
        this.showToast(`Vehicle marked as ${newStatus}`, 'success');
        await this.fetchRentals();
        await this.fetchAnalytics();
        this.renderAdminDashboard();
      }
    } catch (err) {
      this.showToast('Failed to update status', 'error');
    }
  }

  renderActivityFeed(activities = []) {
    const container = document.getElementById('activity-feed-container');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem;">No recent telemetry logs.</div>`;
      return;
    }

    container.innerHTML = activities.map(a => {
      return `
        <div class="activity-item">
          <div class="act-dot" style="background: ${a.action_type.includes('PENALTY') ? 'var(--rose)' : a.action_type.includes('REFUND') || a.action_type.includes('ORDER_PAID') ? 'var(--emerald)' : 'var(--gold)'};"></div>
          <div class="act-content">
            <div class="act-desc">
              <strong style="color: #fff;">${a.actor_name}</strong>: ${a.description}
            </div>
            <div class="act-time">${a.timestamp}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // VIEW 4: INVENTORY MANAGEMENT
  // ==========================================
  renderInventoryTable() {
    const tbody = document.getElementById('admin-inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.products.map(p => {
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <img src="${p.image}" alt="${p.name}" style="width: 50px; height: 38px; border-radius: 6px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200'">
              <div>
                <strong style="color: #fff; font-size: 0.92rem;">${p.name}</strong>
                <div style="font-size: 0.75rem; color: var(--text-dim);">${p.brand} • ${p.serial_number || 'VIN-AUTO'}</div>
              </div>
            </div>
          </td>
          <td><span class="badge-soft">${p.category_name || p.category_id}</span></td>
          <td><strong style="font-family: var(--font-mono); color: var(--gold);">$${p.daily_rate.toFixed(2)}</strong></td>
          <td><span style="font-family: var(--font-mono); color: var(--text-muted);">$${p.weekly_rate.toFixed(2)}</span></td>
          <td><span style="font-family: var(--font-mono); color: var(--amber);">$${p.deposit_amount.toFixed(2)}</span></td>
          <td>
            <strong style="color: ${p.available_stock > 0 ? 'var(--emerald)' : 'var(--rose)'};">${p.available_stock}</strong>
            <span style="color: var(--text-dim);">/ ${p.total_stock} Units</span>
          </td>
          <td><span class="badge-soft badge-gold">${p.condition_status}</span></td>
          <td class="text-right">
            <button class="btn btn-sm btn-secondary" onclick="app.openEditProductModal(${p.id})">
              <i data-lucide="edit-2"></i> Edit
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openAddProductModal() {
    document.getElementById('product-modal-title').innerText = 'Add New Vehicle to Fleet';
    document.getElementById('prod-id').value = '';
    document.getElementById('product-form').reset();
    this.openModal('product-modal');
  }

  openEditProductModal(id) {
    const p = this.products.find(item => item.id === id);
    if (!p) return;

    document.getElementById('product-modal-title').innerText = `Edit ${p.name}`;
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-category').value = p.category_id;
    document.getElementById('prod-brand').value = p.brand;
    document.getElementById('prod-model').value = p.model || '';
    document.getElementById('prod-daily-rate').value = p.daily_rate;
    document.getElementById('prod-weekly-rate').value = p.weekly_rate;
    document.getElementById('prod-deposit').value = p.deposit_amount;
    document.getElementById('prod-stock').value = p.total_stock;
    document.getElementById('prod-condition').value = p.condition_status;
    document.getElementById('prod-image').value = p.image;
    document.getElementById('prod-desc').value = p.description;

    this.openModal('product-modal');
  }

  async saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const isEdit = Boolean(id);

    const payload = {
      name: document.getElementById('prod-name').value,
      category_id: document.getElementById('prod-category').value,
      brand: document.getElementById('prod-brand').value,
      model: document.getElementById('prod-model').value,
      daily_rate: parseFloat(document.getElementById('prod-daily-rate').value),
      weekly_rate: parseFloat(document.getElementById('prod-weekly-rate').value),
      deposit_amount: parseFloat(document.getElementById('prod-deposit').value),
      total_stock: parseInt(document.getElementById('prod-stock').value, 10),
      available_stock: parseInt(document.getElementById('prod-stock').value, 10),
      condition_status: document.getElementById('prod-condition').value,
      image: document.getElementById('prod-image').value,
      description: document.getElementById('prod-desc').value
    };

    try {
      const url = isEdit ? `${this.apiBase}/products/${id}` : `${this.apiBase}/products`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.closeModal('product-modal');
        this.showToast(`Vehicle ${isEdit ? 'updated' : 'added to fleet'} successfully!`, 'success');
        await this.fetchProducts();
        this.renderProducts();
        this.renderInventoryTable();
      }
    } catch (err) {
      this.showToast('Error saving vehicle', 'error');
    }
  }

  // ==========================================
  // VIEW 5: CONFIGURATION & SETTINGS
  // ==========================================
  populateSettingsForm() {
    if (!this.config) return;

    document.getElementById('cfg-late-multiplier').value = this.config.late_fee_daily_multiplier;
    document.getElementById('cfg-late-val').innerText = `${this.config.late_fee_daily_multiplier}x`;

    document.getElementById('cfg-grace-period').value = this.config.grace_period_hours;
    document.getElementById('cfg-grace-val').innerText = `${this.config.grace_period_hours} Hours`;

    document.getElementById('cfg-deposit-percent').value = this.config.deposit_percentage_default;
    document.getElementById('cfg-deposit-val').innerText = `${this.config.deposit_percentage_default}%`;

    document.getElementById('cfg-min-days').value = this.config.min_rental_days;
    document.getElementById('cfg-max-days').value = this.config.max_rental_days;
    document.getElementById('cfg-pickup-location').value = this.config.pickup_location;
  }

  async saveSettings(e) {
    e.preventDefault();

    const payload = {
      late_fee_daily_multiplier: parseFloat(document.getElementById('cfg-late-multiplier').value),
      grace_period_hours: parseInt(document.getElementById('cfg-grace-period').value, 10),
      deposit_percentage_default: parseFloat(document.getElementById('cfg-deposit-percent').value),
      min_rental_days: parseInt(document.getElementById('cfg-min-days').value, 10),
      max_rental_days: parseInt(document.getElementById('cfg-max-days').value, 10),
      pickup_location: document.getElementById('cfg-pickup-location').value
    };

    try {
      const res = await fetch(`${this.apiBase}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.showToast('Fleet policies and rate rules saved!', 'success');
        await this.fetchConfig();
        await this.fetchRentals();
        await this.fetchAnalytics();
        this.renderAdminDashboard();
      }
    } catch (err) {
      this.showToast('Error updating settings', 'error');
    }
  }

  async refreshAnalytics() {
    await this.fetchRentals();
    await this.fetchAnalytics();
    this.renderAdminDashboard();
    this.showToast('Fleet telemetry refreshed', 'info');
  }

  // ==========================================
  // HELPER UTILITIES
  // ==========================================
  getStatusBadgeHtml(status) {
    const labels = {
      'PENDING_APPROVAL': { text: 'Pending Approval', class: 'status-pending', icon: 'clock' },
      'READY_FOR_PICKUP': { text: 'Ready for Handover', class: 'status-ready', icon: 'key' },
      'ACTIVE': { text: 'Active On Road', class: 'status-active', icon: 'check-circle-2' },
      'OVERDUE': { text: 'Overdue Penalty', class: 'status-overdue', icon: 'alert-triangle' },
      'RETURN_SUBMITTED': { text: 'Return Intake', class: 'status-return', icon: 'arrow-down-left' },
      'INSPECTED_COMPLETED': { text: 'Completed & Refunded', class: 'status-completed', icon: 'archive' },
      'CANCELLED': { text: 'Cancelled', class: 'status-cancelled', icon: 'x-circle' }
    };

    const s = labels[status] || { text: status, class: 'status-pending', icon: 'info' };
    return `<span class="status-pill ${s.class}"><i data-lucide="${s.icon}" style="width: 12px; height: 12px; display: inline;"></i> ${s.text}</span>`;
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  setupDatePickers() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px; color: ${type === 'success' ? 'var(--emerald)' : type === 'error' ? 'var(--rose)' : 'var(--gold)'};"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Global instance initialization on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new LeaseifyApp();
});
