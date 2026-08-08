// API Client with backend connectivity and fallback mock state

const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('leaseify_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Initial in-memory mock state for seamless local preview without requiring MongoDB up first
const initialMockData = {
  properties: [
    {
      _id: 'prop-1',
      title: 'Skyline Luxury Penthouse with Terrace',
      description: 'Spectacular panoramic city skyline views with floor-to-ceiling windows, high-end Italian quartz kitchen, smart climate control, and a private 400 sq ft rooftop terrace.',
      type: 'Apartment',
      address: {
        street: '742 Evergreen Terrace, Suite 44B',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94107',
      },
      rentAmount: 3850,
      securityDeposit: 3850,
      bedrooms: 3,
      bathrooms: 2.5,
      areaSqFt: 1850,
      status: 'rented',
      amenities: ['Floor-to-Ceiling Windows', 'Private Terrace', 'Smart Home Automation', 'EV Charging', 'Infinity Pool', 'Concierge 24/7'],
      images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80'],
      currentTenant: { _id: 'user-2', name: 'Alex Rivera', email: 'tenant@leaseify.com' },
    },
    {
      _id: 'prop-2',
      title: 'Modern Minimalist Loft in Arts District',
      description: 'Sun-drenched open concept industrial loft featuring exposed brick, polished concrete floors, 14ft timber ceilings, and stainless steel designer kitchen.',
      type: 'Condo',
      address: {
        street: '120 Art District Ave, Unit 302',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
      },
      rentAmount: 2400,
      securityDeposit: 2400,
      bedrooms: 2,
      bathrooms: 2,
      areaSqFt: 1250,
      status: 'rented',
      amenities: ['Exposed Brick', 'Polished Concrete Floors', 'High Speed Fiber', 'Fitness Center', 'Rooftop Lounge'],
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80'],
      currentTenant: { _id: 'user-3', name: 'Elena Rostova', email: 'elena@leaseify.com' },
    },
    {
      _id: 'prop-3',
      title: 'The Grand View Harbor Studio',
      description: 'Chic waterfront studio offering uninterrupted marina views, custom fold-away Murphy bed, integrated work desk, and premium Bosch appliances.',
      type: 'Studio',
      address: {
        street: '45 Marina Blvd, Apt 1204',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
      },
      rentAmount: 1850,
      securityDeposit: 1850,
      bedrooms: 1,
      bathrooms: 1,
      areaSqFt: 620,
      status: 'available',
      amenities: ['Waterfront Views', 'In-Unit Washer/Dryer', 'Bike Storage', 'Resident Kayak Dock', 'Fitness Studio'],
      images: ['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&auto=format&fit=crop&q=80'],
      currentTenant: null,
    },
    {
      _id: 'prop-4',
      title: 'Oakwood Family Residence & Garden',
      description: 'Spacious single family home in quiet cul-de-sac with manicured private backyard, 2-car garage, solar panels, master suite with walk-in closet and spa bath.',
      type: 'Single Family Home',
      address: {
        street: '884 Oakwood Pines Dr',
        city: 'Denver',
        state: 'CO',
        zipCode: '80203',
      },
      rentAmount: 4200,
      securityDeposit: 4200,
      bedrooms: 4,
      bathrooms: 3,
      areaSqFt: 2800,
      status: 'available',
      amenities: ['Fenced Backyard', '2-Car Garage', 'Solar Powered', 'Fireplace', 'Home Office', 'Central HVAC'],
      images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'],
      currentTenant: null,
    },
    {
      _id: 'prop-5',
      title: 'Highland Park Modern Townhouse',
      description: 'Tri-level modern townhouse featuring private attached garage, gourmet chef kitchen, walk-in pantry, and private rooftop entertainment deck.',
      type: 'Townhouse',
      address: {
        street: '310 Highland Ridge Way',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60614',
      },
      rentAmount: 3100,
      securityDeposit: 3100,
      bedrooms: 3,
      bathrooms: 2.5,
      areaSqFt: 1950,
      status: 'maintenance',
      amenities: ['Rooftop Deck', 'Attached Garage', 'Hardwood Flooring', 'Wine Cooler', 'Smart Thermostat'],
      images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'],
      currentTenant: null,
    },
  ],
  leases: [
    {
      _id: 'lease-1',
      property: { _id: 'prop-1', title: 'Skyline Luxury Penthouse with Terrace', rentAmount: 3850 },
      tenant: { _id: 'user-2', name: 'Alex Rivera', email: 'tenant@leaseify.com', phone: '+1 (555) 876-5432' },
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthlyRent: 3850,
      securityDeposit: 3850,
      status: 'active',
      terms: 'Standard 12-month residential agreement with automatic renewal.',
    },
    {
      _id: 'lease-2',
      property: { _id: 'prop-2', title: 'Modern Minimalist Loft in Arts District', rentAmount: 2400 },
      tenant: { _id: 'user-3', name: 'Elena Rostova', email: 'elena@leaseify.com', phone: '+1 (555) 432-1098' },
      startDate: '2026-03-01',
      endDate: '2027-02-28',
      monthlyRent: 2400,
      securityDeposit: 2400,
      status: 'active',
      terms: 'Tenant responsible for electric and high-speed internet.',
    },
  ],
  payments: [
    {
      _id: 'pay-1',
      property: { title: 'Skyline Luxury Penthouse with Terrace' },
      tenant: { name: 'Alex Rivera', email: 'tenant@leaseify.com' },
      amount: 3850,
      paymentDate: '2026-08-01',
      dueDate: '2026-08-01',
      type: 'Rent',
      paymentMethod: 'Bank Transfer',
      status: 'paid',
      transactionId: 'TXN-AUG26-001',
    },
    {
      _id: 'pay-2',
      property: { title: 'Modern Minimalist Loft in Arts District' },
      tenant: { name: 'Elena Rostova', email: 'elena@leaseify.com' },
      amount: 2400,
      paymentDate: '2026-08-01',
      dueDate: '2026-08-01',
      type: 'Rent',
      paymentMethod: 'Stripe',
      status: 'paid',
      transactionId: 'TXN-AUG26-089',
    },
    {
      _id: 'pay-3',
      property: { title: 'Skyline Luxury Penthouse with Terrace' },
      tenant: { name: 'Alex Rivera', email: 'tenant@leaseify.com' },
      amount: 3850,
      paymentDate: '2026-09-01',
      dueDate: '2026-09-01',
      type: 'Rent',
      paymentMethod: 'Bank Transfer',
      status: 'pending',
      transactionId: 'TXN-SEP26-001',
    },
  ],
  maintenance: [
    {
      _id: 'maint-1',
      property: { title: 'Skyline Luxury Penthouse with Terrace' },
      tenant: { name: 'Alex Rivera', email: 'tenant@leaseify.com' },
      title: 'Master Bathroom Shower Pressure Inspection',
      description: 'Water pressure in master shower head has decreased noticeably over the last few days.',
      category: 'Plumbing',
      priority: 'medium',
      status: 'in_progress',
      estimatedCost: 180,
      createdAt: '2026-08-04T10:30:00Z',
    },
    {
      _id: 'maint-2',
      property: { title: 'Modern Minimalist Loft in Arts District' },
      tenant: { name: 'Elena Rostova', email: 'elena@leaseify.com' },
      title: 'HVAC Air Filter Replacement & Smart Thermostat Sync',
      description: 'Regular quarterly filter replacement and reconnecting WiFi sensor.',
      category: 'HVAC',
      priority: 'low',
      status: 'resolved',
      estimatedCost: 75,
      createdAt: '2026-07-28T14:15:00Z',
    },
    {
      _id: 'maint-3',
      property: { title: 'Highland Park Modern Townhouse' },
      tenant: { name: 'Alex Rivera', email: 'tenant@leaseify.com' },
      title: 'Main Kitchen Refrigerator Ice Maker Repair',
      description: 'Ice maker stopped dispensing and motor sounds irregular.',
      category: 'Appliance',
      priority: 'high',
      status: 'open',
      estimatedCost: 320,
      createdAt: '2026-08-07T09:00:00Z',
    },
  ],
  products: [
    {
      _id: 'prod-1',
      name: 'Ultra-Comfort Modular Velvet Sectional Sofa',
      description: 'Deep-seat luxury modular 4-piece sectional with stain-resistant velvet fabric, solid oak framing, and high-resiliency foam cushions.',
      category: 'Furniture',
      pricePerDay: 18,
      securityDeposit: 250,
      stockQuantity: 6,
      isAvailable: true,
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&auto=format&fit=crop&q=80',
      ],
      features: ['Stain Resistant', 'Modular Configuration', 'Includes 4 Accent Pillows', 'Solid Hardwood Legs'],
      specifications: { brand: 'West Elm Studio', model: 'Haven-4P', condition: 'Brand New', dimensions: '112"W x 65"D x 34"H' },
    },
    {
      _id: 'prod-2',
      name: 'LG C3 65" 4K OLED evo Smart Cinema TV',
      description: 'Self-lit OLED pixels, 120Hz refresh rate, Dolby Vision IQ & Dolby Atmos, WebOS smart hub with streaming apps pre-installed.',
      category: 'Electronics',
      pricePerDay: 14,
      securityDeposit: 200,
      stockQuantity: 8,
      isAvailable: true,
      images: [
        'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
      ],
      features: ['4K Ultra HD OLED', '120Hz Gaming Mode', 'Dolby Atmos Audio', 'Includes Smart Remote & Stand'],
      specifications: { brand: 'LG Electronics', model: 'OLED65C3PUA', condition: 'Like New', dimensions: '57.1"W x 32.7"H x 1.8"D' },
    },
    {
      _id: 'prod-3',
      name: 'Ergonomic Standing Desk & Herman Miller Chair Set',
      description: 'Electric dual-motor height adjustable motorized bamboo desk (60"x30") paired with authentic Herman Miller ergonomic posture-correct chair.',
      category: 'Furniture',
      pricePerDay: 16,
      securityDeposit: 220,
      stockQuantity: 5,
      isAvailable: true,
      images: [
        'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80',
      ],
      features: ['Dual Motor Electric Lift', 'Memory Presets', 'Breathable Mesh Back', 'Adjustable Armrests'],
      specifications: { brand: 'Jarvis & Herman Miller', model: 'Pro Desk + Embody', condition: 'Brand New', dimensions: '60"W x 30"D (Height 25"-51")' },
    },
    {
      _id: 'prod-4',
      name: 'Dyson Purifier Hot+Cool Formaldehyde HP09',
      description: 'Intelligent HEPA H13 filtration capturing 99.97% of particles, real-time air quality sensor, heating and cooling airflow.',
      category: 'Appliances',
      pricePerDay: 9,
      securityDeposit: 120,
      stockQuantity: 12,
      isAvailable: true,
      images: [
        'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&fit=crop&q=80',
      ],
      features: ['HEPA H13 Sealed System', 'Dual Heating & Cooling', 'App Controlled', 'Whisper Quiet Night Mode'],
      specifications: { brand: 'Dyson', model: 'HP09 Purifier', condition: 'Like New', dimensions: '8.7"W x 30.1"H' },
    },
    {
      _id: 'prod-5',
      name: 'DeWalt 20V MAX Cordless 7-Tool Combo Kit',
      description: 'Complete heavy-duty contractor power tool set including brushless drill/driver, impact driver, circular saw, reciprocating saw, oscillating tool, 2 batteries and charger.',
      category: 'Tools',
      pricePerDay: 12,
      securityDeposit: 150,
      stockQuantity: 7,
      isAvailable: true,
      images: [
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
      ],
      features: ['Brushless Motors', '2x 5.0Ah XR Batteries', 'Heavy Duty Contractor Bag', 'Fast Charger'],
      specifications: { brand: 'DeWalt', model: 'DCK694P2', condition: 'Excellent', dimensions: '18" x 14" x 10" Bag' },
    },
    {
      _id: 'prod-6',
      name: 'Breville Barista Touch Espresso Machine & Grinder',
      description: 'Automated touchscreen coffee machine with integrated conical burr grinder, 3-second ThermoJet heating, and automatic micro-foam milk texturing.',
      category: 'Appliances',
      pricePerDay: 11,
      securityDeposit: 160,
      stockQuantity: 4,
      isAvailable: true,
      images: [
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
      ],
      features: ['Touchscreen Menu', 'Integrated Burr Grinder', 'Auto Microfoam Steam', '3-Sec Rapid Heat'],
      specifications: { brand: 'Breville', model: 'BES880BSS', condition: 'Brand New', dimensions: '12.6"W x 15.5"H x 12"D' },
    },
  ],
  rentals: [
    {
      _id: 'rent-1',
      user: { name: 'Alex Rivera', email: 'tenant@leaseify.com' },
      items: [
        {
          name: 'Ultra-Comfort Modular Velvet Sectional Sofa',
          pricePerDay: 18,
          securityDeposit: 250,
          days: 14,
          subtotal: 252,
          deposit: 250,
          image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
        },
        {
          name: 'LG C3 65" 4K OLED evo Smart Cinema TV',
          pricePerDay: 14,
          securityDeposit: 200,
          days: 14,
          subtotal: 196,
          deposit: 200,
          image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
        },
      ],
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      totalDays: 14,
      rentalTotal: 448,
      depositTotal: 450,
      grandTotal: 898,
      status: 'active',
      paymentMethod: 'Credit Card',
      paymentStatus: 'paid',
      transactionId: 'RNT-AUG26-009',
    },
  ],
};

