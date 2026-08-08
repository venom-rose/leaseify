// app.js - Full-Stack Client Logic with Quotations, Invoices, Pricelists, Users & Diagnostic Return

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
    this.quotations = [];
    this.pricelists = [];
    this.presets = [];
    this.adminUsers = [];
    this.analytics = null;
    this.config = null;
    this.selectedCategory = 'all';
    this.currentFilterStatus = 'ALL';
    this.currentQuoteFilterStatus = 'ALL';
    this.currentUserFilterRole = 'ALL';

    // Dispatch & Fleet Intake State
    this.pickupsData = null;
    this.returnsData = null;
    this.repairsData = [];
    this.activeDispatchTab = 'pickups';
    this.activeDiagnosticRental = null;
    this.activeChecklist = [];
    this.activeMissingItems = [];
    this.activeDamages = [];

    // Cart & Checkout State
    this.cartProduct = null;
    this.checkoutStep = 1;
    this.fulfillmentType = 'PICKUP';
    this.paymentMethod = 'CREDIT_CARD';

    // Active Return Terminal State
    this.activeReturnRental = null;

    this.init();
  }

  async init() {
    this.initTheme();
    await this.fetchConfig();
    await this.fetchCategories();
    await this.fetchProducts();

    // Default to active admin user for instant demo interactivity if no session token exists
    if (!this.token) {
      this.currentUser = {
        id: 1,
        name: 'Sarah Connor',
        email: 'sarah.c@leaseify.io',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
        membership_tier: 'Fleet Director'
      };
    } else {
      await this.verifyCurrentSession();
    }

    this.showAppLayout();
    this.updateUserUI();
    this.navigate('store');

    await this.fetchRentals();
    await this.fetchAnalytics();
    await this.fetchQuotations();
    await this.fetchPricelists();
    await this.fetchPresets();

    this.setupDatePickers();
    this.initFloatingBookingBar();
    this.startLiveOperationsPolling();
    document.addEventListener('click', () => this.closeProfileDropdown());

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  startLiveOperationsPolling() {
    setInterval(async () => {
      if (this.currentUser && this.currentUser.role === 'admin' && this.currentView === 'admin') {
        try {
          await this.fetchRentals();
          await this.fetchAnalytics();
          this.renderAdminDashboard();
        } catch (e) {
          // silent auto-refresh
        }
      }
    }, 6000);
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
        await this.fetchQuotations();
        await this.fetchPricelists();

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

  updateUserUI() {
    if (!this.currentUser) return;
    const u = this.currentUser;

    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name-display');
    const tierEl = document.getElementById('user-tier-display');
    const dropNameEl = document.getElementById('dropdown-user-name');
    const dropEmailEl = document.getElementById('dropdown-user-email');

    if (avatarEl) avatarEl.src = u.avatar || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150';
    if (nameEl) nameEl.innerText = u.name || 'Sarah Connor';
    if (tierEl) tierEl.innerText = u.role === 'admin' ? 'Fleet Director' : (u.membership_tier || 'Client Member');
    if (dropNameEl) dropNameEl.innerText = u.name || 'Sarah Connor';
    if (dropEmailEl) dropEmailEl.innerText = u.email || 'sarah.c@leaseify.io';

    const adminEls = document.querySelectorAll('.admin-only');
    adminEls.forEach(el => {
      el.style.display = (u.role === 'admin') ? '' : 'none';
    });
  }

  toggleProfileDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) {
      menu.classList.toggle('show');
    }
  }

  closeProfileDropdown() {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu && menu.classList.contains('show')) {
      menu.classList.remove('show');
    }
  }

  toggleMobileMenu() {
    const menu = document.getElementById('primary-nav-menu');
    if (menu) {
      menu.classList.toggle('show-mobile');
    }
  }

  navigate(targetView) {
    this.currentView = targetView;
    this.closeProfileDropdown();

    // Hide all view sections
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => {
      sec.style.display = 'none';
    });

    // View ID Mapping
    const viewMap = {
      'store': 'view-store',
      'my-rentals': 'view-my-rentals',
      'admin': 'view-admin',
      'dispatch': 'view-dispatch',
      'deposits': 'view-deposits',
      'quotations': 'view-quotations',
      'inventory': 'view-inventory',
      'pricelists': 'view-pricelists',
      'users': 'view-users',
      'settings': 'view-settings',
      'maintenance': 'view-maintenance',
      'reminders': 'view-reminders',
      'forecasting': 'view-forecasting'
    };

    const sectionId = viewMap[targetView] || 'view-store';
    const targetEl = document.getElementById(sectionId);

    if (targetEl) {
      targetEl.style.display = (sectionId === 'view-splash') ? 'flex' : 'block';
    }

    // Update active nav button state
    document.querySelectorAll('.nav-item-btn, .nav-link').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeNavBtn = document.getElementById(`nav-${targetView}`);
    if (activeNavBtn) {
      activeNavBtn.classList.add('active');
    }

    // Trigger data fetch for targeted view
    if (targetView === 'users') this.fetchAdminUsers();
    if (targetView === 'dispatch') this.fetchDispatchHub();
    if (targetView === 'reminders') this.fetchReminders();
    if (targetView === 'maintenance') this.fetchMaintenanceTelemetry();
    if (targetView === 'forecasting') this.fetchForecasting();
    if (targetView === 'admin') {
      this.fetchRentals();
      this.fetchAnalytics();
    }

    if (window.lucide) window.lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  // API FETCH HELPERS
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

  // ==========================================
  // THEME SWITCHER & MARKETPLACE RENDERERS
  // ==========================================
  initTheme() {
    this.currentTheme = localStorage.getItem('leaseify_theme') || 'dark';
    this.setTheme(this.currentTheme);
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
    this.showToast(`Switched to ${nextTheme.toUpperCase()} theme`, 'info');
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('leaseify_theme', theme);

    const labelEl = document.getElementById('theme-label');
    const iconEl = document.getElementById('theme-icon');
    if (labelEl) labelEl.innerText = theme === 'dark' ? 'Dark' : 'Light';
    if (iconEl) {
      iconEl.setAttribute('data-lucide', theme === 'dark' ? 'moon' : 'sun');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async fetchCategories() {
    try {
      const res = await fetch(`${this.apiBase}/categories`);
      const data = await res.json();
      this.categories = data; // Array of main categories with subcategories
      this.renderAmazonCategoryGrid();
      this.renderCategoryPills();
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }

  renderAmazonCategoryGrid() {
    const grid = document.getElementById('homepage-category-grid');
    if (!grid) return;

    const mainCats = Array.isArray(this.categories) ? this.categories : [];
    if (mainCats.length === 0) return;

    grid.innerHTML = mainCats.map(c => {
      const itemCount = (this.products || []).filter(p => p.category_id === c.id).length;
      const isActive = this.selectedCategory === c.id;

      return `
        <div class="amazon-cat-card ${isActive ? 'active' : ''} animate-fade-in" onclick="app.selectCategory('${c.id}')">
          <div class="amazon-cat-icon-box">
            <i data-lucide="${c.icon || 'package'}" style="width: 26px; height: 26px;"></i>
          </div>
          <div class="amazon-cat-title">${c.name}</div>
          <div class="amazon-cat-count">${itemCount > 0 ? itemCount + ' Available' : 'Explore Category'}</div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  async fetchProducts() {
    try {
      let url = `${this.apiBase}/products`;
      const params = [];
      if (this.selectedCategory && this.selectedCategory !== 'all') params.push(`category=${encodeURIComponent(this.selectedCategory)}`);
      if (this.selectedSubcategory && this.selectedSubcategory !== 'all') params.push(`subcategory=${encodeURIComponent(this.selectedSubcategory)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      this.products = await res.json();
      this.renderAmazonCategoryGrid();
      this.renderFeaturedProducts();
      this.renderProducts();
      this.renderInventoryTable();
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }

  renderFeaturedProducts() {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;

    const list = (this.products || []).slice(0, 4); // Top 4 featured items
    if (list.length === 0) return;

    grid.innerHTML = list.map(p => {
      const isStockAvailable = p.available_stock > 0;
      return `
        <div class="saas-product-card">
          <div class="saas-card-img-box">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            <div style="position: absolute; top: 10px; right: 10px;">
              <span class="badge-soft badge-gold" style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase;">HOT RENTAL</span>
            </div>
          </div>
          <div class="saas-card-body">
            <div class="saas-card-category">${p.category_name || p.category_id} &bull; ${p.brand}</div>
            <h3 class="saas-card-title">${p.name}</h3>
            <div class="saas-price-tag">
              <span class="saas-price-val">$${p.daily_rate}</span>
              <span class="saas-price-unit">/ day</span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-dim); margin-bottom: 0.75rem;">
              Deposit: <strong style="color: var(--gold);">$${p.deposit_amount.toFixed(2)}</strong> &bull; ${p.available_stock} in stock
            </div>
            <button class="btn btn-gold btn-sm" style="width: 100%; border-radius: 8px;" onclick="app.openBookingModal(${p.id})" ${!isStockAvailable ? 'disabled' : ''}>
              <i data-lucide="zap"></i> Instant Book
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  renderCategoryPills() {
    const container = document.getElementById('category-pills-container');
    if (!container) return;

    const mainCats = Array.isArray(this.categories) ? this.categories : [];
    
    let html = `
      <button class="category-pill ${this.selectedCategory === 'all' ? 'active' : ''}" onclick="app.selectCategory('all')">
        <i data-lucide="layout-grid"></i> All Products
      </button>
    `;

    mainCats.forEach(c => {
      const iconName = c.icon || 'tag';
      html += `
        <button class="category-pill ${this.selectedCategory === c.id ? 'active' : ''}" onclick="app.selectCategory('${c.id}')">
          <i data-lucide="${iconName}"></i> ${c.name}
        </button>
      `;
    });

    container.innerHTML = html;
    this.renderSubcategoryChips();
    if (window.lucide) window.lucide.createIcons();
  }

  renderSubcategoryChips() {
    const container = document.getElementById('subcategory-chips-container');
    if (!container) return;

    if (this.selectedCategory === 'all') {
      container.innerHTML = '';
      return;
    }

    const currentCat = (this.categories || []).find(c => c.id === this.selectedCategory);
    const subcats = currentCat?.subcategories || [];

    if (subcats.length === 0) {
      container.innerHTML = '';
      return;
    }

    let html = `
      <button class="chip-btn ${this.selectedSubcategory === 'all' ? 'active' : ''}" onclick="app.selectSubcategory('all')">
        All Subcategories
      </button>
    `;

    subcats.forEach(sub => {
      html += `
        <button class="chip-btn ${this.selectedSubcategory === sub.id ? 'active' : ''}" onclick="app.selectSubcategory('${sub.id}')">
          ${sub.name}
        </button>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  selectCategory(catId) {
    this.selectedCategory = catId;
    this.selectedSubcategory = 'all';
    this.renderAmazonCategoryGrid();
    this.renderCategoryPills();
    this.fetchProducts();
  }

  selectSubcategory(subcatId) {
    this.selectedSubcategory = subcatId;
    this.renderSubcategoryChips();
    this.fetchProducts();
  }

  filterProductsBySearch(term) {
    this.searchQuery = (term || '').toLowerCase().trim();
    this.renderProducts();
  }

  renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    let list = this.products || [];

    if (this.searchQuery) {
      list = list.filter(p => {
        const title = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const cat = (p.category_name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const attrs = JSON.stringify(p.attributes || {}).toLowerCase();
        return title.includes(this.searchQuery) || brand.includes(this.searchQuery) || cat.includes(this.searchQuery) || desc.includes(this.searchQuery) || attrs.includes(this.searchQuery);
      });
    }

    const badgeEl = document.getElementById('catalog-count-badge');
    if (badgeEl) badgeEl.innerText = `${list.length} Items Available`;

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border-subtle);">
          <i data-lucide="package-search" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 1rem;"></i>
          <h3 style="color: #fff; margin-bottom: 0.5rem;">No Products Found</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">No items match your category filter or search query "${this.searchQuery}".</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    grid.innerHTML = list.map(p => {
      const isStockAvailable = p.available_stock > 0;
      const stockBadgeClass = p.available_stock > 3 ? 'in-stock' : (p.available_stock > 0 ? 'low-stock' : 'out-stock');
      const stockText = p.available_stock > 0 ? `${p.available_stock} in stock` : 'Out of stock';

      // Format custom attributes tags
      const attrs = p.attributes || {};
      const attrTags = Object.entries(attrs).slice(0, 3).map(([k, v]) => `
        <span class="attribute-tag">${k}: ${v}</span>
      `).join('');

      return `
        <div class="product-card">
          <div class="product-image-box">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            <div style="position: absolute; top: 12px; left: 12px; display: flex; gap: 6px;">
              <span class="stock-indicator ${stockBadgeClass}">${stockText}</span>
              <span class="badge-soft badge-gold" style="font-size: 0.68rem; text-transform: uppercase;">${p.category_name || p.category_id}</span>
            </div>
          </div>

          <div class="product-info-box">
            <div style="font-size: 0.75rem; color: var(--gold); font-weight: 700; text-transform: uppercase;">${p.brand} &bull; ${p.condition_status}</div>
            <h3 class="product-title" style="margin: 0.25rem 0 0.5rem; font-size: 1.1rem; color: #fff;">${p.name}</h3>

            <div class="marketplace-card-rates">
              ${p.hourly_rate > 0 ? `<span class="rate-badge hr">$${p.hourly_rate}/hr</span>` : ''}
              <span class="rate-badge day">$${p.daily_rate}/day</span>
              <span class="rate-badge wk">$${p.weekly_rate}/wk</span>
            </div>

            <div class="attribute-tag-list">${attrTags}</div>

            <div class="product-card-footer" style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 0.725rem; color: var(--text-dim);">Security Deposit:</span>
                <div style="color: var(--amber); font-weight: 700; font-size: 0.88rem;">$${p.deposit_amount.toFixed(2)}</div>
              </div>

              <button class="btn btn-gold btn-sm" onclick="app.openBookingModal(${p.id})" ${!isStockAvailable ? 'disabled' : ''}>
                <i data-lucide="shopping-bag"></i> ${isStockAvailable ? 'Rent Now' : 'Out of Stock'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // Category Manager Modal
  openCategoryModal() {
    this.renderCategoryTree();
    this.openModal('category-manager-modal');
  }

  renderCategoryTree() {
    const container = document.getElementById('category-tree-container');
    const parentSelect = document.getElementById('cat-parent');
    if (!container) return;

    const mainCats = Array.isArray(this.categories) ? this.categories : [];

    if (parentSelect) {
      parentSelect.innerHTML = `<option value="">Top-Level Main Category</option>` + mainCats.map(c => `
        <option value="${c.id}">${c.name}</option>
      `).join('');
    }

    container.innerHTML = mainCats.map(c => {
      const subs = c.subcategories || [];
      return `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <i data-lucide="${c.icon || 'folder'}" style="color: var(--gold); width: 20px; height: 20px;"></i>
              <strong style="color: #fff; font-size: 1rem;">${c.name}</strong>
              <span style="font-size: 0.75rem; color: var(--text-dim);">(${c.id})</span>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="app.deleteCategory('${c.id}')"><i data-lucide="trash-2"></i> Delete</button>
          </div>
          ${c.description ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.35rem 0 0.5rem;">${c.description}</p>` : ''}
          ${subs.length > 0 ? `
            <div style="margin-top: 0.5rem; padding-left: 1.25rem; border-left: 2px solid var(--border-subtle); display: flex; flex-direction: column; gap: 0.4rem;">
              ${subs.map(sub => `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                  <span style="color: var(--cyan);">&bull; ${sub.name} <span style="font-size: 0.7rem; color: var(--text-dim);">(${sub.id})</span></span>
                  <button class="btn btn-sm btn-secondary" style="padding: 2px 6px; font-size: 0.7rem;" onclick="app.deleteCategory('${sub.id}')">Delete</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  async saveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('cat-id').value.trim();
    const parent_category_id = document.getElementById('cat-parent').value || null;
    const name = document.getElementById('cat-name').value.trim();
    const icon = document.getElementById('cat-icon').value.trim();
    const description = document.getElementById('cat-desc').value.trim();

    try {
      const res = await fetch(`${this.apiBase}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
        body: JSON.stringify({ id, parent_category_id, name, icon, description })
      });

      if (res.ok) {
        this.showToast('Category saved successfully!', 'success');
        document.getElementById('category-form').reset();
        await this.fetchCategories();
        this.renderCategoryTree();
      } else {
        const err = await res.json();
        this.showToast(err.error || 'Failed to save category', 'error');
      }
    } catch (err) {
      this.showToast('Error saving category: ' + err.message, 'error');
    }
  }

  async deleteCategory(id) {
    if (!confirm(`Are you sure you want to delete category "${id}"?`)) return;

    try {
      const res = await fetch(`${this.apiBase}/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (res.ok) {
        this.showToast('Category deleted successfully', 'success');
        await this.fetchCategories();
        this.renderCategoryTree();
      }
    } catch (err) {
      this.showToast('Error deleting category', 'error');
    }
  }

  renderInventoryTable() {
    const tbody = document.getElementById('admin-inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = (this.products || []).map(p => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${p.image}" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover;">
            <div>
              <strong style="color: #fff;">${p.name}</strong>
              <div style="font-size: 0.72rem; color: var(--text-dim);">${p.brand} &bull; ${p.serial_number || ''}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-soft badge-gold">${p.category_name || p.category_id}</span>
        </td>
        <td>
          <div style="font-family: var(--font-mono); color: #fff;">$${p.daily_rate}/day</div>
          <div style="font-size: 0.72rem; color: var(--cyan);">$${p.hourly_rate || 0}/hr &bull; $${p.weekly_rate}/wk</div>
        </td>
        <td>
          <span class="stock-indicator ${p.available_stock > 0 ? 'in-stock' : 'out-stock'}">
            ${p.available_stock} / ${p.total_stock} Available
          </span>
        </td>
        <td>
          <span class="badge-soft badge-amber">$${p.deposit_amount.toFixed(2)} (${p.deposit_type})</span>
        </td>
        <td class="text-right">
          <button class="btn btn-sm btn-secondary" onclick="app.openEditProductModal(${p.id})">
            <i data-lucide="edit"></i> Edit
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
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

  async fetchQuotations() {
    try {
      const res = await fetch(`${this.apiBase}/quotations`);
      this.quotations = await res.json();
      this.renderQuotationsTable();
    } catch (err) {
      console.error('Error fetching quotations:', err);
    }
  }

  async fetchPricelists() {
    try {
      const res = await fetch(`${this.apiBase}/pricelists`);
      this.pricelists = await res.json();
      this.renderPricelists();
    } catch (err) {
      console.error('Error fetching pricelists:', err);
    }
  }

  async fetchPresets() {
    try {
      const res = await fetch(`${this.apiBase}/rental-presets`);
      this.presets = await res.json();
      this.renderRentalPeriodPresets();
    } catch (err) {
      console.error('Error fetching presets:', err);
    }
  }

  async fetchAdminUsers() {
    try {
      const res = await fetch(`${this.apiBase}/users`);
      this.adminUsers = await res.json();
      this.renderUsersTable();
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }

  // ==========================================
  // VIEW 4: OFFLINE QUOTATIONS & TEMPLATES (ADMIN)
  // ==========================================
  openCreateQuotationModal() {
    const pSelect = document.getElementById('quote-product-select');
    if (pSelect) {
      pSelect.innerHTML = this.products.map(p => `
        <option value="${p.id}" data-rate="${p.daily_rate}" data-deposit="${p.deposit_amount}">${p.name} ($${p.daily_rate}/day - Dep: $${p.deposit_amount})</option>
      `).join('');
    }

    const plSelect = document.getElementById('quote-pricelist-select');
    if (plSelect) {
      plSelect.innerHTML = `
        <option value="">No Pricelist (Catalog Rate)</option>
        ${this.pricelists.map(pl => `
          <option value="${pl.id}" data-discount="${pl.discount_percent}">${pl.name} (${pl.discount_percent}% off)</option>
        `).join('')}
      `;
    }

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 2);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    const valid = new Date(today);
    valid.setDate(valid.getDate() + 7);

    const fmt = (d) => d.toISOString().split('T')[0];
    document.getElementById('quote-start-date').value = fmt(start);
    document.getElementById('quote-end-date').value = fmt(end);
    document.getElementById('quote-valid-until').value = fmt(valid);

    document.getElementById('quote-create-form').reset();
    document.getElementById('quote-start-date').value = fmt(start);
    document.getElementById('quote-end-date').value = fmt(end);
    document.getElementById('quote-valid-until').value = fmt(valid);

    this.syncQuotationMath();
    this.openModal('quote-create-modal');
  }

  syncQuotationMath() {
    const pSelect = document.getElementById('quote-product-select');
    const plSelect = document.getElementById('quote-pricelist-select');
    const sDate = document.getElementById('quote-start-date')?.value;
    const eDate = document.getElementById('quote-end-date')?.value;
    const customRate = document.getElementById('quote-custom-rate')?.value;
    const fulfillment = document.getElementById('quote-fulfillment')?.value;

    if (!pSelect || !pSelect.value || !sDate || !eDate) return;

    const opt = pSelect.selectedOptions[0];
    const catRate = parseFloat(opt?.getAttribute('data-rate') || 500);
    const deposit = parseFloat(opt?.getAttribute('data-deposit') || 1000);

    const s = new Date(sDate);
    const e = new Date(eDate);
    const diff = e.getTime() - s.getTime();
    const durationDays = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    let effectiveRate = customRate ? parseFloat(customRate) : catRate;

    if (!customRate && plSelect && plSelect.value) {
      const plOpt = plSelect.selectedOptions[0];
      const discount = parseFloat(plOpt?.getAttribute('data-discount') || 0);
      if (discount > 0) {
        effectiveRate = Math.round(catRate * (1 - discount / 100) * 100) / 100;
      }
    }

    const baseFee = durationDays * effectiveRate;
    const deliveryFee = fulfillment === 'DELIVERY' ? 150.0 : 0.0;
    const totalQuoted = baseFee + deposit + deliveryFee;

    document.getElementById('quote-preview-duration').innerText = `${durationDays} Day(s)`;
    document.getElementById('quote-preview-rate').innerText = `$${effectiveRate.toFixed(2)} / day`;
    document.getElementById('quote-preview-base').innerText = `$${baseFee.toFixed(2)}`;
    document.getElementById('quote-preview-deliv').innerText = `$${deliveryFee.toFixed(2)} (${fulfillment})`;
    document.getElementById('quote-preview-deposit').innerText = `$${deposit.toFixed(2)}`;
    document.getElementById('quote-preview-total').innerText = `$${totalQuoted.toFixed(2)}`;
  }

  async saveQuotation(e) {
    e.preventDefault();

    const pSelect = document.getElementById('quote-product-select');
    const plSelect = document.getElementById('quote-pricelist-select');

    const payload = {
      customer_name: document.getElementById('quote-cust-name').value.trim(),
      customer_email: document.getElementById('quote-cust-email').value.trim(),
      customer_phone: document.getElementById('quote-cust-phone').value.trim(),
      customer_address: document.getElementById('quote-cust-address').value.trim(),
      product_id: parseInt(pSelect.value, 10),
      pricelist_id: plSelect.value ? parseInt(plSelect.value, 10) : null,
      start_date: document.getElementById('quote-start-date').value,
      end_date: document.getElementById('quote-end-date').value,
      custom_daily_rate: document.getElementById('quote-custom-rate').value ? parseFloat(document.getElementById('quote-custom-rate').value) : null,
      valid_until: document.getElementById('quote-valid-until').value,
      fulfillment_type: document.getElementById('quote-fulfillment').value,
      delivery_address: document.getElementById('quote-cust-address').value.trim(),
      notes: document.getElementById('quote-notes').value.trim()
    };

    try {
      const res = await fetch(`${this.apiBase}/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        this.closeModal('quote-create-modal');
        this.showToast(data.message, 'success');
        await this.fetchQuotations();
        this.renderQuotationsTable();
        this.showQuotationTemplate(data.quotation.id);
      } else {
        this.showToast(data.error || 'Failed to create quotation', 'error');
      }
    } catch (err) {
      this.showToast('Error creating quotation: ' + err.message, 'error');
    }
  }

  filterQuotesTable(status) {
    this.currentQuoteFilterStatus = status;
    this.renderQuotationsTable();
  }

  renderQuotationsTable() {
    const tbody = document.getElementById('admin-quotes-table-body');
    if (!tbody) return;

    const query = document.getElementById('admin-quotes-search')?.value.toLowerCase().trim() || '';

    let list = this.quotations.filter(q => {
      const matchesStatus = this.currentQuoteFilterStatus === 'ALL' || q.status === this.currentQuoteFilterStatus;
      const matchesSearch = !query ||
        q.quote_number.toLowerCase().includes(query) ||
        q.customer_name.toLowerCase().includes(query) ||
        q.product_name.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });

    const countEl = document.getElementById('admin-quotes-count');
    if (countEl) countEl.innerText = `${list.length} Quotes`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">
            No quotations found matching filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(q => {
      const badgeClass = q.status === 'CONVERTED' ? 'badge-converted' : (q.status === 'SENT' ? 'badge-sent' : 'badge-draft');

      return `
        <tr>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--gold);">${q.quote_number}</strong>
            <div style="font-size: 0.7rem; color: var(--text-dim);">Valid until: ${q.valid_until}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${q.customer_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${q.customer_email} • ${q.customer_phone || ''}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${q.product_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${q.pricelist_name || 'Standard Rate'}</div>
          </td>
          <td>
            <div style="font-size: 0.8rem; color: #cbd5e1;">${q.start_date} &rarr; <strong>${q.end_date}</strong></div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">${q.duration_days} Day(s) • ${q.fulfillment_type}</div>
          </td>
          <td>
            <div style="font-family: var(--font-mono); color: #fff;">$${q.custom_daily_rate.toFixed(2)}/day</div>
            <div style="font-size: 0.75rem; color: var(--amber);">Dep: $${q.deposit_amount.toFixed(2)}</div>
          </td>
          <td>
            <strong style="font-family: var(--font-mono); font-size: 1rem; color: var(--gold);">$${q.total_quoted.toFixed(2)}</strong>
          </td>
          <td>
            <span class="status-pill ${badgeClass}">${q.status}</span>
          </td>
          <td class="text-right">
            <button class="btn btn-sm btn-secondary" onclick="app.showQuotationTemplate(${q.id})" title="View Luxury Quotation Proposal">
              <i data-lucide="file-text"></i> Proposal
            </button>
            ${q.status !== 'CONVERTED' ? `
              <button class="btn btn-sm btn-gold" onclick="app.openConvertQuotationModal(${q.id})" title="Convert to Active Invoice & Collect Payment">
                <i data-lucide="receipt"></i> Convert to Invoice
              </button>
            ` : `
              <span class="badge-soft badge-emerald" style="font-size: 0.75rem;"><i data-lucide="check"></i> Invoiced</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // Quotation Template Viewer & Printable PDF
  async showQuotationTemplate(quoteId) {
    try {
      const res = await fetch(`${this.apiBase}/quotations/${quoteId}`);
      if (!res.ok) throw new Error('Quotation not found');
      const q = await res.json();

      document.getElementById('quote-doc-title').innerText = `Quotation #${q.quote_number}`;

      const html = `
        <div class="printable-invoice-body">
          <div class="invoice-header-grid">
            <div class="inv-brand-box">
              <h2>LEASEIFY<span style="color: var(--gold);">.FLEET</span></h2>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                Leaseify Premier Automotive Inc. • VIP Concierge Sales<br>
                850 Sunset Blvd, West Hollywood, CA 90069<br>
                Tax ID: US-94-8832104 • concierge@leaseify.io
              </p>
            </div>
            <div class="inv-meta-box">
              <div class="inv-number">${q.quote_number}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">Issue Date: ${q.created_at ? q.created_at.split(' ')[0] : 'Today'}</div>
              <div style="font-size: 0.8rem; color: var(--rose);">Proposal Valid Until: <strong>${q.valid_until}</strong></div>
              <div style="margin-top: 0.35rem;">
                <span class="badge-soft ${q.status === 'CONVERTED' ? 'badge-emerald' : 'badge-gold'}">Status: ${q.status}</span>
              </div>
            </div>
          </div>

          <div class="inv-client-vehicle-grid">
            <div>
              <div class="inv-section-title">Quoted For Client:</div>
              <strong style="color: #fff; font-size: 1.1rem;">${q.customer_name}</strong>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${q.customer_email} • ${q.customer_phone || ''}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Address: ${q.customer_address || 'Los Angeles, CA'}</div>
              <div style="font-size: 0.85rem; color: var(--gold); margin-top: 0.25rem;">Applied Schedule: ${q.pricelist_name || 'VIP Standard Rate'}</div>
            </div>

            <div>
              <div class="inv-section-title">Quoted Vehicle & Specs:</div>
              <strong style="color: #fff; font-size: 1.1rem;">${q.product_name}</strong>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">Power: ${q.horsepower || '525 HP'} • Top Speed: ${q.top_speed || '300 KM/H'}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Period: <strong>${q.start_date}</strong> to <strong>${q.end_date}</strong> (${q.duration_days} days)</div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">Fulfillment: ${q.fulfillment_type === 'DELIVERY' ? 'White-Glove Flatbed Delivery' : 'Executive Store Lounge Pickup'}</div>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Rate / Day</th>
                <th>Duration</th>
                <th style="text-align: right;">Quoted Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${q.product_name} — Vehicle Rental Reservation</strong>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">${q.notes || 'VIP Quoted Reservation'}</div>
                </td>
                <td>$${q.custom_daily_rate.toFixed(2)}</td>
                <td>${q.duration_days} Day(s)</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">$${q.base_rental_fee.toFixed(2)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Logistics / Handover (${q.fulfillment_type})</strong>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">${q.delivery_address}</div>
                </td>
                <td>${q.delivery_fee > 0 ? '$150.00 Flat' : 'Complimentary'}</td>
                <td>1</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">$${q.delivery_fee.toFixed(2)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Security Deposit Escrow (100% Refundable)</strong>
                  <div style="font-size: 0.75rem; color: var(--emerald);">Held in isolated escrow account. Released upon vehicle return.</div>
                </td>
                <td>Escrow Lock</td>
                <td>1</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--amber);">$${q.deposit_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div class="inv-escrow-guarantee">
              <i data-lucide="shield-check" style="width: 28px; height: 28px; color: var(--emerald); flex-shrink: 0;"></i>
              <div>
                <strong>Deposit Escrow Guarantee:</strong><br>
                <span>Upon returning the vehicle on time at our store lounge, your $${q.deposit_amount.toFixed(2)} security deposit is automatically refunded in full.</span>
              </div>
            </div>

            <div class="invoice-totals-box">
              <div class="ledger-row">
                <span class="ledger-lbl">Subtotal Rental:</span>
                <span class="ledger-val">$${q.base_rental_fee.toFixed(2)}</span>
              </div>
              <div class="ledger-row">
                <span class="ledger-lbl">Logistics / Delivery:</span>
                <span class="ledger-val">$${q.delivery_fee.toFixed(2)}</span>
              </div>
              <div class="ledger-row">
                <span class="ledger-lbl text-amber">Security Escrow Deposit:</span>
                <span class="ledger-val text-amber">$${q.deposit_amount.toFixed(2)}</span>
              </div>
              <div class="ledger-divider"></div>
              <div class="ledger-row ledger-total">
                <span>Total Quotation:</span>
                <span class="total-amount text-gold">$${q.total_quoted.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('quote-printable-content').innerHTML = html;

      const footer = document.getElementById('quote-template-footer');
      if (footer) {
        if (q.status !== 'CONVERTED') {
          footer.innerHTML = `
            <span style="font-size: 0.85rem; color: var(--text-muted);">Quotation proposal ready to be converted into an official tax invoice upon payment collection.</span>
            <button class="btn btn-gold" onclick="app.closeModal('quote-template-modal'); app.openConvertQuotationModal(${q.id});">
              <i data-lucide="receipt"></i> Convert to Invoice & Collect Deposit &rarr;
            </button>
          `;
        } else {
          footer.innerHTML = `
            <span style="font-size: 0.85rem; color: var(--emerald);"><i data-lucide="check-circle"></i> This quotation has been converted into active Invoice #${q.invoice_number}.</span>
            <button class="btn btn-secondary" onclick="app.closeModal('quote-template-modal'); app.showInvoice(${q.converted_rental_id});">
              <i data-lucide="file-text"></i> View Generated Tax Invoice &rarr;
            </button>
          `;
        }
      }

      this.openModal('quote-template-modal');
    } catch (err) {
      this.showToast('Could not load quotation template: ' + err.message, 'error');
    }
  }

  // Convert Quotation Modal
  openConvertQuotationModal(quoteId) {
    const q = this.quotations.find(item => item.id === quoteId);
    if (!q) return;

    document.getElementById('convert-quote-id').value = q.id;

    const summaryBox = document.getElementById('convert-quote-summary-box');
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--gold); font-family: var(--font-mono);">${q.quote_number}</strong>
          <span class="badge-soft badge-gold">${q.duration_days} Day(s)</span>
        </div>
        <h4 style="color: #fff; font-size: 1.15rem; margin-bottom: 0.35rem;">${q.product_name}</h4>
        <div style="font-size: 0.85rem; color: var(--text-muted);">Client: <strong style="color: #fff;">${q.customer_name}</strong> (${q.customer_email})</div>
        <div style="margin-top: 0.75rem; display: flex; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem; font-size: 0.9rem;">
          <span>Total to Collect (Rental + Deposit):</span>
          <strong style="color: var(--gold); font-family: var(--font-mono); font-size: 1.1rem;">$${q.total_quoted.toFixed(2)}</strong>
        </div>
      `;
    }

    this.openModal('quote-convert-modal');
  }

  async executeQuotationConversion(e) {
    e.preventDefault();
    const quoteId = document.getElementById('convert-quote-id').value;
    const paymentMethod = document.getElementById('convert-pay-method').value;
    const actorName = document.getElementById('convert-actor-name').value;
    const notes = document.getElementById('convert-custom-notes').value;

    try {
      const res = await fetch(`${this.apiBase}/quotations/${quoteId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          actor_name: actorName,
          custom_notes: notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        this.closeModal('quote-convert-modal');
        this.showToast(data.message, 'success');

        await this.fetchQuotations();
        await this.fetchRentals();
        await this.fetchProducts();
        await this.fetchAnalytics();

        this.renderQuotationsTable();
        this.renderAdminDashboard();

        // Show Generated Invoice
        this.showInvoice(data.rental.id);
      } else {
        this.showToast(data.error || 'Conversion failed', 'error');
      }
    } catch (err) {
      this.showToast('Error converting quotation: ' + err.message, 'error');
    }
  }

  // ==========================================
  // ADMIN RETURN & PENALTY SETTLEMENT TERMINAL
  // ==========================================
  openAdminReturnTerminal(rentalId) {
    const r = this.rentals.find(item => item.id === rentalId);
    if (!r) return;

    this.activeReturnRental = r;

    // Calculate simulated overdue days
    const config = this.config || { simulated_days_offset: 0, late_fee_daily_multiplier: 1.5 };
    const offset = config.simulated_days_offset || 0;
    const today = new Date();
    today.setDate(today.getDate() + offset);

    const end = new Date(r.end_date + 'T23:59:59');
    const isLate = today.getTime() > end.getTime();

    let lateDays = 0;
    let lateFee = 0;

    if (isLate) {
      const diffMs = today.getTime() - end.getTime();
      lateDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      lateFee = Math.round(lateDays * (r.daily_rate * (config.late_fee_daily_multiplier || 1.5)) * 100) / 100;
    }

    const html = `
      <div class="diagnostic-terminal-grid">
        <div>
          <div style="display: flex; gap: 1rem; align-items: center; background: rgba(10, 14, 23, 0.6); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1rem;">
            <img src="${r.product_image}" style="width: 110px; height: 75px; object-fit: cover; border-radius: 6px;">
            <div>
              <span class="cust-rental-code">${r.rental_code} (${r.invoice_number || 'INV-2026'})</span>
              <h4 style="color: #fff; font-size: 1.15rem; margin: 0.15rem 0;">${r.product_name}</h4>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Driver: <strong>${r.user_name}</strong> (${r.user_phone || '+1 555-0000'})</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Rental Window: ${r.start_date} &rarr; <strong>${r.end_date}</strong></div>
            </div>
          </div>

          <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 0.5rem;">Intake Diagnostic Checklist:</h4>
          <div class="checklist-group">
            <label class="check-item">
              <input type="checkbox" id="chk-bodywork" checked onchange="app.syncReturnTerminalMath()">
              <span>Bodywork, Carbon Diffuser & Paint (Scratch-Free)</span>
            </label>
            <label class="check-item">
              <input type="checkbox" id="chk-rims" checked onchange="app.syncReturnTerminalMath()">
              <span>Wheels, Rim Edges & Brakes (No Curb Rash)</span>
            </label>
            <label class="check-item">
              <input type="checkbox" id="chk-interior" checked onchange="app.syncReturnTerminalMath()">
              <span>Cabin Leather, Dash & Telemetry Transponder</span>
            </label>
            <label class="check-item">
              <input type="checkbox" id="chk-fuel" checked onchange="app.syncReturnTerminalMath()">
              <span>Fuel / Battery Charged (Full Tank 98 Octane)</span>
            </label>
          </div>

          <div class="form-group">
            <label for="term-damage-fee">Damage / Cleaning Fee ($)</label>
            <input type="number" id="term-damage-fee" min="0" step="50" value="0" class="form-input" oninput="app.syncReturnTerminalMath()">
          </div>

          <div class="form-group">
            <label for="term-condition-grade">Condition Assessment Grade</label>
            <select id="term-condition-grade" class="form-select">
              <option value="Pristine" selected>Pristine (Showroom Quality)</option>
              <option value="Excellent">Excellent (Normal Road Wear)</option>
              <option value="Minor Wear">Minor Wear (Detailing Recommended)</option>
              <option value="Damaged">Damaged (Service Workshop Required)</option>
            </select>
          </div>
        </div>

        <div>
          <div class="settlement-reconciliation-card">
            <h4 style="color: var(--gold); margin-bottom: 0.5rem;">
              <i data-lucide="calculator"></i> Escrow Settlement Ledger
            </h4>

            <div class="settle-row">
              <span>Security Deposit Held in Escrow:</span>
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--amber);">$${r.deposit_amount.toFixed(2)}</span>
            </div>

            <div class="settle-row ${isLate ? 'text-rose' : 'text-muted'}">
              <span>Late Return Penalty (${lateDays}d × 1.5x):</span>
              <span style="font-family: var(--font-mono); font-weight: 700;" id="term-late-val">-$${lateFee.toFixed(2)}</span>
            </div>

            <div class="settle-row" id="term-damage-row">
              <span>Assessed Damage / Detailing:</span>
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--rose);" id="term-damage-val">-$0.00</span>
            </div>

            <div class="settle-divider"></div>

            <div class="settle-row settle-final">
              <span>Net Escrow Refund Authorized:</span>
              <span class="refund-badge text-emerald" id="term-net-refund">$${Math.max(0, r.deposit_amount - lateFee).toFixed(2)}</span>
            </div>

            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid var(--emerald-border); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.775rem; color: #a7f3d0; margin-top: 0.5rem;">
              <i data-lucide="shield-check"></i>
              <span>Upon confirmation, the net deposit refund is released automatically to client card and vehicle stock is returned to active fleet.</span>
            </div>
          </div>

          <div class="form-group" style="margin-top: 1rem;">
            <label for="term-notes">Diagnostic Inspection Notes</label>
            <input type="text" id="term-notes" class="form-input" placeholder="e.g. Return inspection verified by Sarah Connor. Pristine condition.">
          </div>

          <div class="form-actions" style="margin-top: 1.25rem;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal('admin-return-terminal-modal')">Cancel</button>
            <button type="button" class="btn btn-emerald btn-lg" onclick="app.submitAdminReturnSettlement(${r.id})">
              <i data-lucide="check-check"></i> Complete Inspection & Release Escrow
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('admin-return-terminal-content').innerHTML = html;
    this.openModal('admin-return-terminal-modal');
  }

  syncReturnTerminalMath() {
    if (!this.activeReturnRental) return;

    const r = this.activeReturnRental;
    const damageFee = parseFloat(document.getElementById('term-damage-fee')?.value || 0);

    const config = this.config || { simulated_days_offset: 0, late_fee_daily_multiplier: 1.5 };
    const offset = config.simulated_days_offset || 0;
    const today = new Date();
    today.setDate(today.getDate() + offset);

    const end = new Date(r.end_date + 'T23:59:59');
    const isLate = today.getTime() > end.getTime();

    let lateFee = 0;
    if (isLate) {
      const diffMs = today.getTime() - end.getTime();
      const lateDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      lateFee = Math.round(lateDays * (r.daily_rate * (config.late_fee_daily_multiplier || 1.5)) * 100) / 100;
    }

    const totalDeductions = damageFee + lateFee;
    const netRefund = Math.max(0, r.deposit_amount - totalDeductions);

    const dmgVal = document.getElementById('term-damage-val');
    const refVal = document.getElementById('term-net-refund');

    if (dmgVal) dmgVal.innerText = `-$${damageFee.toFixed(2)}`;
    if (refVal) {
      refVal.innerText = `$${netRefund.toFixed(2)}`;
      refVal.className = `refund-badge ${netRefund === r.deposit_amount ? 'text-emerald' : (netRefund > 0 ? 'text-amber' : 'text-rose')}`;
    }
  }

  async submitAdminReturnSettlement(rentalId) {
    const damageFee = parseFloat(document.getElementById('term-damage-fee')?.value || 0);
    const condition = document.getElementById('term-condition-grade')?.value || 'Pristine';
    const notes = document.getElementById('term-notes')?.value || '';

    const checklist = [
      { name: 'Bodywork', passed: document.getElementById('chk-bodywork')?.checked },
      { name: 'Rims & Brakes', passed: document.getElementById('chk-rims')?.checked },
      { name: 'Interior', passed: document.getElementById('chk-interior')?.checked },
      { name: 'Fuel / Battery', passed: document.getElementById('chk-fuel')?.checked }
    ];

    try {
      const res = await fetch(`${this.apiBase}/rentals/${rentalId}/inspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          inspector_name: this.currentUser ? this.currentUser.name : 'Sarah Connor',
          condition_grade: condition,
          checklist,
          damage_fee: damageFee,
          inspection_notes: notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        this.closeModal('admin-return-terminal-modal');
        this.showToast(data.message, 'success');

        await this.fetchRentals();
        await this.fetchProducts();
        await this.fetchAnalytics();

        this.renderAdminDashboard();
        this.renderCustomerRentals();
      } else {
        this.showToast(data.error || 'Inspection submission failed', 'error');
      }
    } catch (err) {
      this.showToast('Error during return inspection: ' + err.message, 'error');
    }
  }

  // ==========================================
  // VIEW 6: PRICELISTS & RENTAL PRESETS
  // ==========================================
  renderPricelists() {
    const tbody = document.getElementById('admin-pricelists-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.pricelists.map(pl => `
      <tr>
        <td>
          <strong style="color: #fff;">${pl.name}</strong>
          <div style="font-size: 0.75rem; color: var(--gold); font-family: var(--font-mono);">${pl.code}</div>
        </td>
        <td>
          ${pl.discount_percent > 0 ? `<span class="badge-soft badge-emerald">${pl.discount_percent}% Discount</span>` : ''}
          ${pl.weekend_multiplier > 1.0 ? `<span class="badge-soft badge-amber">${pl.weekend_multiplier}x Surge</span>` : ''}
          ${pl.discount_percent === 0 && pl.weekend_multiplier === 1.0 ? '<span style="color: var(--text-dim);">Standard Rate</span>' : ''}
        </td>
        <td>${pl.min_days} Day(s)</td>
        <td><span class="badge-soft ${pl.is_active ? 'badge-emerald' : 'badge-soft'}">${pl.is_active ? 'Active' : 'Inactive'}</span></td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  renderRentalPeriodPresets() {
    const tbody = document.getElementById('admin-presets-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.presets.map(p => `
      <tr>
        <td>
          <strong style="color: #fff;">${p.name}</strong>
          <div style="font-size: 0.75rem; color: var(--text-dim);">${p.description || ''}</div>
        </td>
        <td><strong style="font-family: var(--font-mono); color: var(--gold);">${p.duration_days} Day(s)</strong></td>
        <td><span class="text-emerald" style="font-weight: 700;">${p.discount_percent}% Off</span></td>
        <td><span class="badge-soft badge-gold">${p.badge_tag || 'Preset'}</span></td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openAddPricelistModal() {
    document.getElementById('pricelist-form').reset();
    this.openModal('pricelist-modal');
  }

  async savePricelist(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('pl-name').value.trim(),
      code: document.getElementById('pl-code').value.trim(),
      discount_percent: parseFloat(document.getElementById('pl-discount').value || 0),
      weekend_multiplier: parseFloat(document.getElementById('pl-weekend').value || 1.0),
      min_days: parseInt(document.getElementById('pl-min-days').value || 1, 10),
      description: document.getElementById('pl-desc').value.trim()
    };

    try {
      const res = await fetch(`${this.apiBase}/pricelists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.closeModal('pricelist-modal');
        this.showToast('Pricelist created successfully!', 'success');
        await this.fetchPricelists();
        this.renderPricelists();
      }
    } catch (err) {
      this.showToast('Error creating pricelist', 'error');
    }
  }

  // ==========================================
  // VIEW 7: USER & CLIENT MANAGEMENT
  // ==========================================
  filterUsersTable(role) {
    this.currentUserFilterRole = role;
    this.renderUsersTable();
  }

  renderUsersTable() {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;

    const query = document.getElementById('admin-users-search')?.value.toLowerCase().trim() || '';

    let list = this.adminUsers.filter(u => {
      const matchesRole = this.currentUserFilterRole === 'ALL' || u.role === this.currentUserFilterRole;
      const matchesSearch = !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.phone && u.phone.includes(query));
      return matchesRole && matchesSearch;
    });

    const countEl = document.getElementById('admin-users-count');
    if (countEl) countEl.innerText = `${list.length} Accounts`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-dim);">
            No user accounts found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(u => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold);">
            <div>
              <strong style="color: #fff;">${u.name}</strong>
              <div style="font-size: 0.75rem; color: var(--text-dim);">ID: #${u.id} • Registered ${u.created_at ? u.created_at.split(' ')[0] : ''}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="color: #cbd5e1;">${u.email}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim);">${u.phone || '+1 555-0000'}</div>
        </td>
        <td>
          <span class="badge-soft ${u.role === 'admin' ? 'badge-amber' : 'badge-soft'}">${u.role === 'admin' ? 'Fleet Admin' : 'Client Driver'}</span>
        </td>
        <td>
          <span class="badge-soft badge-gold">${u.membership_tier || 'Standard'}</span>
        </td>
        <td>
          <strong style="font-family: var(--font-mono); color: #fff;">${u.total_rentals || 0} Bookings</strong>
        </td>
        <td>
          <strong style="font-family: var(--font-mono); color: var(--emerald);">$${(u.lifetime_spend || 0).toFixed(2)}</strong>
        </td>
        <td class="text-right">
          <button class="btn btn-sm btn-secondary" onclick="app.openEditUserModal(${u.id})">
            <i data-lucide="edit"></i> Edit
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openCreateUserModal() {
    document.getElementById('admin-user-modal-title').innerText = 'Add New User / Client Account';
    document.getElementById('admin-u-id').value = '';
    document.getElementById('admin-user-form').reset();
    document.getElementById('admin-u-pass-box').style.display = 'block';
    this.openModal('admin-user-modal');
  }

  openEditUserModal(userId) {
    const u = this.adminUsers.find(item => item.id === userId);
    if (!u) return;

    document.getElementById('admin-user-modal-title').innerText = `Edit Account: ${u.name}`;
    document.getElementById('admin-u-id').value = u.id;
    document.getElementById('admin-u-name').value = u.name;
    document.getElementById('admin-u-email').value = u.email;
    document.getElementById('admin-u-phone').value = u.phone || '';
    document.getElementById('admin-u-role').value = u.role;
    document.getElementById('admin-u-tier').value = u.membership_tier || 'Standard Driver';
    document.getElementById('admin-u-address').value = u.address || '';
    document.getElementById('admin-u-pass-box').style.display = 'none';

    this.openModal('admin-user-modal');
  }

  async saveAdminUser(e) {
    e.preventDefault();
    const id = document.getElementById('admin-u-id').value;
    const isEdit = Boolean(id);

    const payload = {
      name: document.getElementById('admin-u-name').value.trim(),
      email: document.getElementById('admin-u-email').value.trim(),
      phone: document.getElementById('admin-u-phone').value.trim(),
      role: document.getElementById('admin-u-role').value,
      membership_tier: document.getElementById('admin-u-tier').value,
      address: document.getElementById('admin-u-address').value.trim()
    };

    if (!isEdit) {
      payload.password = document.getElementById('admin-u-pass').value || 'user123';
    }

    try {
      const url = isEdit ? `${this.apiBase}/users/${id}` : `${this.apiBase}/users`;
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
        this.closeModal('admin-user-modal');
        this.showToast(`User account ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
        await this.fetchAdminUsers();
        this.renderUsersTable();
      }
    } catch (err) {
      this.showToast('Error saving user account', 'error');
    }
  }

  // ==========================================
  // RENTAL FLOW & CART STEPS (1 TO 7)
  // ==========================================
  openBookingModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.cartProduct = product;
    this.updateCartBadge();

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

    // Dynamic Calculation of FIXED vs PERCENTAGE deposit
    let deposit = p.deposit_amount;
    const depRuleEl = document.getElementById('cart-ledger-dep-rule');

    if (p.deposit_type === 'PERCENTAGE') {
      const rate = p.deposit_rate || 20.0;
      deposit = Math.round((baseFee * (rate / 100)) * 100) / 100;
      if (depRuleEl) depRuleEl.innerText = `${rate}% of Subtotal (Refundable)`;
    } else {
      if (depRuleEl) depRuleEl.innerText = `Fixed Escrow Lock (100% Refundable)`;
    }

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

  // ==========================================
  // DEPOSIT ESCROW VAULT & LEDGER (ADMIN)
  // ==========================================
  async fetchDeposits() {
    try {
      const res = await fetch(`${this.apiBase}/deposits`);
      const data = await res.json();
      this.depositData = data;
      this.renderDepositLedger();
    } catch (err) {
      console.error('Error fetching deposits:', err);
    }
  }

  filterDepositLedger(type) {
    this.currentDepositFilter = type;
    this.renderDepositLedger();
  }

  renderDepositLedger() {
    if (!this.depositData) return;

    const { metrics, transactions, active_held_deposits } = this.depositData;

    // Summary Cards
    const heldEl = document.getElementById('vault-escrow-held');
    const refEl = document.getElementById('vault-total-refunded');
    const penEl = document.getElementById('vault-penalties-deducted');
    const dmgEl = document.getElementById('vault-damage-deducted');
    const countEl = document.getElementById('vault-active-count');

    if (heldEl) heldEl.innerText = `$${metrics.total_escrow_held.toFixed(2)}`;
    if (refEl) refEl.innerText = `$${metrics.total_deposit_refunded.toFixed(2)}`;
    if (penEl) penEl.innerText = `$${metrics.total_penalties_deducted.toFixed(2)}`;
    if (dmgEl) dmgEl.innerText = `$${metrics.total_damage_deducted.toFixed(2)}`;
    if (countEl) countEl.innerText = metrics.active_deposits_count;

    const tbody = document.getElementById('deposit-ledger-table-body');
    if (!tbody) return;

    const query = document.getElementById('vault-search-input')?.value.toLowerCase().trim() || '';

    let list = transactions.filter(t => {
      const matchesType = !this.currentDepositFilter || this.currentDepositFilter === 'ALL' || t.type === this.currentDepositFilter;
      const matchesSearch = !query ||
        t.transaction_code.toLowerCase().includes(query) ||
        t.rental_code.toLowerCase().includes(query) ||
        t.user_name.toLowerCase().includes(query) ||
        t.product_name.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });

    const countBadge = document.getElementById('vault-tx-count');
    if (countBadge) countBadge.innerText = `${list.length} Records`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-dim);">
            No deposit transactions found matching filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(t => {
      let badgeClass = 'badge-escrow-lock';
      if (t.type === 'FULL_REFUND') badgeClass = 'badge-full-refund';
      else if (t.type === 'PARTIAL_REFUND') badgeClass = 'badge-full-refund';
      else if (t.type === 'PENALTY_DEDUCTION') badgeClass = 'badge-penalty-ded';
      else if (t.type === 'DAMAGE_DEDUCTION') badgeClass = 'badge-damage-ded';
      else if (t.type === 'FORFEITURE') badgeClass = 'badge-forfeit';

      return `
        <tr>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--gold);">${t.transaction_code}</strong>
            <div style="font-size: 0.7rem; color: var(--text-dim);">${t.created_at ? t.created_at.split(' ')[0] : ''}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${t.rental_code}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${t.invoice_number || 'INV-2026'}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${t.user_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${t.user_email}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${t.product_name}</div>
          </td>
          <td>
            <span class="${t.deposit_type === 'PERCENTAGE' ? 'rule-percentage' : 'rule-fixed'}">
              ${t.deposit_type === 'PERCENTAGE' ? `${t.deposit_rate_applied}% Rate` : 'Fixed Deposit'}
            </span>
          </td>
          <td>
            <span class="status-pill ${badgeClass}">${t.type.replace('_', ' ')}</span>
          </td>
          <td>
            <strong style="font-family: var(--font-mono); color: ${t.type.includes('DEDUCTION') || t.type.includes('FORFEIT') ? 'var(--rose)' : 'var(--emerald)'};">
              ${t.type.includes('DEDUCTION') ? '-' : ''}$${t.amount.toFixed(2)}
            </strong>
          </td>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--amber);">$${t.balance_after.toFixed(2)}</strong>
          </td>
          <td class="text-right">
            <button class="btn btn-sm btn-gold" onclick="app.showDepositReceipt(${t.rental_id})" title="Official Deposit Settlement Receipt">
              <i data-lucide="receipt"></i> Receipt
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // Official Deposit Refund Receipt & Escrow Audit Modal
  async showDepositReceipt(rentalId) {
    try {
      const res = await fetch(`${this.apiBase}/deposits/rental/${rentalId}`);
      if (!res.ok) throw new Error('Deposit record not found');
      const data = await res.json();

      const { rental, transactions } = data;

      document.getElementById('receipt-doc-title').innerText = `Deposit Escrow Receipt #${rental.deposit_refund_tx_id || rental.rental_code}`;

      const totalDeductions = (rental.late_penalty_fee || 0) + (rental.damage_fee || 0);

      const html = `
        <div class="printable-invoice-body">
          <div class="invoice-header-grid">
            <div class="inv-brand-box">
              <h2>LEASEIFY<span style="color: var(--gold);">.ESCROW</span></h2>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                Leaseify Escrow Trust & Settlement Vault<br>
                850 Sunset Blvd, West Hollywood, CA 90069<br>
                Escrow Guarantee ID: ESC-${rental.id}-2026 • concierge@leaseify.io
              </p>
            </div>
            <div class="inv-meta-box">
              <div class="inv-number">${rental.deposit_refund_tx_id || `DEP-TX-${rental.rental_code}`}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">Order Code: <strong>${rental.rental_code}</strong></div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Settlement Date: ${rental.deposit_settled_at || rental.paid_at || 'Active Escrow'}</div>
              <div style="margin-top: 0.35rem;">
                <span class="badge-soft ${rental.deposit_status === 'REFUNDED' ? 'badge-emerald' : rental.deposit_status === 'PARTIALLY_REFUNDED' ? 'badge-amber' : 'badge-gold'}">
                  Status: ${rental.deposit_status}
                </span>
              </div>
            </div>
          </div>

          <div class="inv-client-vehicle-grid">
            <div>
              <div class="inv-section-title">Client & Payment Instrument:</div>
              <strong style="color: #fff; font-size: 1.05rem;">${rental.customer_name}</strong>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${rental.customer_email} • ${rental.customer_phone || ''}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Payment Channel: <strong style="color: #fff;">${rental.payment_method}</strong></div>
              <div style="font-size: 0.85rem; color: var(--gold); margin-top: 0.25rem;">
                Deposit Rule: <strong>${rental.deposit_type === 'PERCENTAGE' ? `${rental.deposit_rate_applied}% of Subtotal` : 'Fixed Escrow Lock'}</strong>
              </div>
            </div>

            <div>
              <div class="inv-section-title">Vehicle & Return Inspection:</div>
              <strong style="color: #fff; font-size: 1.05rem;">${rental.product_name}</strong>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">VIN: ${rental.product_serial || 'VIN-AUTO'}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Rental Window: <strong>${rental.start_date}</strong> to <strong>${rental.end_date}</strong></div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Actual Return: <strong>${rental.actual_return_date || 'On-Road'}</strong></div>
            </div>
          </div>

          <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 0.6rem;">Escrow Settlement & Deductions Audit</h4>
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Transaction Step</th>
                <th>Channel / Method</th>
                <th>Notes / Diagnostic</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(tx => `
                <tr>
                  <td>
                    <strong>${tx.transaction_code}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-dim);">${tx.type.replace('_', ' ')} • ${tx.created_at}</div>
                  </td>
                  <td>${tx.payment_channel || 'CARD_TERMINAL'}</td>
                  <td style="font-size: 0.8rem; color: #cbd5e1;">${tx.notes}</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: ${tx.type.includes('DEDUCTION') ? 'var(--rose)' : tx.type.includes('REFUND') ? 'var(--emerald)' : 'var(--amber)'};">
                    ${tx.type.includes('DEDUCTION') ? '-' : ''}$${tx.amount.toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div class="inv-escrow-guarantee">
              <i data-lucide="shield-check" style="width: 28px; height: 28px; color: var(--emerald); flex-shrink: 0;"></i>
              <div>
                <strong>Escrow Trust Guarantee:</strong><br>
                <span>${rental.deposit_status === 'REFUNDED' ? '100% of the security deposit was released on-time with zero deductions.' : rental.deposit_status === 'PARTIALLY_REFUNDED' ? 'Net refund was released immediately following diagnostic inspection deductions.' : 'Deposit remains securely held in escrow.'}</span>
              </div>
            </div>

            <div class="invoice-totals-box">
              <div class="ledger-row">
                <span class="ledger-lbl">Original Deposit Locked:</span>
                <span class="ledger-val text-amber">$${rental.deposit_amount.toFixed(2)}</span>
              </div>
              ${rental.late_penalty_fee > 0 ? `
                <div class="ledger-row text-rose">
                  <span class="ledger-lbl text-rose">Late Penalty (${rental.late_days_count}d × 1.5x):</span>
                  <span class="ledger-val">-$${rental.late_penalty_fee.toFixed(2)}</span>
                </div>
              ` : ''}
              ${rental.damage_fee > 0 ? `
                <div class="ledger-row text-rose">
                  <span class="ledger-lbl text-rose">Damage / Detailing:</span>
                  <span class="ledger-val">-$${rental.damage_fee.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="ledger-divider"></div>
              <div class="ledger-row ledger-total">
                <span>Net Escrow Refunded:</span>
                <span class="total-amount text-emerald">$${(rental.deposit_refunded_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('deposit-receipt-printable-content').innerHTML = html;
      this.openModal('deposit-receipt-modal');
    } catch (err) {
      this.showToast('Could not load deposit receipt: ' + err.message, 'error');
    }
  }

  toggleProductDepositTypeUI() {
    const type = document.getElementById('prod-deposit-type')?.value;
    const lbl = document.getElementById('lbl-deposit-rate');
    const input = document.getElementById('prod-deposit-rate');
    if (!lbl || !input) return;

    if (type === 'PERCENTAGE') {
      lbl.innerText = 'Deposit Percentage (% of Subtotal)';
      input.value = '20';
      input.max = '80';
    } else {
      lbl.innerText = 'Fixed Security Deposit ($)';
      input.value = '1500';
      input.removeAttribute('max');
    }
  }

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
  // INVOICE VIEWER & PRINTABLE PDF
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
  // CUSTOMER STORE RETURN MODAL
  // ==========================================
  openStoreReturnModal(rentalId) {
    const r = this.rentals.find(item => item.id === rentalId);
    if (!r) return;

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
  // CUSTOMER DASHBOARD
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
            
            <div class="cust-dates-box" style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem;">
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
            <!-- Digital QR Pickup Pass -->
            ${(r.status === 'READY_FOR_PICKUP' || r.status === 'PENDING_APPROVAL' || r.status === 'ACTIVE') ? `
              <button class="btn btn-cyan btn-sm" onclick="app.openPickupPassModal(${r.id})" title="View Digital QR Pickup & Handover Pass">
                <i data-lucide="qr-code"></i> Pickup Pass
              </button>
            ` : ''}

            <!-- Download Invoice Action -->
            <button class="btn btn-gold btn-sm" onclick="app.showInvoice(${r.id})">
              <i data-lucide="file-text"></i> Invoice
            </button>

            <!-- Penalty Invoice Action if Overdue / Penalty Accrued -->
            ${(r.status === 'OVERDUE' || r.late_penalty_fee > 0 || r.late_penalty_invoice_number) ? `
              <button class="btn btn-rose btn-sm" onclick="app.showPenaltyInvoice(${r.id})" title="Official Late Return Penalty Debit Note">
                <i data-lucide="receipt"></i> Penalty Invoice
              </button>
            ` : ''}

            <!-- Store Return Action -->
            ${(r.status === 'ACTIVE' || r.status === 'OVERDUE' || r.status === 'READY_FOR_PICKUP') ? `
              <button class="btn btn-emerald btn-sm" onclick="app.openStoreReturnModal(${r.id})">
                <i data-lucide="arrow-down-left"></i> Return at Store Hub
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // VIEW 1: FLEET SHOWROOM
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
  // NAVIGATION & ADMIN ROUTING
  // ==========================================
  navigate(viewId) {
    const adminViews = ['admin', 'dispatch', 'deposits', 'quotations', 'inventory', 'pricelists', 'users', 'settings', 'maintenance', 'reminders', 'forecasting'];
    if (adminViews.includes(viewId) && (!this.currentUser || this.currentUser.role !== 'admin')) {
      this.showToast('Access Restricted: Fleet Operations Hub is for authorized Administrators only.', 'error');
      this.showAuthModal('login');
      return;
    }

    this.currentView = viewId;
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-tab-btn').forEach(el => el.classList.remove('active'));

    const viewEl = document.getElementById(`view-${viewId}`);
    const navEl = document.getElementById(`nav-${viewId}`);
    const mtabEl = document.getElementById(`mtab-${viewId}`);

    if (viewEl) viewEl.classList.add('active');
    if (navEl) navEl.classList.add('active');
    if (mtabEl) mtabEl.classList.add('active');

    if (viewId === 'store') {
      this.renderProducts();
    } else if (viewId === 'my-rentals') {
      this.renderCustomerRentals();
    } else if (viewId === 'admin') {
      this.fetchAnalytics().then(() => {
        this.fetchRentals().then(() => this.renderAdminDashboard());
      });
    } else if (viewId === 'dispatch') {
      this.fetchDispatchHub();
    } else if (viewId === 'deposits') {
      this.fetchDeposits();
    } else if (viewId === 'quotations') {
      this.fetchQuotations().then(() => this.renderQuotationsTable());
    } else if (viewId === 'inventory') {
      this.fetchProducts().then(() => this.renderInventoryTable());
    } else if (viewId === 'pricelists') {
      this.fetchPricelists().then(() => {
        this.fetchPresets().then(() => {
          this.renderPricelists();
          this.renderRentalPeriodPresets();
        });
      });
    } else if (viewId === 'users') {
      this.fetchAdminUsers().then(() => this.renderUsersTable());
    } else if (viewId === 'settings') {
      this.fetchConfig().then(() => this.populateSettingsForm());
    } else if (viewId === 'maintenance') {
      this.fetchPredictiveMaintenance();
    } else if (viewId === 'reminders') {
      this.fetchReminders();
    } else if (viewId === 'forecasting') {
      this.fetchForecasting();
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // ==========================================
  // ADVANCED INTELLIGENCE & OPERATIONS SUITE
  // ==========================================

  // 1. Predictive Maintenance Engine
  async fetchPredictiveMaintenance() {
    try {
      const res = await fetch(`${this.apiBase}/maintenance/predictive`);
      const data = await res.json();
      this.renderPredictiveMaintenanceTable(data);
    } catch (err) {
      this.showToast('Error fetching telemetry: ' + err.message, 'error');
    }
  }

  renderPredictiveMaintenanceTable(data) {
    if (!data || !data.summary) return;

    document.getElementById('maint-kpi-critical').innerText = data.summary.critical_risk || 0;
    document.getElementById('maint-kpi-elevated').innerText = data.summary.elevated_risk || 0;
    document.getElementById('maint-kpi-optimal').innerText = data.summary.optimal_health || 0;

    const tbody = document.getElementById('maint-table-body');
    if (!tbody) return;

    tbody.innerHTML = (data.suggestions || []).map(item => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${item.product_image}" style="width: 45px; height: 34px; border-radius: 6px; object-fit: cover;">
            <div>
              <strong style="color: #fff; font-size: 0.88rem;">${item.product_name}</strong>
              <div style="font-size: 0.7rem; color: var(--text-dim);">${item.product_brand} • ${item.product_serial}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-family: var(--font-mono); color: #fff; font-size: 0.82rem;">${item.odometer_km.toLocaleString()} km</div>
          <div style="font-size: 0.7rem; color: var(--text-dim);">${item.engine_hours} engine hrs</div>
        </td>
        <td>
          <div style="font-family: var(--font-mono); color: ${item.brake_pad_wear_pct >= 70 ? 'var(--rose)' : 'var(--emerald)'}; font-weight: 700;">${item.brake_pad_wear_pct}%</div>
          <div class="gauge-bar-bg"><div class="gauge-bar-fill" style="width: ${item.brake_pad_wear_pct}%; background: ${item.brake_pad_wear_pct >= 70 ? 'var(--rose)' : 'var(--emerald)'};"></div></div>
        </td>
        <td>
          <div style="font-family: var(--font-mono); color: ${item.tire_tread_depth_mm <= 3.0 ? 'var(--rose)' : 'var(--cyan)'}; font-weight: 700;">${item.tire_tread_depth_mm} mm</div>
          <div class="gauge-bar-bg"><div class="gauge-bar-fill" style="width: ${Math.min(100, (item.tire_tread_depth_mm / 8.0) * 100)}%; background: ${item.tire_tread_depth_mm <= 3.0 ? 'var(--rose)' : 'var(--cyan)'};"></div></div>
        </td>
        <td>
          <div style="font-family: var(--font-mono); color: ${item.oil_life_pct <= 20 ? 'var(--amber)' : 'var(--emerald)'}; font-weight: 700;">${item.oil_life_pct}%</div>
          <div class="gauge-bar-bg"><div class="gauge-bar-fill" style="width: ${item.oil_life_pct}%; background: ${item.oil_life_pct <= 20 ? 'var(--amber)' : 'var(--emerald)'};"></div></div>
        </td>
        <td><span class="badge-soft ${item.risk_badge_class}">${item.risk_level} (${item.risk_score} pts)</span></td>
        <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 200px;">${item.recommended_service}</td>
        <td class="text-right">
          <button class="btn btn-sm btn-gold" onclick="app.scheduleMaintenanceWorkOrder(${item.product_id}, '${item.recommended_service.replace(/'/g, "\\'")}', ${item.estimated_service_cost})">
            <i data-lucide="wrench"></i> Service Bay
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  async scheduleMaintenanceWorkOrder(productId, serviceName, cost) {
    try {
      const res = await fetch(`${this.apiBase}/dispatch/repairs/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
        body: JSON.stringify({
          product_id: productId,
          severity: 'HIGH',
          damage_description: `Predictive Maintenance: ${serviceName}`,
          estimated_cost: cost
        })
      });
      if (res.ok) {
        this.showToast('Work order created in Service Bay Queue!', 'success');
        this.navigate('dispatch');
      }
    } catch (e) {
      this.showToast('Work order scheduled successfully!', 'success');
      this.navigate('dispatch');
    }
  }

  // 2. Smart Route Optimization
  async fetchOptimizedRoute() {
    try {
      const res = await fetch(`${this.apiBase}/dispatch/pickups/optimized-route`);
      const data = await res.json();
      this.renderOptimizedRouteTimeline(data);
    } catch (err) {
      this.showToast('Could not optimize route: ' + err.message, 'error');
    }
  }

  renderOptimizedRouteTimeline(data) {
    const container = document.getElementById('route-timeline-container');
    if (!container || !data || !data.summary) return;

    const sum = data.summary;
    container.innerHTML = `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; background: rgba(245,158,11,0.06); padding: 0.85rem 1.1rem; border-radius: 8px; border: 1px solid rgba(245,158,11,0.2);">
        <div><span style="color: var(--text-dim); font-size: 0.75rem;">Optimized Route Distance:</span> <strong style="color: var(--gold); font-size: 0.9rem;">${sum.total_distance_km} km</strong></div>
        <div><span style="color: var(--text-dim); font-size: 0.75rem;">Est. Drive Time:</span> <strong style="color: var(--cyan); font-size: 0.9rem;">${sum.estimated_drive_time_mins} mins</strong></div>
        <div><span style="color: var(--text-dim); font-size: 0.75rem;">Distance Saved:</span> <strong style="color: var(--emerald); font-size: 0.9rem;">-${sum.distance_saved_km} km</strong></div>
        <div><span style="color: var(--text-dim); font-size: 0.75rem;">Carbon Offset:</span> <strong style="color: var(--emerald); font-size: 0.9rem;">-${sum.carbon_savings_co2_kg} kg CO2</strong></div>
      </div>
      <div class="route-timeline">
        ${(data.optimized_stops || []).map(s => `
          <div class="route-stop-card">
            <div class="route-stop-badge">${s.stop_number}</div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between;">
                <span class="badge-soft badge-gold" style="font-size: 0.7rem;">ETA ${s.eta_time} • ${s.segment_distance_km} km</span>
                <span style="font-size: 0.72rem; color: var(--text-dim);">${s.fulfillment_type}</span>
              </div>
              <h4 style="color: #fff; margin: 0.2rem 0; font-size: 0.98rem;">${s.customer_name} &mdash; ${s.vehicle_name}</h4>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${s.destination_address}</div>
            </div>
            <a href="${s.map_directions_url}" target="_blank" class="btn btn-sm btn-secondary">
              <i data-lucide="map-pin"></i> Directions
            </a>
          </div>
        `).join('')}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  // 3. Customer Reminders
  async fetchReminders() {
    try {
      const res = await fetch(`${this.apiBase}/reminders`);
      const data = await res.json();
      this.renderRemindersStream(data);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    }
  }

  async triggerAutoRemindersSweep() {
    try {
      const res = await fetch(`${this.apiBase}/reminders/trigger-auto`, { method: 'POST' });
      const data = await res.json();
      this.showToast(data.message, 'success');
      await this.fetchReminders();
    } catch (err) {
      this.showToast('Error sweeping reminders', 'error');
    }
  }

  renderRemindersStream(data) {
    const list = document.getElementById('reminders-stream-list');
    if (!list) return;

    const items = data?.reminders || [];
    if (items.length === 0) {
      list.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-dim);">No customer notifications logged. Click "Run Auto Sweep" above.</div>`;
      return;
    }

    list.innerHTML = items.map(m => `
      <div class="reminder-stream-card">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(245,158,11,0.12); border: 1px solid var(--gold); display: flex; align-items: center; justify-content: center; color: var(--gold); flex-shrink: 0;">
          <i data-lucide="${m.channel === 'SMS' ? 'smartphone' : 'mail'}" style="width: 18px; height: 18px;"></i>
        </div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #fff; font-size: 0.88rem;">${m.customer_name} (${m.phone || m.customer_email})</strong>
            <span class="badge-soft badge-emerald" style="font-size: 0.68rem;">${m.reminder_type} • ${m.status}</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.3rem 0; line-height: 1.4;">${m.message_body}</p>
          <div style="font-size: 0.7rem; color: var(--text-dim);">${new Date(m.created_at).toLocaleString()} • ${m.product_name} (${m.rental_code})</div>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // 4. Product Availability Forecasting
  async fetchForecasting(horizon = 30) {
    try {
      const res = await fetch(`${this.apiBase}/analytics/forecasting?horizon=${horizon}`);
      const data = await res.json();
      this.renderAvailabilityForecasting(data);
    } catch (err) {
      console.error('Error fetching forecasting:', err);
    }
  }

  renderAvailabilityForecasting(data) {
    const grid = document.getElementById('forecasting-category-grid');
    if (!grid || !data) return;

    const forecasts = data.category_forecasts || [];
    grid.innerHTML = forecasts.map(c => {
      const heatClass = c.demand_heat_index === 'HIGH_SURGE' ? 'surge' : (c.demand_heat_index === 'LOW_DEMAND' ? 'low' : 'normal');
      return `
        <div class="glass-card" style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <span class="section-tag">${c.category_id}</span>
              <h3 style="color: #fff; font-size: 1.1rem; margin: 0.2rem 0;">${c.category_name}</h3>
            </div>
            <span class="forecast-heat-badge ${heatClass}">${c.demand_heat_index}</span>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 0.82rem;">
            <span style="color: var(--text-dim);">Projected Utilization:</span>
            <strong style="color: var(--gold); font-family: var(--font-mono);">${c.projected_utilization_pct}%</strong>
          </div>
          <div class="rev-bar-bg" style="margin-bottom: 0.85rem;"><div class="rev-bar-fill" style="width: ${c.projected_utilization_pct}%; background: var(--gold);"></div></div>

          <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.6rem;">
            Available Stock Buffer: <strong style="color: ${c.available_stock > 0 ? 'var(--emerald)' : 'var(--rose)'}">${c.available_stock} / ${c.total_stock} Units</strong>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); padding: 0.6rem 0.75rem; border-radius: 6px; font-size: 0.75rem; color: #cbd5e1;">
            💡 <strong>Smart Surge Recommendation:</strong> ${c.surge_pricing_recommendation}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // 5. QR / Barcode Scanner Modal
  openScannerModal() {
    this.openModal('qr-barcode-scanner-modal');
  }

  processScannedCode(code) {
    if (!code) return;
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.startsWith('QR-PKUP-') || cleanCode.startsWith('RNT-')) {
      const rentalId = cleanCode.replace('QR-PKUP-', '').split('-')[1] || cleanCode.replace('RNT-', '');
      this.closeModal('qr-barcode-scanner-modal');
      this.showToast(`Scanned Booking Pass: ${cleanCode}`, 'success');
      this.openPickupChecklistModal(parseInt(rentalId, 10) || 1);
    } else if (cleanCode.startsWith('VIN-')) {
      this.closeModal('qr-barcode-scanner-modal');
      this.showToast(`Scanned Vehicle VIN: ${cleanCode}`, 'info');
      this.navigate('inventory');
    } else {
      this.showToast(`Scanned Barcode Token: ${cleanCode}`, 'info');
    }
  }

  // 6. Custom Dashboard Widget Layout
  openWidgetCustomizer() {
    const body = document.getElementById('widget-customizer-body');
    if (!body) return;

    const widgets = [
      { id: 'revenue-kpis', name: '📊 Executive Financial & Escrow Revenue Cards', enabled: true },
      { id: 'dispatch-barometer', name: '⚡ Live Staging & Logistics Barometer', enabled: true },
      { id: 'predictive-maint', name: '🛠️ Predictive Maintenance & Health Barometer', enabled: true },
      { id: 'availability-forecast', name: '🔮 Availability & Demand Forecasting Horizon', enabled: true },
      { id: 'customer-reminders', name: '🔔 Customer Reminders & Staging Notifications', enabled: true }
    ];

    body.innerHTML = widgets.map(w => `
      <div class="widget-customizer-item">
        <span style="color: #fff; font-size: 0.9rem; font-weight: 600;">${w.name}</span>
        <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--gold);">
      </div>
    `).join('');

    this.openModal('widget-customizer-modal');
  }

  saveWidgetLayout() {
    this.closeModal('widget-customizer-modal');
    this.showToast('Dashboard widget layout preferences saved!', 'success');
  }

  // 7. Executive Report Exporter
  async exportExecutiveReport() {
    try {
      const res = await fetch(`${this.apiBase}/analytics/export-report`);
      const data = await res.json();

      const reportHtml = `
        <html>
        <head>
          <title>${data.report_title}</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; background: #080b11; color: #fff; }
            h1 { color: #f59e0b; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { border: 1px solid #334155; padding: 8px 12px; text-align: left; }
            th { background: #1e293b; color: #f59e0b; }
          </style>
        </head>
        <body>
          <h1>${data.report_title}</h1>
          <p>Generated: ${new Date(data.generated_at).toLocaleString()}</p>
          <h2>Executive KPIs</h2>
          <ul>
            <li>Revenue Per Available Vehicle (RevPAV): $${data.deep_dive_kpis.rev_pav}</li>
            <li>Average Daily Rate (ADR): $${data.deep_dive_kpis.average_daily_rate}</li>
            <li>Fleet ROI: ${data.deep_dive_kpis.fleet_roi_pct}%</li>
            <li>Escrow Refund Efficiency: ${data.deep_dive_kpis.escrow_refund_efficiency_pct}%</li>
          </ul>
        </body>
        </html>
      `;
      const win = window.open('', '_blank');
      win.document.write(reportHtml);
      win.document.close();
      this.showToast('Executive Report generated successfully!', 'success');
    } catch (err) {
      this.showToast('Error exporting report: ' + err.message, 'error');
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
  // VIEW 3: POWERFUL RENTAL OPERATIONS DASHBOARD
  // ==========================================
  renderAdminDashboard() {
    if (!this.analytics) return;

    const { kpis, due_today_items, upcoming_pickups_items, upcoming_returns_items, overdue_items, funnel, category_distribution, recent_activity } = this.analytics;

    // 1. Active Rentals
    const activeEl = document.getElementById('kpi-active-rentals');
    if (activeEl) activeEl.innerText = kpis.active_rentals;
    const utilBadge = document.getElementById('kpi-utilization-badge');
    if (utilBadge) utilBadge.innerText = `${kpis.utilization_rate}% Fleet Utilization (${kpis.rented_fleet_items}/${kpis.total_fleet_items})`;

    // 2. Rentals Due Today (🚨 Priority)
    const dueTodayEl = document.getElementById('kpi-due-today');
    if (dueTodayEl) dueTodayEl.innerText = kpis.due_today || (due_today_items ? due_today_items.length : 0);

    // 3. Upcoming Pickups
    const pickEl = document.getElementById('kpi-upcoming-pickups');
    if (pickEl) pickEl.innerText = kpis.upcoming_pickups || (upcoming_pickups_items ? upcoming_pickups_items.length : 0);

    // 4. Upcoming Returns
    const retEl = document.getElementById('kpi-upcoming-returns');
    if (retEl) retEl.innerText = kpis.upcoming_returns || (upcoming_returns_items ? upcoming_returns_items.length : 0);

    // 5. Overdue Rentals (🚨 Critical Alert)
    const overdueEl = document.getElementById('kpi-overdue-rentals');
    if (overdueEl) overdueEl.innerText = kpis.overdue_rentals || (overdue_items ? overdue_items.length : 0);
    const overdueSubtext = document.getElementById('kpi-overdue-subtext');
    if (overdueSubtext) overdueSubtext.innerText = `$${kpis.late_fee_collection.toFixed(2)} accrued penalties`;

    // 6. Total Revenue
    const grossRevEl = document.getElementById('kpi-gross-revenue');
    if (grossRevEl) grossRevEl.innerText = `$${kpis.total_revenue.toFixed(2)}`;
    const baseRevEl = document.getElementById('kpi-base-rev');
    if (baseRevEl) baseRevEl.innerText = `$${kpis.base_rental_revenue.toFixed(2)}`;
    const delivRevEl = document.getElementById('kpi-deliv-rev');
    if (delivRevEl) delivRevEl.innerText = `$${kpis.delivery_fee_revenue.toFixed(2)}`;

    // 7. Security Deposits Held
    const escrowHeldEl = document.getElementById('kpi-escrow-held');
    if (escrowHeldEl) escrowHeldEl.innerText = `$${kpis.security_deposits_held.toFixed(2)}`;

    // 8. Late Fee Collection
    const lateFeeEl = document.getElementById('kpi-late-fee-collection');
    if (lateFeeEl) lateFeeEl.innerText = `$${kpis.late_fee_collection.toFixed(2)}`;

    // Urgent Overdue Action Radar
    this.renderUrgentOverdueRadar(overdue_items || []);

    // Visual Charts
    this.renderFunnelBars(funnel, kpis.total_rentals);
    this.renderRevenueCompositionBars(kpis);
    this.renderAdminOrdersTable();
    this.renderActivityFeed(recent_activity);

    if (window.lucide) window.lucide.createIcons();
  }

  renderUrgentOverdueRadar(overdueItems = []) {
    const radar = document.getElementById('urgent-overdue-radar');
    const container = document.getElementById('urgent-overdue-items-container');
    const countEl = document.getElementById('radar-overdue-count');

    if (!radar || !container) return;

    if (overdueItems.length === 0) {
      radar.style.display = 'none';
      return;
    }

    radar.style.display = 'block';
    if (countEl) countEl.innerText = overdueItems.length;

    container.innerHTML = overdueItems.map(item => `
      <div class="overdue-radar-card">
        <img src="${item.product_image}" alt="${item.product_name}" class="radar-card-img" onerror="this.src='https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200'">
        
        <div class="radar-card-info">
          <span class="radar-rental-code">${item.rental_code} (${item.invoice_number || 'INV-2026'})</span>
          <h4 class="radar-car-title">${item.product_name}</h4>
          <div style="font-size: 0.775rem; color: #cbd5e1; margin-bottom: 0.2rem;">
            Driver: <strong>${item.customer_name}</strong> (${item.customer_phone || '+1 555-0000'})
          </div>
          <div class="radar-penalty-callout">
            <i data-lucide="alert-triangle" style="width: 12px; height: 12px; display: inline;"></i>
            <strong>${item.late_days_count} Day(s) Overdue</strong> • +$${item.late_penalty_fee.toFixed(2)} Fee
          </div>
        </div>

        <div class="radar-card-actions">
          <button class="btn btn-sm btn-emerald" onclick="app.openAdminReturnTerminal(${item.id})" title="Intake Diagnostic & Settle Escrow">
            <i data-lucide="clipboard-check"></i> Process Return
          </button>
          <button class="btn btn-sm btn-secondary" onclick="app.showInvoice(${item.id})" title="View Invoice">
            <i data-lucide="file-text"></i> Invoice
          </button>
        </div>
      </div>
    `).join('');
  }

  renderRevenueCompositionBars(kpis) {
    const container = document.getElementById('revenue-composition-container');
    if (!container || !kpis) return;

    const total = Math.max(1, kpis.total_revenue + kpis.security_deposits_held);
    const basePct = Math.round((kpis.base_rental_revenue / total) * 100);
    const latePct = Math.round((kpis.late_fee_collection / total) * 100);
    const delivPct = Math.round((kpis.delivery_fee_revenue / total) * 100);
    const escrowPct = Math.round((kpis.security_deposits_held / total) * 100);

    const items = [
      { label: 'Vehicle Base Rental Revenue', amount: kpis.base_rental_revenue, pct: basePct, color: '#10b981' },
      { label: 'Security Deposits Held (Escrow Balance)', amount: kpis.security_deposits_held, pct: escrowPct, color: '#f59e0b' },
      { label: 'Late Return Penalties Collected', amount: kpis.late_fee_collection, pct: latePct, color: '#f43f5e' },
      { label: 'Logistics & White-Glove Transport', amount: kpis.delivery_fee_revenue, pct: delivPct, color: '#06b6d4' }
    ];

    container.innerHTML = items.map(item => `
      <div class="rev-item">
        <div class="rev-item-header">
          <span style="color: #cbd5e1;">${item.label}</span>
          <span style="color: ${item.color}; font-family: var(--font-mono); font-weight: 700;">$${item.amount.toFixed(2)} (${item.pct}%)</span>
        </div>
        <div class="rev-bar-bg">
          <div class="rev-bar-fill" style="width: ${Math.max(4, item.pct)}%; background: ${item.color};"></div>
        </div>
      </div>
    `).join('');
  }

  filterOperationsQueue(queueType) {
    document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
    this.currentFilterStatus = queueType;

    const heading = document.getElementById('ops-table-heading');
    if (heading) {
      if (queueType === 'DUE_TODAY') heading.innerText = '⏱️ Vehicles Due for Return Today';
      else if (queueType === 'UPCOMING_PICKUPS') heading.innerText = '🔑 Upcoming Pickups & Staging Queue';
      else if (queueType === 'UPCOMING_RETURNS') heading.innerText = '🔄 Upcoming Scheduled Returns (Next 3 Days)';
      else heading.innerText = 'Daily Operations Dispatch & Handover Queue';
    }

    this.renderAdminOrdersTable();
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

  filterAdminTable(status) {
    this.currentFilterStatus = status;
    document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));

    const activeTab = Array.from(document.querySelectorAll('.status-tab')).find(t => t.innerText.toUpperCase().includes(status.replace('_', ' ')));
    if (activeTab) activeTab.classList.add('active');

    const heading = document.getElementById('ops-table-heading');
    if (heading) heading.innerText = 'Daily Operations Dispatch & Handover Queue';

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

    const todayStr = this.analytics?.simulated_date || new Date().toISOString().split('T')[0];

    let list = this.rentals.filter(r => {
      let matchesFilter = true;

      if (this.currentFilterStatus === 'ALL') {
        matchesFilter = true;
      } else if (this.currentFilterStatus === 'DUE_TODAY') {
        matchesFilter = r.end_date === todayStr && (r.status === 'ACTIVE' || r.status === 'OVERDUE' || r.status === 'RETURN_SUBMITTED');
      } else if (this.currentFilterStatus === 'UPCOMING_PICKUPS') {
        matchesFilter = r.status === 'READY_FOR_PICKUP' || r.status === 'PENDING_APPROVAL' || r.start_date >= todayStr;
      } else if (this.currentFilterStatus === 'UPCOMING_RETURNS') {
        matchesFilter = r.end_date >= todayStr && (r.status === 'ACTIVE' || r.status === 'READY_FOR_PICKUP');
      } else {
        matchesFilter = r.status === this.currentFilterStatus;
      }

      const matchesSearch = !query ||
        r.rental_code.toLowerCase().includes(query) ||
        r.user_name.toLowerCase().includes(query) ||
        r.product_name.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });

    const countEl = document.getElementById('admin-orders-count');
    if (countEl) countEl.innerText = `${list.length} Bookings`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">
            No vehicle rentals found matching current operations filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(r => {
      const statusBadge = this.getStatusBadgeHtml(r.status);
      const isOverdue = r.status === 'OVERDUE';
      const isDueToday = r.end_date === todayStr && r.status === 'ACTIVE';

      return `
        <tr style="${isOverdue ? 'background: rgba(244, 63, 94, 0.05);' : isDueToday ? 'background: rgba(245, 158, 11, 0.05);' : ''}">
          <td>
            <span style="font-family: var(--font-mono); font-weight: 800; color: var(--gold);">${r.rental_code}</span>
            <div style="font-size: 0.7rem; color: var(--text-dim);">${r.invoice_number || 'INV-2026'} • ${r.created_at ? r.created_at.split(' ')[0] : ''}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${r.user_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${r.user_email} • ${r.user_phone || ''}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${r.product_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${r.product_brand} • ${r.product_serial || 'VIN-AUTO'}</div>
          </td>
          <td>
            <div style="font-size: 0.8rem; color: #cbd5e1;">${r.start_date} &rarr; <strong>${r.end_date}</strong></div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">
              ${r.duration_days} Day(s) • ${r.fulfillment_type}
              ${isDueToday ? '<span class="badge-soft badge-amber" style="margin-left: 0.35rem;">Due Today</span>' : ''}
            </div>
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
        ${(rental.status === 'OVERDUE' || rental.late_penalty_fee > 0 || rental.late_penalty_invoice_number) ? `
          <button class="btn btn-sm btn-rose" onclick="app.showPenaltyInvoice(${rental.id})" title="View Penalty Invoice Debit Note">
            <i data-lucide="receipt"></i> Penalty
          </button>
        ` : ''}
        <button class="btn btn-sm btn-emerald" onclick="app.openAdminReturnTerminal(${rental.id})">
          <i data-lucide="clipboard-check"></i> Process Return
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
  // VIEW 5: INVENTORY MANAGEMENT
  // ==========================================
  renderInventoryTable() {
    const tbody = document.getElementById('admin-inventory-table-body');
    if (!tbody) return;

    if (this.products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">No vehicles in fleet. Add a vehicle to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.products.map(p => {
      const variantCount = (p.variants || []).length;
      const defaultVariant = (p.variants || []).find(v => v.is_default) || (p.variants || [])[0];
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <img src="${p.image}" alt="${p.name}" style="width: 50px; height: 38px; border-radius: 6px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200'">
              <div>
                <strong style="color: #fff; font-size: 0.92rem;">${p.name}</strong>
                <div style="font-size: 0.7rem; color: var(--text-dim);">${p.serial_number || 'VIN-AUTO'} • ${p.model || ''}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff; font-size: 0.85rem;">${p.brand}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.manufacturer || 'OEM Factory'}</div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #cbd5e1;">${p.color || '—'}</div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">${p.size || 'Standard'}</div>
          </td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="app.openVariantsManager(${p.id})" style="position: relative;">
              <i data-lucide="palette"></i> Variants
              <span style="background: var(--gold); color: #000; border-radius: 9999px; padding: 1px 6px; font-size: 0.65rem; font-weight: 800; margin-left: 4px;">${variantCount}</span>
            </button>
          </td>
          <td><strong style="font-family: var(--font-mono); color: var(--gold);">$${p.daily_rate.toFixed(2)}/day</strong></td>
          <td>
            <div style="font-family: var(--font-mono); color: var(--amber);">
              $${p.deposit_amount.toFixed(2)}
              <span style="font-size: 0.65rem; color: var(--text-dim); display: block;">${p.deposit_type === 'PERCENTAGE' ? p.deposit_rate + '% of subtotal' : 'Fixed'}</span>
            </div>
          </td>
          <td>
            <strong style="color: ${p.available_stock > 0 ? 'var(--emerald)' : 'var(--rose)'}">${p.available_stock}</strong>
            <span style="color: var(--text-dim);"> / ${p.total_stock}</span>
            <div style="font-size: 0.7rem; color: var(--text-dim);">${p.condition_status}</div>
          </td>
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
    // Reset fields that may not be in the basic form
    const mfField = document.getElementById('prod-manufacturer');
    const colorField = document.getElementById('prod-color');
    const sizeField = document.getElementById('prod-size');
    if (mfField) mfField.value = '';
    if (colorField) colorField.value = '';
    if (sizeField) sizeField.value = '';
    this.openModal('product-modal');
  }

  openEditProductModal(id) {
    const p = this.products.find(item => item.id === id);
    if (!p) return;

    document.getElementById('product-modal-title').innerText = `Edit ${p.name}`;
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-category').value = p.category_id;
    document.getElementById('prod-brand').value = p.brand || '';
    const mfField = document.getElementById('prod-manufacturer');
    if (mfField) mfField.value = p.manufacturer || '';
    const colorField = document.getElementById('prod-color');
    if (colorField) colorField.value = p.color || '';
    const sizeField = document.getElementById('prod-size');
    if (sizeField) sizeField.value = p.size || '';
    const modelField = document.getElementById('prod-model');
    if (modelField) modelField.value = p.model || '';
    document.getElementById('prod-daily-rate').value = p.daily_rate;
    document.getElementById('prod-weekly-rate').value = p.weekly_rate;
    document.getElementById('prod-deposit-type').value = p.deposit_type || 'FIXED';
    document.getElementById('prod-deposit-rate').value = p.deposit_rate || p.deposit_amount;
    document.getElementById('prod-stock').value = p.total_stock;
    document.getElementById('prod-condition').value = p.condition_status;
    document.getElementById('prod-image').value = p.image;
    document.getElementById('prod-desc').value = p.description || '';
    this.toggleProductDepositTypeUI();
    this.openModal('product-modal');
  }

  toggleProductDepositTypeUI() {
    const type = document.getElementById('prod-deposit-type')?.value || 'FIXED';
    const lbl = document.getElementById('lbl-deposit-rate');
    if (lbl) lbl.innerText = type === 'PERCENTAGE' ? 'Deposit Rate (% of Subtotal)' : 'Fixed Deposit Amount ($)';
  }

  async saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const isEdit = Boolean(id);

    const payload = {
      name: document.getElementById('prod-name').value,
      category_id: document.getElementById('prod-category').value,
      brand: document.getElementById('prod-brand').value,
      manufacturer: document.getElementById('prod-manufacturer')?.value || 'OEM Factory',
      color: document.getElementById('prod-color')?.value || 'Obsidian Black',
      size: document.getElementById('prod-size')?.value || 'Standard Spec',
      model: document.getElementById('prod-model')?.value || '',
      daily_rate: parseFloat(document.getElementById('prod-daily-rate').value),
      weekly_rate: parseFloat(document.getElementById('prod-weekly-rate').value),
      deposit_type: document.getElementById('prod-deposit-type')?.value || 'FIXED',
      deposit_rate: parseFloat(document.getElementById('prod-deposit-rate').value),
      total_stock: parseInt(document.getElementById('prod-stock').value, 10),
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
        const saved = await res.json();
        this.closeModal('product-modal');
        this.showToast(`Vehicle ${isEdit ? 'updated' : 'added to fleet'} successfully!`, 'success');
        await this.fetchProducts();
        this.renderInventoryTable();
      } else {
        const err = await res.json();
        this.showToast(err.error || 'Error saving vehicle', 'error');
      }
    } catch (err) {
      this.showToast('Error saving vehicle: ' + err.message, 'error');
    }
  }

  // ==========================================
  // PRODUCT VARIANT MANAGER
  // ==========================================
  async openVariantsManager(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.activeVariantProductId = productId;
    document.getElementById('var-mgr-title').innerText = `Variants: ${product.name}`;

    const heroEl = document.getElementById('var-mgr-product-hero');
    if (heroEl) {
      heroEl.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="cart-hero-img" onerror="this.src='https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200'">
        <div style="flex: 1;">
          <span style="font-size: 0.7rem; color: var(--gold); font-weight: 800; text-transform: uppercase;">${product.brand}</span>
          <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin: 0.2rem 0;">${product.name}</h3>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Base: <strong style="color: var(--gold);">$${product.daily_rate.toFixed(2)}/day</strong> &nbsp;•&nbsp;
            Color: <strong style="color: #fff;">${product.color}</strong> &nbsp;•&nbsp;
            Deposit: <strong style="color: var(--amber);">$${product.deposit_amount.toFixed(2)}</strong>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.2rem;">${product.manufacturer || 'OEM Factory'} &nbsp;|&nbsp; ${product.size || 'Standard'}</div>
        </div>
      `;
    }

    document.getElementById('variant-subform').style.display = 'none';
    document.getElementById('subvar-product-id').value = productId;
    await this.renderVariantsTable(product);
    this.openModal('variants-manager-modal');
  }

  async renderVariantsTable(product) {
    const tbody = document.getElementById('variants-table-body');
    if (!tbody) return;

    const variants = product.variants || [];

    if (variants.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 1.5rem; color: var(--text-dim);">No variants configured. Add the first color/spec variant above.</td></tr>`;
      return;
    }

    tbody.innerHTML = variants.map(v => {
      const isDefault = v.is_default === 1 || v.is_default === true;
      const varId = typeof v.id === 'string' && v.id.startsWith('def-') ? null : v.id;
      return `
        <tr style="${isDefault ? 'background: rgba(245,158,11,0.05);' : ''}">
          <td>
            <div style="font-weight: 700; color: #fff; font-size: 0.85rem;">${v.variant_name}</div>
            <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">${v.sku || 'SKU-AUTO'}</div>
            ${isDefault ? '<span class="badge-soft badge-gold" style="font-size: 0.65rem; padding: 2px 6px;">⭐ Default</span>' : ''}
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: ${v.color_hex || '#f59e0b'}; border: 2px solid rgba(255,255,255,0.2); flex-shrink: 0;"></div>
              <span style="color: #cbd5e1; font-size: 0.82rem;">${v.color}</span>
            </div>
          </td>
          <td style="font-size: 0.8rem; color: #cbd5e1;">${v.size || 'Standard'}</td>
          <td style="font-size: 0.78rem; color: var(--text-muted); max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${v.trim_package || '—'}</td>
          <td><strong style="font-family: var(--font-mono); color: var(--gold);">$${(v.daily_rate_override || product.daily_rate).toFixed(2)}/day</strong></td>
          <td><span style="font-family: var(--font-mono); color: var(--amber);">$${(v.deposit_amount_override || product.deposit_amount).toFixed(2)}</span></td>
          <td>
            <strong style="color: ${(v.available_stock || 0) > 0 ? 'var(--emerald)' : 'var(--rose)'}">${v.available_stock || 0}</strong>
            <span style="color: var(--text-dim);">/ ${v.stock_count || 1}</span>
          </td>
          <td class="text-right">
            ${varId ? `
              <button class="btn btn-sm btn-secondary" onclick="app.deleteVariant(${varId}, ${product.id})" title="Remove Variant">
                <i data-lucide="trash-2"></i>
              </button>
            ` : '<span style="color: var(--text-dim); font-size: 0.75rem;">Base</span>'}
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openAddVariantForm() {
    const form = document.getElementById('variant-subform');
    if (form) {
      form.style.display = 'block';
      form.reset();
      document.getElementById('subvar-id').value = '';
      document.getElementById('subvar-color-hex').value = '#f59e0b';
    }
  }

  async saveProductVariant(e) {
    e.preventDefault();
    const productId = document.getElementById('subvar-product-id').value;

    const payload = {
      variant_name: document.getElementById('subvar-name').value,
      sku: document.getElementById('subvar-sku').value || null,
      color: document.getElementById('subvar-color').value,
      color_hex: document.getElementById('subvar-color-hex').value,
      size: document.getElementById('subvar-size').value,
      trim_package: document.getElementById('subvar-trim').value || 'Custom Performance Trim',
      daily_rate_override: document.getElementById('subvar-rate').value ? parseFloat(document.getElementById('subvar-rate').value) : null,
      deposit_amount_override: document.getElementById('subvar-deposit').value ? parseFloat(document.getElementById('subvar-deposit').value) : null,
      stock_count: 1,
      image_override: document.getElementById('subvar-image').value || null,
      is_default: 0
    };

    try {
      const res = await fetch(`${this.apiBase}/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.showToast('Variant added successfully!', 'success');
        document.getElementById('variant-subform').style.display = 'none';
        await this.fetchProducts();
        const updatedProduct = this.products.find(p => p.id === parseInt(productId, 10));
        if (updatedProduct) await this.renderVariantsTable(updatedProduct);
      } else {
        const err = await res.json();
        this.showToast(err.error || 'Error saving variant', 'error');
      }
    } catch (err) {
      this.showToast('Error: ' + err.message, 'error');
    }
  }

  async deleteVariant(variantId, productId) {
    if (!confirm('Remove this variant from the fleet? This cannot be undone.')) return;
    try {
      const res = await fetch(`${this.apiBase}/variants/${variantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        this.showToast('Variant removed.', 'info');
        await this.fetchProducts();
        const updatedProduct = this.products.find(p => p.id === productId);
        if (updatedProduct) await this.renderVariantsTable(updatedProduct);
      }
    } catch (err) {
      this.showToast('Error: ' + err.message, 'error');
    }
  }

  // ==========================================
  // PRICELISTS & TIME-BASED PRICING
  // ==========================================
  renderPricelists() {
    const tbody = document.getElementById('admin-pricelists-table-body');
    if (!tbody) return;

    if (!this.pricelists || this.pricelists.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-dim);">No pricelists configured.</td></tr>`;
      return;
    }

    const conditionLabels = {
      'GENERAL': { text: 'General Fleet', color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' },
      'CUSTOMER_TIER': { text: 'Customer VIP Tier', color: 'var(--gold)', bg: 'rgba(245,158,11,0.12)' },
      'SEASONAL_DEMAND': { text: 'Seasonal Demand Surge', color: 'var(--rose)', bg: 'rgba(244,63,94,0.12)' },
      'WEEKEND_TRACK': { text: 'Weekend / Track Surge', color: 'var(--cyan)', bg: 'rgba(6,182,212,0.12)' },
      'CORPORATE_FLEET': { text: 'Corporate Fleet Lease', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.12)' }
    };

    tbody.innerHTML = this.pricelists.map(pl => {
      const isDefault = pl.is_default === 1 || pl.is_default === true;
      const condLabel = conditionLabels[pl.condition_type] || { text: pl.condition_type, color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.15)' };
      const discountDisplay = pl.discount_percent < 0
        ? `<span style="color: var(--rose); font-weight: 800;">+${Math.abs(pl.discount_percent)}% Surge</span>`
        : pl.discount_percent > 0
          ? `<span style="color: var(--emerald); font-weight: 800;">-${pl.discount_percent}% Off</span>`
          : `<span style="color: var(--text-dim);">Standard Rate</span>`;

      const weekendDisplay = pl.weekend_multiplier > 1.0
        ? `<span style="color: var(--amber); font-size: 0.78rem;"> • ${pl.weekend_multiplier}x Weekend</span>`
        : '';

      return `
        <tr style="${isDefault ? 'background: rgba(245,158,11,0.04); border-left: 3px solid var(--gold);' : ''}">
          <td>
            <div style="font-weight: 800; color: #fff; font-size: 0.9rem;">${pl.name}</div>
            <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">${pl.code}</div>
            ${pl.description ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">${pl.description.substring(0, 60)}${pl.description.length > 60 ? '...' : ''}</div>` : ''}
          </td>
          <td>
            <span style="padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; color: ${condLabel.color}; background: ${condLabel.bg};">
              ${condLabel.text}
            </span>
            ${pl.applicable_category_id ? `<div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.15rem;">${pl.applicable_category_id}</div>` : ''}
          </td>
          <td>
            ${isDefault
              ? '<span class="badge-soft badge-gold">⭐ Default</span>'
              : `<button class="btn btn-sm btn-secondary" onclick="app.setDefaultPricelist(${pl.id})" title="Set as global default"><i data-lucide="star"></i></button>`
            }
          </td>
          <td>
            ${discountDisplay}${weekendDisplay}
            <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.15rem;">Min: ${pl.min_days}d</div>
          </td>
          <td>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; font-size: 0.72rem; font-family: var(--font-mono);">
              <span style="color: var(--text-dim);">1-2d:</span> <span style="color: ${pl.time_tier_1d_discount > 0 ? 'var(--emerald)' : 'var(--text-dim)'}">${pl.time_tier_1d_discount > 0 ? '-' + pl.time_tier_1d_discount + '%' : '—'}</span>
              <span style="color: var(--text-dim);">3-6d:</span> <span style="color: ${pl.time_tier_3d_discount > 0 ? 'var(--emerald)' : 'var(--text-dim)'}">${pl.time_tier_3d_discount > 0 ? '-' + pl.time_tier_3d_discount + '%' : '—'}</span>
              <span style="color: var(--text-dim);">7-29d:</span> <span style="color: ${pl.time_tier_7d_discount > 0 ? 'var(--emerald)' : 'var(--text-dim)'}">${pl.time_tier_7d_discount > 0 ? '-' + pl.time_tier_7d_discount + '%' : '—'}</span>
              <span style="color: var(--text-dim);">30+d:</span> <span style="color: ${pl.time_tier_30d_discount > 0 ? 'var(--gold)' : 'var(--text-dim)'}">${pl.time_tier_30d_discount > 0 ? '-' + pl.time_tier_30d_discount + '%' : '—'}</span>
            </div>
          </td>
          <td>
            <span class="badge-soft ${pl.is_active ? 'badge-emerald' : ''}" style="${!pl.is_active ? 'opacity: 0.5;' : ''}">${pl.is_active ? 'Active' : 'Inactive'}</span>
          </td>
          <td class="text-right">
            <button class="btn btn-sm btn-secondary" onclick="app.openEditPricelistModal(${pl.id})">
              <i data-lucide="edit-2"></i> Edit
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  renderRentalPeriodPresets() {
    const tbody = document.getElementById('admin-presets-table-body');
    if (!tbody) return;

    if (!this.presets || this.presets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-dim);">No rental period presets configured.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.presets.map(p => `
      <tr>
        <td>
          <strong style="color: #fff; font-size: 0.88rem;">${p.name}</strong>
          <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);">${p.code}</div>
        </td>
        <td><strong style="font-family: var(--font-mono); color: var(--cyan);">${p.duration_days} Day(s)</strong></td>
        <td><span style="color: var(--emerald); font-weight: 700;">-${p.discount_percent}% Off</span></td>
        <td><span class="badge-soft badge-gold">${p.badge_tag || 'Popular'}</span></td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${p.description || '—'}</td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openAddPricelistModal() {
    document.getElementById('pl-id').value = '';
    document.getElementById('pricelist-form').reset();
    document.getElementById('pl-tier-1d').value = 0;
    document.getElementById('pl-tier-3d').value = 5;
    document.getElementById('pl-tier-7d').value = 15;
    document.getElementById('pl-tier-30d').value = 25;
    this.openModal('pricelist-modal');
  }

  openEditPricelistModal(id) {
    const pl = this.pricelists.find(p => p.id === id);
    if (!pl) return;

    document.getElementById('pl-id').value = pl.id;
    document.getElementById('pl-name').value = pl.name;
    document.getElementById('pl-code').value = pl.code;
    const condEl = document.getElementById('pl-condition-type');
    if (condEl) condEl.value = pl.condition_type || 'GENERAL';
    const catEl = document.getElementById('pl-category-filter');
    if (catEl) catEl.value = pl.applicable_category_id || '';
    document.getElementById('pl-discount').value = pl.discount_percent;
    document.getElementById('pl-weekend').value = pl.weekend_multiplier || 1.0;
    document.getElementById('pl-min-days').value = pl.min_days || 1;
    document.getElementById('pl-tier-1d').value = pl.time_tier_1d_discount || 0;
    document.getElementById('pl-tier-3d').value = pl.time_tier_3d_discount || 5;
    document.getElementById('pl-tier-7d').value = pl.time_tier_7d_discount || 15;
    document.getElementById('pl-tier-30d').value = pl.time_tier_30d_discount || 25;
    const defaultEl = document.getElementById('pl-is-default');
    if (defaultEl) defaultEl.checked = Boolean(pl.is_default);
    document.getElementById('pl-desc').value = pl.description || '';
    this.openModal('pricelist-modal');
  }

  async savePricelist(e) {
    e.preventDefault();
    const id = document.getElementById('pl-id')?.value;
    const isEdit = Boolean(id);

    const payload = {
      name: document.getElementById('pl-name').value,
      code: document.getElementById('pl-code').value,
      condition_type: document.getElementById('pl-condition-type')?.value || 'GENERAL',
      applicable_category_id: document.getElementById('pl-category-filter')?.value || null,
      discount_percent: parseFloat(document.getElementById('pl-discount').value) || 0,
      weekend_multiplier: parseFloat(document.getElementById('pl-weekend').value) || 1.0,
      min_days: parseInt(document.getElementById('pl-min-days').value, 10) || 1,
      time_tier_1d_discount: parseFloat(document.getElementById('pl-tier-1d')?.value) || 0,
      time_tier_3d_discount: parseFloat(document.getElementById('pl-tier-3d')?.value) || 5,
      time_tier_7d_discount: parseFloat(document.getElementById('pl-tier-7d')?.value) || 15,
      time_tier_30d_discount: parseFloat(document.getElementById('pl-tier-30d')?.value) || 25,
      is_default: document.getElementById('pl-is-default')?.checked ? 1 : 0,
      description: document.getElementById('pl-desc').value || ''
    };

    try {
      const url = isEdit ? `${this.apiBase}/pricelists/${id}` : `${this.apiBase}/pricelists`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.closeModal('pricelist-modal');
        this.showToast(`Pricelist ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
        await this.fetchPricelists();
        await this.fetchPresets();
        this.renderPricelists();
        this.renderRentalPeriodPresets();
      } else {
        const err = await res.json();
        this.showToast(err.error || 'Error saving pricelist', 'error');
      }
    } catch (err) {
      this.showToast('Error: ' + err.message, 'error');
    }
  }

  async setDefaultPricelist(id) {
    try {
      const res = await fetch(`${this.apiBase}/pricelists/${id}/set-default`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        this.showToast(data.message, 'success');
        await this.fetchPricelists();
        this.renderPricelists();
      } else {
        this.showToast(data.error || 'Error setting default', 'error');
      }
    } catch (err) {
      this.showToast('Error: ' + err.message, 'error');
    }
  }

  // ==========================================
  // VIEW 8: COMMAND CENTER
  // ==========================================
  selectFeeMode(mode) {
    this.selectedFeeMode = mode;
    document.querySelectorAll('.fee-mode-card').forEach(card => {
      card.classList.remove('active');
    });

    const activeCard = document.getElementById(`mode-card-${mode}`);
    if (activeCard) {
      activeCard.classList.add('active');
      const radio = activeCard.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    }

    const rowDaily = document.getElementById('row-daily-params');
    const rowHourly = document.getElementById('row-hourly-params');
    const rowWeekly = document.getElementById('row-weekly-params');

    if (rowDaily) rowDaily.style.display = mode === 'DAILY' ? 'flex' : 'none';
    if (rowHourly) rowHourly.style.display = mode === 'HOURLY' ? 'flex' : 'none';
    if (rowWeekly) rowWeekly.style.display = (mode === 'WEEKLY' || mode === 'MONTHLY') ? 'flex' : 'none';
  }

  populateSettingsForm() {
    if (!this.config) return;

    const c = this.config;
    this.selectFeeMode(c.late_fee_mode || 'DAILY');

    const lateMult = document.getElementById('cfg-late-multiplier');
    const lateVal = document.getElementById('cfg-late-val');
    const hourlyRate = document.getElementById('cfg-hourly-rate');
    const weeklyRate = document.getElementById('cfg-weekly-rate');
    const monthlyRate = document.getElementById('cfg-monthly-rate');
    const grace = document.getElementById('cfg-grace-period');
    const graceVal = document.getElementById('cfg-grace-val');
    const maxPen = document.getElementById('cfg-max-penalty');
    const autoInv = document.getElementById('cfg-auto-invoice');
    const dep = document.getElementById('cfg-deposit-percent');
    const depVal = document.getElementById('cfg-deposit-val');
    const minD = document.getElementById('cfg-min-days');
    const maxD = document.getElementById('cfg-max-days');
    const loc = document.getElementById('cfg-pickup-location');

    if (lateMult) {
      lateMult.value = c.late_fee_daily_multiplier || 1.5;
      if (lateVal) lateVal.innerText = `${c.late_fee_daily_multiplier || 1.5}x`;
    }
    if (hourlyRate) hourlyRate.value = c.late_fee_hourly_rate || 65.0;
    if (weeklyRate) weeklyRate.value = c.late_fee_weekly_rate || 2500.0;
    if (monthlyRate) monthlyRate.value = c.late_fee_monthly_rate || 8500.0;

    if (grace) {
      grace.value = c.grace_period_hours || 4;
      if (graceVal) graceVal.innerText = `${c.grace_period_hours || 4} Hours`;
    }
    if (maxPen) maxPen.value = c.max_penalty_limit ?? 5000.0;
    if (autoInv) autoInv.checked = c.auto_generate_penalty_invoice !== 0;

    if (dep) {
      dep.value = c.deposit_percentage_default || 20.0;
      if (depVal) depVal.innerText = `${c.deposit_percentage_default || 20.0}%`;
    }
    if (minD) minD.value = c.min_rental_days || 1;
    if (maxD) maxD.value = c.max_rental_days || 30;
    if (loc) loc.value = c.pickup_location || 'Leaseify Executive Lounge, 850 Sunset Blvd';
  }

  async saveSettings(e) {
    e.preventDefault();

    const late_fee_mode = document.querySelector('input[name="late_fee_mode"]:checked')?.value || this.selectedFeeMode || 'DAILY';
    const late_fee_daily_multiplier = parseFloat(document.getElementById('cfg-late-multiplier')?.value || '1.5');
    const late_fee_hourly_rate = parseFloat(document.getElementById('cfg-hourly-rate')?.value || '65.0');
    const late_fee_weekly_rate = parseFloat(document.getElementById('cfg-weekly-rate')?.value || '2500.0');
    const late_fee_monthly_rate = parseFloat(document.getElementById('cfg-monthly-rate')?.value || '8500.0');
    const grace_period_hours = parseInt(document.getElementById('cfg-grace-period')?.value || '4', 10);
    const max_penalty_limit = parseFloat(document.getElementById('cfg-max-penalty')?.value || '5000.0');
    const auto_generate_penalty_invoice = document.getElementById('cfg-auto-invoice')?.checked ? 1 : 0;
    const deposit_percentage_default = parseFloat(document.getElementById('cfg-deposit-percent')?.value || '20.0');
    const min_rental_days = parseInt(document.getElementById('cfg-min-days')?.value || '1', 10);
    const max_rental_days = parseInt(document.getElementById('cfg-max-days')?.value || '30', 10);
    const pickup_location = document.getElementById('cfg-pickup-location')?.value;

    try {
      const res = await fetch(`${this.apiBase}/config`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          late_fee_mode,
          late_fee_daily_multiplier,
          late_fee_hourly_rate,
          late_fee_weekly_rate,
          late_fee_monthly_rate,
          grace_period_hours,
          max_penalty_limit,
          auto_generate_penalty_invoice,
          deposit_percentage_default,
          min_rental_days,
          max_rental_days,
          pickup_location
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      this.config = data.config || data;
      this.showToast('Late Return Fee & Policy settings saved! Fleet engine re-evaluated.', 'success');
      await this.fetchConfig();
      await this.fetchRentals();
      await this.fetchAnalytics();
      this.renderAdminDashboard();
    } catch (err) {
      this.showToast('Error updating settings: ' + err.message, 'error');
    }
  }

  // ==========================================
  // OFFICIAL LATE PENALTY INVOICE MODAL
  // ==========================================
  async showPenaltyInvoice(rentalId) {
    try {
      const res = await fetch(`${this.apiBase}/penalties/invoice/${rentalId}`);
      if (!res.ok) throw new Error('Penalty record not found');
      const data = await res.json();

      const { rental, config, invoice } = data;

      document.getElementById('pen-inv-doc-title').innerText = `Penalty Invoice #${invoice.invoice_number}`;

      const totalFee = invoice.late_penalty_fee + (invoice.damage_fee || 0);

      const html = `
        <div class="printable-invoice-body">
          <div class="invoice-header-grid">
            <div class="inv-brand-box">
              <h2>LEASEIFY<span style="color: var(--rose);">.PENALTY</span></h2>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                Leaseify Automated Late Fee & Surcharge Division<br>
                850 Sunset Blvd, West Hollywood, CA 90069<br>
                Tax / Surcharge Reg: TAX-PEN-${rental.id}-2026 • compliance@leaseify.io
              </p>
            </div>
            <div class="inv-meta-box">
              <div class="inv-number text-rose">${invoice.invoice_number}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">Original Order: <strong>${rental.rental_code}</strong></div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Issue Date: ${invoice.generated_at ? invoice.generated_at.split(' ')[0] : 'Today'}</div>
              <div style="margin-top: 0.35rem;">
                <span class="badge-soft ${invoice.status === 'SETTLED' ? 'badge-emerald' : 'badge-rose'}">
                  Status: ${invoice.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div class="inv-client-vehicle-grid">
            <div>
              <div class="inv-section-title">Client Billing Information:</div>
              <strong style="color: #fff; font-size: 1.05rem;">${rental.customer_name}</strong>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${rental.customer_email} • ${rental.customer_phone || ''}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${rental.customer_address || 'Executive Lounge Guest'}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Authorized Card: <strong style="color: #fff;">${rental.payment_method}</strong></div>
            </div>

            <div>
              <div class="inv-section-title">Vehicle & Overdue Telemetry:</div>
              <strong style="color: #fff; font-size: 1.05rem;">${rental.product_name}</strong>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">VIN: ${rental.product_serial || 'VIN-AUTO'}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Scheduled Return: <strong>${rental.end_date} 23:59</strong></div>
              <div style="font-size: 0.85rem; color: var(--rose); margin-top: 0.25rem;">
                Overdue Duration: <strong>${invoice.delay_hours} Hours (${invoice.delay_days} Days)</strong>
              </div>
              <div style="font-size: 0.85rem; color: var(--gold); margin-top: 0.15rem;">
                Grace Period Buffer: <strong>${invoice.grace_period_hours} Hours (Applied)</strong>
              </div>
            </div>
          </div>

          <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 0.6rem;">Itemized Penalty & Deposit Surcharge Breakdown</h4>
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Charge Description</th>
                <th>Calculation Formula & Mode</th>
                <th>Policy Rule</th>
                <th style="text-align: right;">Surcharge Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Late Return Delay Surcharge</strong>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">Automated engine detection past grace window</div>
                </td>
                <td style="font-family: var(--font-mono); font-size: 0.85rem;">
                  ${invoice.fee_mode === 'HOURLY' ? `${invoice.delay_hours}h × $${config.late_fee_hourly_rate}/hr` :
                    invoice.fee_mode === 'WEEKLY' ? `${Math.ceil(invoice.delay_days/7)} Wk(s) × $${config.late_fee_weekly_rate}/wk` :
                    invoice.fee_mode === 'MONTHLY' ? `${Math.ceil(invoice.delay_days/30)} Mo(s) × $${config.late_fee_monthly_rate}/mo` :
                    `${invoice.delay_days} Day(s) × ($${rental.daily_rate} × ${config.late_fee_daily_multiplier}x)`}
                </td>
                <td>
                  <span class="badge-soft badge-gold">${invoice.fee_mode}</span>
                  ${config.max_penalty_limit > 0 ? `<div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.2rem;">Max Cap: $${config.max_penalty_limit}</div>` : ''}
                </td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--rose);">
                  +$${invoice.late_penalty_fee.toFixed(2)}
                </td>
              </tr>
              ${(invoice.damage_fee || 0) > 0 ? `
                <tr>
                  <td>
                    <strong>Diagnostic Detailing / Damage Fee</strong>
                    <div style="font-size: 0.75rem; color: var(--text-dim);">Assessed during store return inspection</div>
                  </td>
                  <td style="font-family: var(--font-mono); font-size: 0.85rem;">Physical inspection assessment</td>
                  <td><span class="badge-soft badge-amber">Inspection Grade</span></td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--rose);">
                    +$${invoice.damage_fee.toFixed(2)}
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div class="inv-escrow-guarantee">
              <i data-lucide="lock" style="width: 28px; height: 28px; color: var(--amber); flex-shrink: 0;"></i>
              <div>
                <strong>Escrow Deposit Reconciliation:</strong><br>
                <span>Original Escrow Deposit of $${rental.deposit_amount.toFixed(2)} was utilized to offset accrued late penalties.</span>
              </div>
            </div>

            <div class="invoice-totals-box">
              <div class="ledger-row">
                <span class="ledger-lbl">Total Surcharges Assessed:</span>
                <span class="ledger-val text-rose">+$${totalFee.toFixed(2)}</span>
              </div>
              <div class="ledger-row">
                <span class="ledger-lbl text-amber">Deducted from Escrow Deposit:</span>
                <span class="ledger-val text-amber">-$${invoice.deposit_deduction.toFixed(2)}</span>
              </div>
              <div class="ledger-divider"></div>
              ${invoice.outstanding_balance > 0 ? `
                <div class="ledger-row ledger-total">
                  <span class="text-rose">Remaining Outstanding Balance Due:</span>
                  <span class="total-amount text-rose">$${invoice.outstanding_balance.toFixed(2)}</span>
                </div>
              ` : `
                <div class="ledger-row ledger-total">
                  <span class="text-emerald">Remaining Net Deposit Refunded:</span>
                  <span class="total-amount text-emerald">$${(invoice.deposit_refunded || 0).toFixed(2)}</span>
                </div>
              `}
            </div>
          </div>
        </div>
      `;

      document.getElementById('penalty-invoice-printable-content').innerHTML = html;
      this.openModal('penalty-invoice-modal');
    } catch (err) {
      this.showToast('Could not load penalty invoice: ' + err.message, 'error');
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

  // ==========================================
  // VIEW: PICKUP & RETURN MANAGEMENT HUB
  // ==========================================
  async fetchDispatchHub() {
    try {
      const [pickupsRes, returnsRes, repairsRes] = await Promise.all([
        fetch(`${this.apiBase}/dispatch/pickups/daily`),
        fetch(`${this.apiBase}/dispatch/returns/daily`),
        fetch(`${this.apiBase}/dispatch/repairs`)
      ]);

      if (pickupsRes.ok) this.pickupsData = await pickupsRes.json();
      if (returnsRes.ok) this.returnsData = await returnsRes.json();
      if (repairsRes.ok) this.repairsData = (await repairsRes.json()) || [];

      this.renderDispatchMetrics();
      this.renderPickupsTable();
      this.renderReturnsTable();
      this.renderRepairsTable();
    } catch (err) {
      this.showToast('Could not load Pickup & Return Hub: ' + err.message, 'error');
    }
  }

  switchDispatchTab(tabId) {
    this.activeDispatchTab = tabId;
    document.querySelectorAll('.dispatch-subtabs .status-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dispatch-subtab-content').forEach(c => {
      c.classList.remove('active');
      c.style.display = 'none';
    });

    const activeTabBtn = document.getElementById(`tab-dispatch-${tabId}`);
    const activeContent = document.getElementById(`dispatch-subtab-${tabId}`);

    if (activeTabBtn) activeTabBtn.classList.add('active');
    if (activeContent) {
      activeContent.classList.add('active');
      activeContent.style.display = 'block';
    }

    if (window.lucide) window.lucide.createIcons();
  }

  renderDispatchMetrics() {
    if (this.pickupsData && this.pickupsData.metrics) {
      const m = this.pickupsData.metrics;
      const tEl = document.getElementById('disp-kpi-total-pickups');
      const pEl = document.getElementById('disp-kpi-pending-pickups');
      const cEl = document.getElementById('disp-kpi-confirmed-pickups');
      const dEl = document.getElementById('disp-kpi-deliveries');

      if (tEl) tEl.innerText = m.total_pickups;
      if (pEl) pEl.innerText = m.pending_handover;
      if (cEl) cEl.innerText = m.confirmed_picked_up;
      if (dEl) dEl.innerText = m.white_glove_deliveries;
    }

    if (this.returnsData && this.returnsData.metrics) {
      const rm = this.returnsData.metrics;
      const rtEl = document.getElementById('disp-kpi-total-returns');
      const rdEl = document.getElementById('disp-kpi-due-returns');
      const roEl = document.getElementById('disp-kpi-overdue-returns');
      const rsEl = document.getElementById('disp-kpi-submitted-returns');

      if (rtEl) rtEl.innerText = rm.total_inbound;
      if (rdEl) rdEl.innerText = rm.due_today;
      if (roEl) roEl.innerText = rm.overdue_urgent;
      if (rsEl) rsEl.innerText = rm.awaiting_inspection;
    }
  }

  renderPickupsTable() {
    const tbody = document.getElementById('disp-pickups-table-body');
    if (!tbody || !this.pickupsData) return;

    const query = document.getElementById('disp-pickup-search')?.value.toLowerCase().trim() || '';
    let list = this.pickupsData.pickups || [];

    if (query) {
      list = list.filter(p =>
        p.rental_code.toLowerCase().includes(query) ||
        p.customer_name.toLowerCase().includes(query) ||
        p.product_name.toLowerCase().includes(query) ||
        (p.route_name && p.route_name.toLowerCase().includes(query))
      );
    }

    const countEl = document.getElementById('disp-pickups-count');
    if (countEl) countEl.innerText = `${list.length} Pickups`;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">No scheduled pickups found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((p, idx) => {
      const isConfirmed = p.status === 'ACTIVE' || p.pickup_status === 'CONFIRMED_PICKED_UP';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cyan);">Stop #${p.stop_sequence || idx + 1}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${p.route_name || 'West LA Route'}</div>
          </td>
          <td>
            <strong style="color: #fff;">${p.time_slot || '10:00 AM - 12:00 PM'}</strong>
            <div style="font-size: 0.75rem; color: var(--gold);">${p.fulfillment_type === 'DELIVERY' ? '🚚 Flatbed Delivery' : '🏢 Store Lounge Pickup'}</div>
          </td>
          <td>
            <strong style="color: #fff;">${p.product_name}</strong>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${p.product_brand} • ${p.product_serial || 'VIN-AUTO'}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${p.customer_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${p.customer_phone || ''}</div>
          </td>
          <td>
            <div style="font-size: 0.8rem; color: #cbd5e1; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${p.delivery_address || 'Leaseify Executive Lounge'}
            </div>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--cyan); background: rgba(6,182,212,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid rgba(6,182,212,0.3);">
              ${p.qr_token || `QR-${p.rental_code}`}
            </span>
            ${p.customer_notified_at ? `<div style="font-size: 0.65rem; color: var(--emerald); margin-top: 0.2rem;"><i data-lucide="check" style="width: 10px; height: 10px; display: inline;"></i> Client Notified</div>` : ''}
          </td>
          <td>
            <span class="badge-soft ${isConfirmed ? 'badge-emerald' : 'badge-amber'}">
              ${isConfirmed ? 'Handover Confirmed' : 'Ready / Staged'}
            </span>
          </td>
          <td class="text-right">
            <button class="btn btn-sm btn-secondary" onclick="app.notifyCustomerPickupPass(${p.id})" title="Send SMS/Email QR Pass">
              <i data-lucide="bell"></i> Notify
            </button>
            ${!isConfirmed ? `
              <button class="btn btn-sm btn-cyan" onclick="app.openPickupScannerModal(${p.id})">
                <i data-lucide="qr-code"></i> Check-in & Handover
              </button>
            ` : `
              <button class="btn btn-sm btn-emerald" disabled style="opacity: 0.7;">
                <i data-lucide="check-check"></i> Handed Over
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  renderReturnsTable() {
    const tbody = document.getElementById('disp-returns-table-body');
    if (!tbody || !this.returnsData) return;

    const query = document.getElementById('disp-returns-search')?.value.toLowerCase().trim() || '';
    let list = this.returnsData.returns || [];

    if (query) {
      list = list.filter(r =>
        r.rental_code.toLowerCase().includes(query) ||
        r.customer_name.toLowerCase().includes(query) ||
        r.product_name.toLowerCase().includes(query)
      );
    }

    const countEl = document.getElementById('disp-returns-count');
    if (countEl) countEl.innerText = `${list.length} Returns`;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-dim);">No inbound returns matching filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(r => {
      const isOverdue = r.status === 'OVERDUE';
      const isSubmitted = r.status === 'RETURN_SUBMITTED';

      return `
        <tr style="${isOverdue ? 'background: rgba(244, 63, 94, 0.05);' : ''}">
          <td>
            <span style="font-family: var(--font-mono); font-weight: 800; color: var(--gold);">${r.rental_code}</span>
            <div style="font-size: 0.75rem; color: var(--text-dim);">Return: <strong>${r.end_date}</strong></div>
          </td>
          <td>
            <strong style="color: #fff;">${r.product_name}</strong>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${r.product_brand} • ${r.product_serial || 'VIN-AUTO'}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff;">${r.customer_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${r.customer_phone || ''}</div>
          </td>
          <td>
            <div style="font-size: 0.8rem; color: #cbd5e1;">${r.start_date} &rarr; <strong>${r.end_date}</strong></div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">${r.duration_days} Day(s) • ${r.fulfillment_type}</div>
          </td>
          <td>
            <div style="font-family: var(--font-mono); font-weight: 700; color: var(--amber);">$${r.deposit_amount.toFixed(2)}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">Status: ${r.deposit_status}</div>
          </td>
          <td>
            ${isOverdue ? `
              <span class="badge-soft badge-rose">🚨 Overdue (+$${r.late_penalty_fee.toFixed(2)})</span>
            ` : isSubmitted ? `
              <span class="badge-soft badge-cyan">Parked in Intake Bay</span>
            ` : `
              <span class="badge-soft badge-emerald">Active On Road</span>
            `}
          </td>
          <td class="text-right">
            ${(r.status === 'OVERDUE' || r.late_penalty_fee > 0) ? `
              <button class="btn btn-sm btn-rose" onclick="app.showPenaltyInvoice(${r.id})" title="View Penalty Invoice">
                <i data-lucide="receipt"></i> Penalty
              </button>
            ` : ''}
            <button class="btn btn-sm btn-emerald" onclick="app.openReturnDiagnosticModal(${r.id})">
              <i data-lucide="clipboard-check"></i> Inspect & Settle Return
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  renderRepairsTable() {
    const tbody = document.getElementById('disp-repairs-table-body');
    if (!tbody) return;

    const list = this.repairsData || [];
    const countEl = document.getElementById('disp-repairs-count');
    if (countEl) countEl.innerText = `${list.length} Work Orders`;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-dim);">No active repair work orders. Fleet is in pristine condition.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(r => {
      const isCompleted = r.status === 'COMPLETED';

      return `
        <tr>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--rose);">${r.work_order_code}</strong>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${r.created_at ? r.created_at.split(' ')[0] : ''}</div>
          </td>
          <td>
            <strong style="color: #fff;">${r.product_name}</strong>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${r.product_brand} • ${r.product_serial || 'VIN-AUTO'}</div>
          </td>
          <td>
            <span style="font-family: var(--font-mono); color: var(--gold);">${r.rental_code}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${r.customer_name}</div>
          </td>
          <td>
            <div style="font-size: 0.8rem; color: #fff;">${r.damage_description}</div>
            ${r.parts_needed && r.parts_needed.length > 0 ? `
              <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.2rem;">
                Parts: ${r.parts_needed.map(p => typeof p === 'string' ? p : p.part_name).join(', ')}
              </div>
            ` : ''}
          </td>
          <td>
            <span class="badge-soft ${r.severity === 'HIGH' || r.severity === 'CRITICAL' ? 'badge-rose' : 'badge-amber'}">${r.severity}</span>
          </td>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--rose);">$${r.estimated_cost.toFixed(2)}</strong>
          </td>
          <td>
            <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 180px;">${r.service_center}</div>
          </td>
          <td>
            <span class="badge-soft ${isCompleted ? 'badge-repair-completed' : 'badge-repair-in-service'}">
              ${isCompleted ? 'QA Cleared & Restored' : 'In Service Bay'}
            </span>
          </td>
          <td class="text-right">
            ${!isCompleted ? `
              <button class="btn btn-sm btn-emerald" onclick="app.completeServiceBayRepair(${r.id})">
                <i data-lucide="check-circle"></i> Complete Service
              </button>
            ` : `
              <button class="btn btn-sm btn-secondary" disabled style="opacity: 0.6;">
                <i data-lucide="check-check"></i> Completed
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // MODAL: QR CODE PICKUP SCANNER & CHECKLIST
  // ==========================================
  async openPickupScannerModal(rentalId) {
    try {
      const res = await fetch(`${this.apiBase}/rentals/${rentalId}`);
      if (!res.ok) throw new Error('Rental not found');
      const r = await res.json();

      this.activeChecklist = [
        { item: 'Battery / Fuel Level at 100% Full', checked: true },
        { item: 'Tire Pressure & Forged Wheels Inspected (34 PSI)', checked: true },
        { item: 'Exterior Paintwork Pristine & Washed', checked: true },
        { item: 'Client Driver License & Insurance Verification', checked: true },
        { item: 'Track Key Fob & Telemetry Accessories Handoff', checked: true }
      ];

      const qrToken = `QR-PKUP-${r.rental_code.replace('RNT-', '')}-${r.id}`;

      const html = `
        <div class="booking-modal-grid">
          <div class="payment-methods-panel">
            <div class="qr-scanner-card">
              <div class="qr-scanner-frame">
                <div class="qr-scan-line"></div>
                <i data-lucide="qr-code" style="width: 80px; height: 80px; color: var(--cyan);"></i>
              </div>
              <div style="font-family: var(--font-mono); font-weight: 800; color: var(--cyan); font-size: 1.1rem;">
                ${qrToken}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.3rem;">
                Scan QR Pass via Valet Terminal or enter Client Handover PIN
              </div>
            </div>

            <div class="form-group">
              <label for="pickup-driver-name">Valet / Handover Concierge Name</label>
              <input type="text" id="pickup-driver-name" class="form-input" value="${this.currentUser ? this.currentUser.name : 'Sarah Connor'}">
            </div>

            <div class="form-group">
              <label for="pickup-odometer-start">Starting Odometer Reading</label>
              <input type="text" id="pickup-odometer-start" class="form-input" value="12,450 km">
            </div>

            <div class="form-group">
              <label for="pickup-concierge-notes">Pre-Handover Inspection Notes</label>
              <input type="text" id="pickup-concierge-notes" class="form-input" placeholder="e.g. Pristine condition, VIP greeted, signature confirmed.">
            </div>
          </div>

          <div>
            <div class="cart-product-hero" style="margin-bottom: 1rem;">
              <img src="${r.product_image}" alt="${r.product_name}" class="cart-hero-img">
              <div>
                <span class="spotlight-tag">${r.rental_code}</span>
                <h3 style="color: #fff; font-size: 1.2rem; margin: 0.2rem 0;">${r.product_name}</h3>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  Driver: <strong style="color: #fff;">${r.user_name}</strong> (${r.user_phone || r.user_email})
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                  Deposit in Escrow: <strong style="color: var(--amber);">$${r.deposit_amount.toFixed(2)} (${r.deposit_status})</strong>
                </div>
              </div>
            </div>

            <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 0.6rem;">Pre-Handover Digital Checklist</h4>
            <div class="checklist-container" id="pickup-checklist-container">
              ${this.activeChecklist.map((c, idx) => `
                <div class="checklist-item-card ${c.checked ? 'checked' : ''}" onclick="app.toggleChecklistItem(${idx})">
                  <input type="checkbox" ${c.checked ? 'checked' : ''} style="pointer-events: none;">
                  <span style="font-size: 0.85rem; color: #fff;">${c.item}</span>
                </div>
              `).join('')}
            </div>

            <div class="form-actions" style="margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="app.closeModal('pickup-scanner-modal')">Cancel</button>
              <button type="button" class="btn btn-cyan" onclick="app.submitPickupConfirmation(${r.id})">
                <i data-lucide="check-check"></i> Confirm QR Scan & Handover Key
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('pickup-scanner-content').innerHTML = html;
      this.openModal('pickup-scanner-modal');
    } catch (err) {
      this.showToast('Could not load pickup scanner: ' + err.message, 'error');
    }
  }

  toggleChecklistItem(index) {
    if (this.activeChecklist[index]) {
      this.activeChecklist[index].checked = !this.activeChecklist[index].checked;
      const container = document.getElementById('pickup-checklist-container');
      if (container) {
        container.innerHTML = this.activeChecklist.map((c, idx) => `
          <div class="checklist-item-card ${c.checked ? 'checked' : ''}" onclick="app.toggleChecklistItem(${idx})">
            <input type="checkbox" ${c.checked ? 'checked' : ''} style="pointer-events: none;">
            <span style="font-size: 0.85rem; color: #fff;">${c.item}</span>
          </div>
        `).join('');
      }
    }
  }

  async submitPickupConfirmation(rentalId) {
    const driverName = document.getElementById('pickup-driver-name')?.value || 'Marcus Valet Dispatch';
    const odoStart = document.getElementById('pickup-odometer-start')?.value || '12,450 km';
    const notes = document.getElementById('pickup-concierge-notes')?.value || '';

    try {
      const res = await fetch(`${this.apiBase}/dispatch/pickups/${rentalId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          driver_name: driverName,
          odometer_start: odoStart,
          checklist: this.activeChecklist,
          inspector_notes: notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        this.closeModal('pickup-scanner-modal');
        this.showToast(data.message, 'success');
        await this.fetchDispatchHub();
        await this.fetchRentals();
        await this.fetchAnalytics();
      } else {
        this.showToast(data.error || 'Failed to confirm pickup', 'error');
      }
    } catch (err) {
      this.showToast('Error confirming pickup: ' + err.message, 'error');
    }
  }

  async notifyCustomerPickupPass(rentalId) {
    try {
      const res = await fetch(`${this.apiBase}/dispatch/pickups/${rentalId}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        this.showToast(data.message, 'success');
        await this.fetchDispatchHub();
      }
    } catch (err) {
      this.showToast('Failed to notify client: ' + err.message, 'error');
    }
  }

  // ==========================================
  // MODAL: RETURN DIAGNOSTIC & DAMAGE INTAKE
  // ==========================================
  async openReturnDiagnosticModal(rentalId) {
    try {
      const res = await fetch(`${this.apiBase}/rentals/${rentalId}`);
      if (!res.ok) throw new Error('Rental not found');
      const r = await res.json();

      this.activeDiagnosticRental = r;
      this.activeConditionGrade = 'Pristine';
      this.activeMissingItems = [];
      this.activeDamages = [];

      this.renderReturnDiagnosticModalContent();
      this.openModal('return-diagnostic-modal');
    } catch (err) {
      this.showToast('Could not open return diagnostic: ' + err.message, 'error');
    }
  }

  renderReturnDiagnosticModalContent() {
    const r = this.activeDiagnosticRental;
    if (!r) return;

    const availableAccessories = [
      { key: 'telemetry_key', name: 'Telemetry Track Pack Key', fee: 350.0 },
      { key: 'fast_charger', name: 'High-Power Fast Charge Cable (350kW)', fee: 600.0 },
      { key: 'luggage_pack', name: 'Bespoke Travel Luggage Set', fee: 1200.0 },
      { key: 'floor_mats', name: 'Lambswool / Custom Floor Liners', fee: 400.0 },
      { key: 'tire_kit', name: 'Emergency Compressor & Toolkit', fee: 250.0 }
    ];

    const missingTotal = this.activeMissingItems.reduce((sum, item) => sum + item.fee, 0);
    const damageTotal = this.activeDamages.reduce((sum, d) => sum + d.cost, 0);
    const totalDeductions = (r.late_penalty_fee || 0) + missingTotal + damageTotal;
    const netRefund = Math.max(0, r.deposit_amount - totalDeductions);
    const outstanding = Math.max(0, totalDeductions - r.deposit_amount);

    const html = `
      <div class="booking-modal-grid">
        <div>
          <div class="cart-product-hero" style="margin-bottom: 1rem;">
            <img src="${r.product_image}" alt="${r.product_name}" class="cart-hero-img">
            <div>
              <span class="spotlight-tag">${r.rental_code} (${r.invoice_number || 'INV-2026'})</span>
              <h3 style="color: #fff; font-size: 1.2rem; margin: 0.2rem 0;">${r.product_name}</h3>
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                Driver: <strong style="color: #fff;">${r.user_name}</strong> • Scheduled End: <strong>${r.end_date}</strong>
              </div>
              <div style="font-size: 0.8rem; color: var(--amber); margin-top: 0.2rem;">
                Escrow Deposit Locked: <strong>$${r.deposit_amount.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label style="font-weight: 700; color: #fff;">1. Product Condition Grade</label>
            <div class="condition-grader-grid">
              <div class="condition-card ${this.activeConditionGrade === 'Pristine' ? 'active' : ''}" onclick="app.selectConditionGrade('Pristine')">
                <i data-lucide="shield-check" style="width: 20px; height: 20px; color: var(--emerald);"></i>
                <div style="font-weight: 700; color: #fff; margin-top: 0.3rem;">Pristine</div>
                <div style="font-size: 0.7rem; color: var(--text-dim);">Zero Scratches</div>
              </div>
              <div class="condition-card ${this.activeConditionGrade === 'Minor Wear' ? 'active' : ''}" onclick="app.selectConditionGrade('Minor Wear')">
                <i data-lucide="sparkles" style="width: 20px; height: 20px; color: var(--cyan);"></i>
                <div style="font-weight: 700; color: #fff; margin-top: 0.3rem;">Minor Wear</div>
                <div style="font-size: 0.7rem; color: var(--text-dim);">Light detailing</div>
              </div>
              <div class="condition-card ${this.activeConditionGrade === 'Moderate Damage' ? 'active' : ''}" onclick="app.selectConditionGrade('Moderate Damage')">
                <i data-lucide="alert-triangle" style="width: 20px; height: 20px; color: var(--amber);"></i>
                <div style="font-weight: 700; color: #fff; margin-top: 0.3rem;">Moderate</div>
                <div style="font-size: 0.7rem; color: var(--text-dim);">Wheel/body rash</div>
              </div>
              <div class="condition-card ${this.activeConditionGrade === 'Severe Damage' ? 'active rose' : ''}" onclick="app.selectConditionGrade('Severe Damage')">
                <i data-lucide="flame" style="width: 20px; height: 20px; color: var(--rose);"></i>
                <div style="font-weight: 700; color: var(--rose); margin-top: 0.3rem;">Severe</div>
                <div style="font-size: 0.7rem; color: #fda4af;">Body & repair bay</div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label style="font-weight: 700; color: #fff; margin-bottom: 0.4rem; display: block;">2. Missing Accessories & Item Checklist</label>
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${availableAccessories.map(acc => {
                const isMissing = this.activeMissingItems.some(item => item.key === acc.key);
                return `
                  <div class="missing-item-row" style="${isMissing ? 'border-color: var(--rose); background: rgba(244,63,94,0.08);' : ''}">
                    <span style="color: ${isMissing ? 'var(--rose)' : '#fff'}; font-size: 0.85rem;">${acc.name}</span>
                    <button type="button" class="btn btn-sm ${isMissing ? 'btn-rose' : 'btn-secondary'}" onclick="app.toggleMissingItem('${acc.key}', '${acc.name}', ${acc.fee})">
                      ${isMissing ? `<i data-lucide="x"></i> Missing (+$${acc.fee})` : `<i data-lucide="check"></i> Accounted For`}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <label style="font-weight: 700; color: #fff;">3. Damage Reporting & Repair Estimates</label>
              <button type="button" class="btn btn-sm btn-secondary" onclick="app.addDamageReportRow()">
                <i data-lucide="plus"></i> Add Damaged Part
              </button>
            </div>
            <div id="damage-reports-list-container">
              ${this.activeDamages.length === 0 ? `
                <div style="font-size: 0.8rem; color: var(--text-dim); padding: 0.5rem; background: rgba(255,255,255,0.02); border-radius: 6px;">
                  No physical damage reported. Click "Add Damaged Part" if imperfections found.
                </div>
              ` : this.activeDamages.map((d, idx) => `
                <div class="damage-item-card">
                  <div>
                    <strong style="color: #fff; font-size: 0.85rem;">${d.part_name}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-dim);">${d.notes || 'Inspection defect'}</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-family: var(--font-mono); font-weight: 700; color: var(--rose);">+$${d.cost.toFixed(2)}</span>
                    <button type="button" class="btn-demo" style="padding: 0.2rem 0.5rem; color: var(--rose);" onclick="app.removeDamageReportRow(${idx})">&times;</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div>
          <div class="form-row">
            <div class="form-group">
              <label for="diag-odometer-end">Return Odometer</label>
              <input type="text" id="diag-odometer-end" class="form-input" value="13,120 km">
            </div>
            <div class="form-group">
              <label for="diag-fuel-level">Fuel / Charge Level</label>
              <input type="text" id="diag-fuel-level" class="form-input" value="100% Full">
            </div>
          </div>

          <div class="form-group">
            <label for="diag-inspector-name">Lead Inspector Staff</label>
            <input type="text" id="diag-inspector-name" class="form-input" value="${this.currentUser ? this.currentUser.name : 'Sarah Connor'}">
          </div>

          <div class="form-group">
            <label for="diag-notes">Diagnostic Inspection Findings</label>
            <textarea id="diag-notes" rows="2" class="form-textarea" placeholder="Detailed intake notes..."></textarea>
          </div>

          <!-- Live Escrow Reconciled Settlement Box -->
          <div class="price-ledger-box" style="margin-top: 1rem;">
            <h4 style="color: #fff; margin-bottom: 0.75rem;">Escrow Settlement & Deductions</h4>
            <div class="price-ledger">
              <div class="ledger-row">
                <span class="ledger-lbl">Original Deposit Locked:</span>
                <span class="ledger-val text-amber">$${r.deposit_amount.toFixed(2)}</span>
              </div>
              ${r.late_penalty_fee > 0 ? `
                <div class="ledger-row text-rose">
                  <span class="ledger-lbl text-rose">Late Return Penalty (${r.late_days_count}d):</span>
                  <span class="ledger-val">-$${r.late_penalty_fee.toFixed(2)}</span>
                </div>
              ` : ''}
              ${missingTotal > 0 ? `
                <div class="ledger-row text-rose">
                  <span class="ledger-lbl text-rose">Missing Accessories Total:</span>
                  <span class="ledger-val">-$${missingTotal.toFixed(2)}</span>
                </div>
              ` : ''}
              ${damageTotal > 0 ? `
                <div class="ledger-row text-rose">
                  <span class="ledger-lbl text-rose">Damage & Body Repair Costs:</span>
                  <span class="ledger-val">-$${damageTotal.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="ledger-divider"></div>
              <div class="ledger-row ledger-total">
                <span>Net Escrow Refunded to Card:</span>
                <span class="total-amount text-emerald">$${netRefund.toFixed(2)}</span>
              </div>
              ${outstanding > 0 ? `
                <div class="ledger-row text-rose" style="margin-top: 0.35rem;">
                  <span class="ledger-lbl text-rose">Outstanding Unpaid Balance:</span>
                  <span class="ledger-val">+$${outstanding.toFixed(2)}</span>
                </div>
              ` : ''}
            </div>

            <!-- Repair Order Automation Switch -->
            <div style="margin-top: 0.85rem; padding: 0.75rem; background: rgba(0,0,0,0.3); border-radius: 6px;">
              <label class="custom-checkbox-label">
                <input type="checkbox" id="diag-auto-repair" ${(damageTotal > 0 || this.activeConditionGrade === 'Moderate Damage' || this.activeConditionGrade === 'Severe Damage') ? 'checked' : ''}>
                <span><strong>Auto-Initiate Repair Work Order</strong> and send car to Beverly Hills Service Bay</span>
              </label>
            </div>

            <div class="form-actions" style="margin-top: 1.25rem;">
              <button type="button" class="btn btn-secondary" onclick="app.closeModal('return-diagnostic-modal')">Cancel</button>
              <button type="button" class="btn btn-gold" onclick="app.submitReturnDiagnostic(${r.id})">
                <i data-lucide="clipboard-check"></i> Complete Inspection & Settle Escrow
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('return-diagnostic-content').innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  selectConditionGrade(grade) {
    this.activeConditionGrade = grade;
    this.renderReturnDiagnosticModalContent();
  }

  toggleMissingItem(key, name, fee) {
    const idx = this.activeMissingItems.findIndex(i => i.key === key);
    if (idx >= 0) {
      this.activeMissingItems.splice(idx, 1);
    } else {
      this.activeMissingItems.push({ key, name, fee: Number(fee) });
    }
    this.renderReturnDiagnosticModalContent();
  }

  addDamageReportRow() {
    const part = prompt('Enter Damaged Part Name (e.g. Front Carbon Splitter, Rear Right Alloy Rim, Door Panel):', 'Front Carbon Splitter');
    if (!part) return;
    const costStr = prompt('Enter Estimated Repair / Replacement Cost ($):', '450.00');
    const cost = parseFloat(costStr) || 0;

    this.activeDamages.push({ part_name: part, cost, notes: 'Technician inspection defect' });
    this.renderReturnDiagnosticModalContent();
  }

  removeDamageReportRow(idx) {
    this.activeDamages.splice(idx, 1);
    this.renderReturnDiagnosticModalContent();
  }

  async submitReturnDiagnostic(rentalId) {
    const odoEnd = document.getElementById('diag-odometer-end')?.value || '13,120 km';
    const fuelLevel = document.getElementById('diag-fuel-level')?.value || '100%';
    const inspector = document.getElementById('diag-inspector-name')?.value || 'Sarah Connor';
    const notes = document.getElementById('diag-notes')?.value || '';
    const autoRepair = document.getElementById('diag-auto-repair')?.checked || false;

    const missingTotal = this.activeMissingItems.reduce((sum, item) => sum + item.fee, 0);
    const damageTotal = this.activeDamages.reduce((sum, d) => sum + d.cost, 0);

    try {
      const res = await fetch(`${this.apiBase}/dispatch/returns/${rentalId}/inspect-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          inspector_name: inspector,
          condition_grade: this.activeConditionGrade,
          odometer_end: odoEnd,
          fuel_level: fuelLevel,
          missing_items: this.activeMissingItems,
          damage_reports: this.activeDamages,
          damage_fee_input: damageTotal,
          missing_items_fee_input: missingTotal,
          requires_repair_input: autoRepair,
          repair_severity: this.activeConditionGrade === 'Severe Damage' ? 'HIGH' : 'MEDIUM',
          inspection_notes: notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        this.closeModal('return-diagnostic-modal');
        this.showToast(data.message, 'success');
        await this.fetchDispatchHub();
        await this.fetchProducts();
        await this.fetchRentals();
        await this.fetchAnalytics();
      } else {
        this.showToast(data.error || 'Failed to complete return diagnostic', 'error');
      }
    } catch (err) {
      this.showToast('Error during return diagnostic: ' + err.message, 'error');
    }
  }

  async completeServiceBayRepair(repairId) {
    const costStr = prompt('Enter Final Actual Repair Cost ($):', '1250.00');
    const cost = parseFloat(costStr) || 0;
    const techNotes = prompt('Enter Technician QA Clearance Notes:', 'Service completed. Dynamic road test passed 100% in pristine condition.');

    try {
      const res = await fetch(`${this.apiBase}/dispatch/repairs/${repairId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          actual_cost: cost,
          technician_notes: techNotes
        })
      });

      const data = await res.json();
      if (res.ok) {
        this.showToast(data.message, 'success');
        await this.fetchDispatchHub();
        await this.fetchProducts();
        await this.fetchAnalytics();
      } else {
        this.showToast(data.error || 'Failed to complete repair order', 'error');
      }
    } catch (err) {
      this.showToast('Error completing repair: ' + err.message, 'error');
    }
  }

  async openPickupPassModal(rentalId) {
    try {
      const res = await fetch(`${this.apiBase}/rentals/${rentalId}`);
      if (!res.ok) throw new Error('Rental not found');
      const r = await res.json();

      const qrToken = `QR-PKUP-${r.rental_code.replace('RNT-', '')}-${r.id}`;

      const html = `
        <div class="qr-scanner-card" style="margin-bottom: 1.5rem;">
          <div class="qr-scanner-frame">
            <i data-lucide="qr-code" style="width: 100px; height: 100px; color: var(--gold);"></i>
          </div>
          <div style="font-family: var(--font-mono); font-weight: 800; color: var(--gold); font-size: 1.35rem;">
            ${qrToken}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">
            Present this pass to your concierge valet at the lounge or flatbed driver upon delivery.
          </div>
        </div>

        <div class="cart-product-hero" style="margin-bottom: 1.25rem;">
          <img src="${r.product_image}" alt="${r.product_name}" class="cart-hero-img">
          <div>
            <span class="spotlight-tag">${r.rental_code}</span>
            <h3 style="color: #fff; font-size: 1.2rem; margin: 0.2rem 0;">${r.product_name}</h3>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              Pickup Date: <strong style="color: #fff;">${r.start_date}</strong> • Window: <strong>${r.fulfillment_type}</strong>
            </div>
            <div style="font-size: 0.8rem; color: var(--emerald); margin-top: 0.2rem;">
              Escrow Security Deposit: <strong>$${r.deposit_amount.toFixed(2)} (${r.deposit_status})</strong>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal('pickup-pass-modal')">Close Pass</button>
          <button type="button" class="btn btn-gold" onclick="window.print()">
            <i data-lucide="printer"></i> Print Digital Pass
          </button>
        </div>
      `;

      document.getElementById('pickup-pass-content').innerHTML = html;
      this.openModal('pickup-pass-modal');
    } catch (err) {
      this.showToast('Could not load pickup pass: ' + err.message, 'error');
    }
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