// Safe request wrapper that tries real backend, falling back seamlessly to mock state
async function safeFetch(url, options = {}, mockHandler) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: { ...getAuthHeaders(), ...(options.headers || {}) },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Backend offline or network failure, use mock handler
  }
  return mockHandler ? mockHandler() : { success: false, data: [] };
}

export const api = {
  // Health
  checkHealth: async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  // Auth
  login: async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) return data;
      return {
        success: false,
        message: data.message || 'Login failed',
        isUnverified: data.isUnverified,
        userId: data.userId,
      };
    } catch {
      // Mock Login response
      const isAdmin = email.toLowerCase().includes('admin');
      return {
        success: true,
        token: 'demo-jwt-token-mock',
        user: {
          id: isAdmin ? 'user-1' : 'user-2',
          name: isAdmin ? 'Sarah Jenkins (Property Manager)' : 'Alex Rivera',
          email,
          role: isAdmin ? 'admin' : 'user',
          phone: '+1 (555) 234-5678',
          avatar: isAdmin
            ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        },
      };
    }
  },

  register: async (data) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (res.ok) return resData;
      return {
        success: false,
        message: resData.message || 'Registration failed',
      };
    } catch {
      return {
        success: true,
        demoMode: true,
        token: 'demo-jwt-token-mock',
        user: {
          id: 'user-' + Date.now(),
          name: data.name,
          email: data.email,
          role: data.role || 'user',
          phone: data.phone || '',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        },
      };
    }
  },

  verifyOtp: async (email, otp, signupData = {}) => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, ...signupData }),
      });
      const data = await res.json();
      if (res.ok) return data;
      return {
        success: false,
        message: data.message || 'OTP verification failed',
      };
    } catch {
      return {
        success: true,
        token: 'demo-jwt-token-mock',
        user: {
          id: 'mock-user-id',
          name: signupData.name || 'Demo Tenant (Alex)',
          email: email || 'tenant@leaseify.com',
          role: 'user',
          phone: signupData.phone || '+1 (555) 876-5432',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        },
      };
    }
  },

  resendOtp: async (email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) return data;
      return {
        success: false,
        message: data.message || 'Failed to resend OTP',
      };
    } catch {
      return {
        success: true,
        message: 'Mock OTP resent successfully',
      };
    }
  },

  // Properties
  getProperties: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return safeFetch(`/properties?${params}`, { method: 'GET' }, () => {
      let data = [...initialMockData.properties];
      if (filters.status && filters.status !== 'all') {
        data = data.filter((p) => p.status === filters.status);
      }
      if (filters.type && filters.type !== 'all') {
        data = data.filter((p) => p.type === filters.type);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        data = data.filter(
          (p) =>
            p.title.toLowerCase().includes(s) ||
            p.address.city.toLowerCase().includes(s) ||
            p.address.street.toLowerCase().includes(s)
        );
      }
      return { success: true, count: data.length, data };
    });
  },

  createProperty: async (propertyData) => {
    return safeFetch(
      '/properties',
      {
        method: 'POST',
        body: JSON.stringify(propertyData),
      },
      () => {
        const newProp = {
          _id: 'prop-' + Date.now(),
          ...propertyData,
          images: propertyData.images?.length
            ? propertyData.images
            : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80'],
          status: propertyData.status || 'available',
        };
        initialMockData.properties.unshift(newProp);
        return { success: true, data: newProp };
      }
    );
  },

  // Leases
  getLeases: async () => {
    return safeFetch('/leases', { method: 'GET' }, () => ({
      success: true,
      count: initialMockData.leases.length,
      data: initialMockData.leases,
    }));
  },

  createLease: async (leaseData) => {
    return safeFetch(
      '/leases',
      {
        method: 'POST',
        body: JSON.stringify(leaseData),
      },
      () => {
        const targetProp = initialMockData.properties.find((p) => p._id === leaseData.property);
        const newLease = {
          _id: 'lease-' + Date.now(),
          ...leaseData,
          property: targetProp || { title: 'Rental Property' },
          tenant: { name: 'Assigned Tenant', email: 'tenant@leaseify.com' },
          status: 'active',
        };
        if (targetProp) targetProp.status = 'rented';
        initialMockData.leases.unshift(newLease);
        return { success: true, data: newLease };
      }
    );
  },

  // Payments
  getPayments: async (status = 'all') => {
    return safeFetch(`/payments?status=${status}`, { method: 'GET' }, () => {
      let data = [...initialMockData.payments];
      if (status !== 'all') {
        data = data.filter((p) => p.status === status);
      }
      return { success: true, count: data.length, data };
    });
  },

  createPayment: async (paymentData) => {
    return safeFetch(
      '/payments',
      {
        method: 'POST',
        body: JSON.stringify(paymentData),
      },
      () => {
        const newPayment = {
          _id: 'pay-' + Date.now(),
          ...paymentData,
          paymentDate: new Date().toISOString().split('T')[0],
          transactionId: 'TXN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          status: 'paid',
        };
        initialMockData.payments.unshift(newPayment);
        return { success: true, data: newPayment };
      }
    );
  },

  // Maintenance
  getMaintenance: async (filters = {}) => {
    return safeFetch('/maintenance', { method: 'GET' }, () => {
      let data = [...initialMockData.maintenance];
      if (filters.status && filters.status !== 'all') {
        data = data.filter((m) => m.status === filters.status);
      }
      return { success: true, count: data.length, data };
    });
  },

  createMaintenance: async (data) => {
    return safeFetch(
      '/maintenance',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      () => {
        const newReq = {
          _id: 'maint-' + Date.now(),
          ...data,
          property: initialMockData.properties[0],
          tenant: { name: 'Alex Rivera', email: 'tenant@leaseify.com' },
          status: 'open',
          createdAt: new Date().toISOString(),
        };
        initialMockData.maintenance.unshift(newReq);
        return { success: true, data: newReq };
      }
    );
  },

  updateMaintenanceStatus: async (id, status) => {
    return safeFetch(
      `/maintenance/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      },
      () => {
        const item = initialMockData.maintenance.find((m) => m._id === id);
        if (item) item.status = status;
        return { success: true, data: item };
      }
    );
  },

  // Dashboard Stats
  getDashboardStats: async (role = 'admin') => {
    return safeFetch('/dashboard/stats', { method: 'GET' }, () => {
      if (role === 'admin') {
        const total = initialMockData.properties.length;
        const rented = initialMockData.properties.filter((p) => p.status === 'rented').length;
        const maint = initialMockData.properties.filter((p) => p.status === 'maintenance').length;
        const available = total - rented - maint;
        const totalRev = initialMockData.payments
          .filter((p) => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        return {
          success: true,
          data: {
            metrics: {
              totalProperties: total,
              occupiedProperties: rented,
              availableProperties: available,
              maintenanceProperties: maint,
              occupancyRate: Math.round((rented / total) * 100),
              totalTenants: 2,
              activeLeases: initialMockData.leases.length,
              totalRevenue: totalRev,
              pendingMaintenance: initialMockData.maintenance.filter((m) => m.status !== 'resolved').length,
            },
            monthlyRevenue: [
              { month: 'Jan', revenue: 18500, target: 20000 },
              { month: 'Feb', revenue: 19200, target: 20000 },
              { month: 'Mar', revenue: 21400, target: 22000 },
              { month: 'Apr', revenue: 22800, target: 23000 },
              { month: 'May', revenue: 24100, target: 25000 },
              { month: 'Jun', revenue: 26250, target: 26000 },
            ],
            recentPayments: initialMockData.payments,
            recentTickets: initialMockData.maintenance,
          },
        };
      } else {
        return {
          success: true,
          data: {
            metrics: {
              activeLease: initialMockData.leases[0],
              totalPaid: 7700,
              pendingDues: 3850,
              totalTickets: 2,
              openTickets: 1,
            },
            recentPayments: initialMockData.payments.slice(0, 2),
            recentTickets: initialMockData.maintenance.slice(0, 2),
          },
        };
      }
    });
  },

  // Products (Rental Inventory)
  getProducts: async (filters = {}) => {
    const cleanFilters = {};
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        cleanFilters[key] = filters[key];
      }
    });
    const params = new URLSearchParams(cleanFilters).toString();
    return safeFetch(`/products?${params}`, { method: 'GET' }, () => {
      let data = [...initialMockData.products];

      // 1. Category Filter
      if (cleanFilters.category && cleanFilters.category !== 'all') {
        data = data.filter((p) => p.category === cleanFilters.category);
      }

      // 2. Search Filter
      if (cleanFilters.search) {
        const s = cleanFilters.search.toLowerCase();
        data = data.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(s)) ||
            (p.title && p.title.toLowerCase().includes(s)) ||
            (p.location && p.location.toLowerCase().includes(s)) ||
            (p.description && p.description.toLowerCase().includes(s))
        );
      }

      // 3. Price Filter (minPrice / maxPrice)
      if (cleanFilters.minPrice) {
        data = data.filter((p) => (p.pricePerDay || 0) >= Number(cleanFilters.minPrice));
      }
      if (cleanFilters.maxPrice) {
        data = data.filter((p) => (p.pricePerDay || 0) <= Number(cleanFilters.maxPrice));
      }

      // 4. Location Filter
      if (cleanFilters.location) {
        const loc = cleanFilters.location.toLowerCase();
        data = data.filter((p) => p.location && p.location.toLowerCase().includes(loc));
      }

      // 5. Sorting
      const sort = cleanFilters.sort || 'createdAt';
      const order = cleanFilters.order === 'asc' ? 1 : -1;
      data.sort((a, b) => {
        let fieldA = sort === 'price' ? (a.pricePerDay || 0) : (a[sort] || '');
        let fieldB = sort === 'price' ? (b.pricePerDay || 0) : (b[sort] || '');

        if (sort === 'createdAt') {
          fieldA = new Date(a.createdAt || 0).getTime();
          fieldB = new Date(b.createdAt || 0).getTime();
        }

        if (fieldA < fieldB) return -1 * order;
        if (fieldA > fieldB) return 1 * order;
        return 0;
      });

      // 6. Pagination
      const page = parseInt(cleanFilters.page) || 1;
      const limit = parseInt(cleanFilters.limit) || 10;
      const total = data.length;
      const skip = (page - 1) * limit;
      const paginatedData = data.slice(skip, skip + limit);

      return {
        success: true,
        data: paginatedData,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      };
    });
  },

  getProductById: async (id) => {
    return safeFetch(`/products/${id}`, { method: 'GET' }, () => {
      const product = initialMockData.products.find((p) => p._id === id);
      return { success: !!product, data: product };
    });
  },

  createProduct: async (productData) => {
    return safeFetch(
      '/products',
      {
        method: 'POST',
        body: JSON.stringify(productData),
      },
      () => {
        const newProduct = {
          _id: 'prod-' + Date.now(),
          ...productData,
          images: productData.images?.length
            ? productData.images
            : ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80'],
          stockQuantity: productData.stockQuantity || 5,
          isAvailable: true,
        };
        initialMockData.products.unshift(newProduct);
        return { success: true, data: newProduct };
      }
    );
  },

  updateProduct: async (id, productData) => {
    return safeFetch(
      `/products/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(productData),
      },
      () => {
        const idx = initialMockData.products.findIndex((p) => p._id === id);
        if (idx !== -1) {
          initialMockData.products[idx] = { ...initialMockData.products[idx], ...productData };
          return { success: true, data: initialMockData.products[idx] };
        }
        return { success: false, message: 'Product not found' };
      }
    );
  },

  deleteProduct: async (id) => {
    return safeFetch(
      `/products/${id}`,
      {
        method: 'DELETE',
      },
      () => {
        initialMockData.products = initialMockData.products.filter((p) => p._id !== id);
        return { success: true, data: {} };
      }
    );
  },

  // Rentals (Bookings)
  getRentals: async () => {
    return safeFetch('/rentals', { method: 'GET' }, () => ({
      success: true,
      count: initialMockData.rentals.length,
      data: initialMockData.rentals,
    }));
  },

  createRentalBooking: async (bookingData) => {
    return safeFetch(
      '/rentals',
      {
        method: 'POST',
        body: JSON.stringify(bookingData),
      },
      () => {
        const newRental = {
          _id: 'rent-' + Date.now(),
          user: { name: 'Alex Rivera', email: 'tenant@leaseify.com' },
          ...bookingData,
          status: 'active',
          paymentStatus: 'paid',
          transactionId: 'RNT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          createdAt: new Date().toISOString(),
        };
        initialMockData.rentals.unshift(newRental);
        return { success: true, data: newRental };
      }
    );
  },

  updateRentalStatus: async (id, status) => {
    return safeFetch(
      `/rentals/${id}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      },
      () => {
        const item = initialMockData.rentals.find((r) => r._id === id);
        if (item) item.status = status;
        return { success: true, data: item };
      }
    );
  },

  processReturn: async (id, returnData) => {
    const payload = typeof returnData === 'object' && returnData !== null
      ? returnData
      : { returnDate: returnData };

    const rawReturnDate = payload.returnDate;

    return safeFetch(
      `/rentals/${id}/return`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => {
        const rental = initialMockData.rentals.find((r) => r._id === id);
        if (!rental) return { success: false, message: 'Rental not found' };

        const actualReturn = rawReturnDate ? new Date(rawReturnDate) : new Date();
        const scheduledEnd = new Date(rental.endDate);
        const timeDiff = actualReturn.getTime() - scheduledEnd.getTime();
        const isLate = timeDiff > 0 && Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) > 0;
        const lateDays = isLate ? Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) : 0;

        let penaltyAmount = 0;
        let refundedDepositAmount = rental.depositTotal || 450;
        let refundStatus = 'full_refunded';

        if (isLate && lateDays > 0) {
          const dailyRate = rental.items?.reduce((s, i) => s + (i.pricePerDay || 10), 0) || 25;
          penaltyAmount = Math.min(Math.round(lateDays * (dailyRate * 1.5)), refundedDepositAmount);
          refundedDepositAmount = Math.max(0, refundedDepositAmount - penaltyAmount);
          refundStatus = refundedDepositAmount > 0 ? 'partial_refunded' : 'forfeited';
        }

        rental.status = 'returned';
        rental.returnedAt = actualReturn.toISOString();
        rental.isLate = isLate;
        rental.lateDays = lateDays;
        rental.penaltyAmount = penaltyAmount;
        rental.refundedDepositAmount = refundedDepositAmount;
        rental.refundStatus = refundStatus;
        rental.refundTransactionId = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        return {
          success: true,
          message: isLate
            ? `Late return processed. $${penaltyAmount} penalty deducted. $${refundedDepositAmount} refunded.`
            : `On-time return confirmed! Full security deposit of $${refundedDepositAmount} refunded.`,
          data: rental,
        };
      }
    );
  },

  schedulePickup: async (id, pickupData) => {
    return safeFetch(
      `/rentals/${id}/schedule-pickup`,
      {
        method: 'POST',
        body: JSON.stringify(pickupData),
      },
      () => {
        const rental = initialMockData.rentals.find((r) => r._id === id);
        if (rental) {
          rental.scheduledPickupDate = pickupData.scheduledPickupDate;
          rental.pickupLocation = pickupData.pickupLocation || rental.pickupLocation;
          rental.status = 'booked';
        }
        return {
          success: true,
          message: 'Pickup scheduled successfully!',
          data: rental,
        };
      }
    );
  },

  markAsPicked: async (id, data = {}) => {
    return safeFetch(
      `/rentals/${id}/mark-picked`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      () => {
        const rental = initialMockData.rentals.find((r) => r._id === id);
        if (rental) {
          rental.status = 'picked';
          rental.pickedAt = new Date().toISOString();
          rental.pickedBy = data.pickedByName ? { name: data.pickedByName, phone: data.pickedByPhone } : null;
        }
        return {
          success: true,
          message: 'Item marked as Picked Up! Rental period active.',
          data: rental,
        };
      }
    );
  },

  verifyQRToken: async (id, qrData) => {
    return safeFetch(
      `/rentals/${id}/verify-qr`,
      {
        method: 'POST',
        body: JSON.stringify(qrData),
      },
      () => {
        const rental = initialMockData.rentals.find((r) => r._id === id);
        if (rental) {
          if (qrData.action === 'pickup') {
            rental.status = 'picked';
            rental.pickedAt = new Date().toISOString();
          } else if (qrData.action === 'return') {
            rental.status = 'returned';
            rental.returnedAt = new Date().toISOString();
          }
        }
        return {
          success: true,
          message: `✅ QR Code Verified for Order #${rental?.transactionId || 'RNT-99'}!`,
          data: rental,
        };
      }
    );
  },

  getInvoice: async (id) => {
    return safeFetch(`/rentals/${id}/invoice`, { method: 'GET' }, () => {
      const rental = initialMockData.rentals.find((r) => r._id === id) || initialMockData.rentals[0];
      return {
        success: true,
        data: {
          invoiceNumber: rental.invoiceNumber || 'INV-99201',
          transactionId: rental.transactionId || 'RNT-AUG26-009',
          issueDate: rental.createdAt || new Date().toISOString(),
          status: rental.status,
          customer: {
            name: rental.user?.name || 'Alex Rivera',
            email: rental.user?.email || 'tenant@leaseify.com',
            phone: '+1 (555) 876-5432',
            deliveryNotes: rental.notes || 'Deliver to Suite 44B',
          },
          rentalPeriod: {
            startDate: rental.startDate,
            endDate: rental.endDate,
            totalDays: rental.totalDays || 14,
            returnedAt: rental.returnedAt || null,
            isLate: rental.isLate || false,
            lateDays: rental.lateDays || 0,
          },
          items: rental.items || [],
          accounting: {
            rentalSubtotal: rental.rentalTotal || 448,
            depositCharged: rental.depositTotal || 450,
            grandTotalPaid: rental.grandTotal || 898,
            penaltyDeducted: rental.penaltyAmount || 0,
            depositRefunded: rental.refundedDepositAmount !== undefined ? rental.refundedDepositAmount : 450,
            refundStatus: rental.refundStatus || 'full_refunded',
            refundTransactionId: rental.refundTransactionId || 'REF-88912',
            netCustomerExpense: (rental.rentalTotal || 448) + (rental.penaltyAmount || 0),
          },
          payment: {
            method: rental.paymentMethod || 'Credit Card',
            status: rental.paymentStatus || 'paid',
          },
        },
      };
    });
  },

  getRentalSettings: async () => {
    return safeFetch('/rentals/settings', { method: 'GET' }, () => ({
      success: true,
      data: {
        lateFeePerDay: 20,
        gracePeriodDays: 1,
        autoOverdueCheck: true,
        feeCalculationType: 'flat_rate',
      },
    }));
  },

  updateRentalSettings: async (settingsData) => {
    return safeFetch(
      '/rentals/settings',
      {
        method: 'PUT',
        body: JSON.stringify(settingsData),
      },
      () => ({
        success: true,
        message: 'Rental settings updated successfully',
        data: settingsData,
      })
    );
  },

  sendReminderEmail: async (id, data = {}) => {
    return safeFetch(
      `/rentals/${id}/send-reminder`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      () => ({
        success: true,
        message: 'Reminder email dispatched successfully!',
        data: {
          sentAt: new Date().toISOString(),
          status: 'delivered',
        },
      })
    );
  },

  getPredictions: async () => {
    return safeFetch('/rentals/predictions', { method: 'GET' }, () => ({
      success: true,
      data: {
        predictions: [],
        productAvailability: [],
        riskDistribution: [],
        revenueForecast: [],
      },
    }));
  },

  syncOverdueRentals: async () => {
    return safeFetch(
      '/rentals/sync-overdue',
      {
        method: 'POST',
      },
      () => ({
        success: true,
        message: 'Overdue rentals sweep complete',
      })
    );
  },
};
