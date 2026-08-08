// backend/config/database.js - SQLite Database Schema & Seeder with Product Variants & Dynamic Time-Based Pricelist Engine
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { generateSalt, hashPassword } = require('../services/authService');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'leaseify.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY,
      company_name TEXT NOT NULL DEFAULT 'Leaseify Premier Car & Fleet Rentals',
      currency_symbol TEXT NOT NULL DEFAULT '$',
      late_fee_mode TEXT NOT NULL DEFAULT 'DAILY' CHECK(late_fee_mode IN ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY')),
      late_fee_hourly_rate REAL NOT NULL DEFAULT 65.0,
      late_fee_daily_multiplier REAL NOT NULL DEFAULT 1.5,
      late_fee_weekly_rate REAL NOT NULL DEFAULT 2500.0,
      late_fee_monthly_rate REAL NOT NULL DEFAULT 8500.0,
      grace_period_hours INTEGER NOT NULL DEFAULT 4,
      max_penalty_limit REAL NOT NULL DEFAULT 5000.0,
      auto_generate_penalty_invoice INTEGER NOT NULL DEFAULT 1,
      deposit_percentage_default REAL NOT NULL DEFAULT 20.0,
      default_pricelist_id INTEGER DEFAULT 1,
      min_rental_days INTEGER NOT NULL DEFAULT 1,
      max_rental_days INTEGER NOT NULL DEFAULT 30,
      pickup_location TEXT NOT NULL DEFAULT 'Leaseify Executive Lounge, 850 Sunset Blvd, West Hollywood',
      contact_email TEXT NOT NULL DEFAULT 'concierge@leaseify.io',
      simulated_days_offset INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'customer')),
      avatar TEXT,
      address TEXT,
      phone TEXT,
      membership_tier TEXT DEFAULT 'Standard',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      brand TEXT NOT NULL,
      manufacturer TEXT NOT NULL DEFAULT 'OEM Factory',
      color TEXT NOT NULL DEFAULT 'Obsidian Black',
      size TEXT NOT NULL DEFAULT 'Standard Spec',
      model TEXT,
      image TEXT NOT NULL,
      daily_rate REAL NOT NULL,
      weekly_rate REAL NOT NULL,
      deposit_type TEXT NOT NULL DEFAULT 'FIXED' CHECK(deposit_type IN ('FIXED', 'PERCENTAGE')),
      deposit_rate REAL NOT NULL DEFAULT 1000.0,
      deposit_amount REAL NOT NULL,
      replacement_value REAL NOT NULL,
      total_stock INTEGER NOT NULL DEFAULT 1,
      available_stock INTEGER NOT NULL DEFAULT 1,
      condition_status TEXT NOT NULL DEFAULT 'Pristine',
      description TEXT NOT NULL,
      features TEXT,
      accessories_included TEXT,
      serial_number TEXT,
      top_speed TEXT,
      acceleration TEXT,
      horsepower TEXT,
      fuel_type TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      variant_name TEXT NOT NULL,
      brand TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      color TEXT NOT NULL,
      color_hex TEXT NOT NULL DEFAULT '#f59e0b',
      size TEXT NOT NULL DEFAULT 'Standard Spec',
      trim_package TEXT DEFAULT 'Standard Performance',
      daily_rate_override REAL,
      deposit_amount_override REAL,
      stock_count INTEGER NOT NULL DEFAULT 1,
      available_stock INTEGER NOT NULL DEFAULT 1,
      image_override TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS pricelists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      condition_type TEXT NOT NULL DEFAULT 'GENERAL' CHECK(condition_type IN ('GENERAL', 'CUSTOMER_TIER', 'SEASONAL_DEMAND', 'WEEKEND_TRACK', 'CORPORATE_FLEET')),
      discount_percent REAL NOT NULL DEFAULT 0,
      weekend_multiplier REAL NOT NULL DEFAULT 1.0,
      min_days INTEGER NOT NULL DEFAULT 1,
      time_tier_1d_discount REAL NOT NULL DEFAULT 0,
      time_tier_3d_discount REAL NOT NULL DEFAULT 5.0,
      time_tier_7d_discount REAL NOT NULL DEFAULT 15.0,
      time_tier_30d_discount REAL NOT NULL DEFAULT 25.0,
      valid_from TEXT,
      valid_to TEXT,
      applicable_category_id TEXT,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rental_period_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      duration_days INTEGER NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 0,
      badge_tag TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      pricelist_id INTEGER,
      custom_daily_rate REAL NOT NULL,
      base_rental_fee REAL NOT NULL,
      deposit_type TEXT NOT NULL DEFAULT 'FIXED',
      deposit_amount REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total_quoted REAL NOT NULL,
      fulfillment_type TEXT NOT NULL DEFAULT 'PICKUP',
      delivery_address TEXT,
      valid_until TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SENT' CHECK(status IN ('DRAFT', 'SENT', 'CONVERTED', 'EXPIRED', 'CANCELLED')),
      converted_rental_id INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (pricelist_id) REFERENCES pricelists(id)
    );

    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_code TEXT UNIQUE NOT NULL,
      invoice_number TEXT UNIQUE,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      quotation_id INTEGER,
      pricelist_id INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      actual_return_date TEXT,
      duration_days INTEGER NOT NULL,
      daily_rate REAL NOT NULL,
      base_rental_fee REAL NOT NULL,
      deposit_type TEXT NOT NULL DEFAULT 'FIXED',
      deposit_rate_applied REAL NOT NULL DEFAULT 0,
      deposit_amount REAL NOT NULL,
      deposit_status TEXT NOT NULL DEFAULT 'HELD' CHECK(deposit_status IN ('HELD', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FORFEITED', 'PENDING_SETTLEMENT')),
      damage_fee REAL NOT NULL DEFAULT 0,
      late_hours_count REAL NOT NULL DEFAULT 0,
      late_days_count INTEGER NOT NULL DEFAULT 0,
      late_penalty_fee REAL NOT NULL DEFAULT 0,
      late_fee_mode_applied TEXT DEFAULT 'DAILY',
      late_penalty_invoice_number TEXT UNIQUE,
      outstanding_penalty_balance REAL NOT NULL DEFAULT 0,
      penalty_invoice_generated_at TEXT,
      deposit_refunded_amount REAL NOT NULL DEFAULT 0,
      deposit_held_at TEXT,
      deposit_settled_at TEXT,
      deposit_refund_tx_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
      fulfillment_type TEXT NOT NULL DEFAULT 'PICKUP',
      delivery_address TEXT,
      delivery_fee REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'CREDIT_CARD',
      paid_at TEXT,
      pickup_notes TEXT,
      return_notes TEXT,
      customer_notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (quotation_id) REFERENCES quotations(id)
    );

    CREATE TABLE IF NOT EXISTS pickup_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER NOT NULL,
      schedule_date TEXT NOT NULL,
      time_slot TEXT NOT NULL DEFAULT '10:00 AM - 12:00 PM',
      route_name TEXT DEFAULT 'West LA Executive Route #1',
      stop_sequence INTEGER NOT NULL DEFAULT 1,
      driver_name TEXT DEFAULT 'Marcus Valet Dispatch',
      fulfillment_type TEXT NOT NULL DEFAULT 'PICKUP',
      destination_address TEXT,
      qr_token TEXT UNIQUE NOT NULL,
      checklist_json TEXT,
      status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'EN_ROUTE', 'CONFIRMED_PICKED_UP', 'CANCELLED')),
      customer_notified_at TEXT,
      confirmed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals(id)
    );

    CREATE TABLE IF NOT EXISTS return_inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER NOT NULL,
      schedule_date TEXT NOT NULL,
      actual_return_date TEXT,
      inspector_name TEXT NOT NULL DEFAULT 'Store Diagnostic Lead',
      condition_grade TEXT NOT NULL DEFAULT 'Pristine' CHECK(condition_grade IN ('Pristine', 'Minor Wear', 'Moderate Damage', 'Severe Damage')),
      checklist_json TEXT,
      missing_items_json TEXT,
      damage_reports_json TEXT,
      damage_fee REAL NOT NULL DEFAULT 0,
      missing_items_fee REAL NOT NULL DEFAULT 0,
      late_fee REAL NOT NULL DEFAULT 0,
      deposit_refunded REAL NOT NULL DEFAULT 0,
      requires_repair INTEGER NOT NULL DEFAULT 0,
      repair_order_id INTEGER,
      status TEXT NOT NULL DEFAULT 'PENDING_INSPECTION' CHECK(status IN ('PENDING_INSPECTION', 'INSPECTED_PASSED', 'INSPECTED_DAMAGES', 'REPAIR_ORDER_DISPATCHED')),
      confirmed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals(id)
    );

    CREATE TABLE IF NOT EXISTS repair_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_code TEXT UNIQUE NOT NULL,
      rental_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      damage_description TEXT NOT NULL,
      parts_needed_json TEXT,
      estimated_cost REAL NOT NULL DEFAULT 0,
      actual_cost REAL NOT NULL DEFAULT 0,
      service_center TEXT NOT NULL DEFAULT 'Leaseify Master Supercar Service Center (Beverly Hills)',
      status TEXT NOT NULL DEFAULT 'DISPATCHED' CHECK(status IN ('DISPATCHED', 'IN_SERVICE', 'COMPLETED', 'QA_CLEARED')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (rental_id) REFERENCES rentals(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS deposit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER NOT NULL,
      transaction_code TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('ESCROW_LOCK', 'FULL_REFUND', 'PARTIAL_REFUND', 'PENALTY_DEDUCTION', 'DAMAGE_DEDUCTION', 'FORFEITURE')),
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      payment_channel TEXT,
      notes TEXT,
      actor_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS inspection_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER NOT NULL,
      inspector_name TEXT NOT NULL,
      inspection_type TEXT NOT NULL,
      condition_grade TEXT NOT NULL,
      checklist_json TEXT NOT NULL,
      damage_fee_assessed REAL NOT NULL DEFAULT 0,
      late_fee_assessed REAL NOT NULL DEFAULT 0,
      deposit_refund_calculated REAL NOT NULL DEFAULT 0,
      inspection_notes TEXT,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals(id)
    );

    CREATE TABLE IF NOT EXISTS customer_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reminder_type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'SMS',
      status TEXT NOT NULL DEFAULT 'QUEUED',
      scheduled_time TEXT NOT NULL,
      sent_at TEXT,
      message_body TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER UNIQUE NOT NULL,
      odometer_km INTEGER NOT NULL DEFAULT 12500,
      engine_hours INTEGER NOT NULL DEFAULT 380,
      tire_tread_depth_mm REAL NOT NULL DEFAULT 6.5,
      brake_pad_wear_pct REAL NOT NULL DEFAULT 22.0,
      oil_life_pct REAL NOT NULL DEFAULT 82.0,
      last_service_date TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action_type TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Safe column migration - adds a column only if it doesn't already exist
function addColumnIfMissing(table, col, type) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  } catch (e) {
    // Column already exists - ignore the error
  }
}

function migrateSchema() {
  // Ensure customer_reminders & vehicle_telemetry exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reminder_type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'SMS',
      status TEXT NOT NULL DEFAULT 'QUEUED',
      scheduled_time TEXT NOT NULL,
      sent_at TEXT,
      message_body TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicle_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER UNIQUE NOT NULL,
      odometer_km INTEGER NOT NULL DEFAULT 12500,
      engine_hours INTEGER NOT NULL DEFAULT 380,
      tire_tread_depth_mm REAL NOT NULL DEFAULT 6.5,
      brake_pad_wear_pct REAL NOT NULL DEFAULT 22.0,
      oil_life_pct REAL NOT NULL DEFAULT 82.0,
      last_service_date TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // pricelists table - add columns introduced by the Product & Pricing system update
  addColumnIfMissing('pricelists', 'is_default', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('pricelists', 'condition_type', "TEXT NOT NULL DEFAULT 'GENERAL'");
  addColumnIfMissing('pricelists', 'weekend_multiplier', 'REAL NOT NULL DEFAULT 1.0');
  addColumnIfMissing('pricelists', 'min_days', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing('pricelists', 'time_tier_1d_discount', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('pricelists', 'time_tier_3d_discount', 'REAL NOT NULL DEFAULT 5.0');
  addColumnIfMissing('pricelists', 'time_tier_7d_discount', 'REAL NOT NULL DEFAULT 15.0');
  addColumnIfMissing('pricelists', 'time_tier_30d_discount', 'REAL NOT NULL DEFAULT 25.0');
  addColumnIfMissing('pricelists', 'valid_from', 'TEXT');
  addColumnIfMissing('pricelists', 'valid_to', 'TEXT');
  addColumnIfMissing('pricelists', 'applicable_category_id', 'TEXT');
  addColumnIfMissing('pricelists', 'description', 'TEXT');
  addColumnIfMissing('pricelists', 'is_active', 'INTEGER NOT NULL DEFAULT 1');

  // products table - add columns introduced by the attributes update
  addColumnIfMissing('products', 'brand', "TEXT NOT NULL DEFAULT 'Unknown'");
  addColumnIfMissing('products', 'manufacturer', "TEXT NOT NULL DEFAULT 'OEM Factory'");
  addColumnIfMissing('products', 'color', "TEXT NOT NULL DEFAULT 'Obsidian Black'");
  addColumnIfMissing('products', 'size', "TEXT NOT NULL DEFAULT 'Standard Spec'");
  addColumnIfMissing('products', 'deposit_type', "TEXT NOT NULL DEFAULT 'FIXED'");
  addColumnIfMissing('products', 'deposit_rate', 'REAL NOT NULL DEFAULT 0');

  // rental_period_presets table - add badge_tag if missing
  addColumnIfMissing('rental_period_presets', 'badge_tag', 'TEXT');
}


function seedDatabase(force = false) {
  if (force) {
    db.exec(`
      DROP TABLE IF EXISTS repair_orders;
      DROP TABLE IF EXISTS return_inspections;
      DROP TABLE IF EXISTS pickup_schedules;
      DROP TABLE IF EXISTS activity_logs;
      DROP TABLE IF EXISTS inspection_logs;
      DROP TABLE IF EXISTS deposit_transactions;
      DROP TABLE IF EXISTS rentals;
      DROP TABLE IF EXISTS quotations;
      DROP TABLE IF EXISTS rental_period_presets;
      DROP TABLE IF EXISTS pricelists;
      DROP TABLE IF EXISTS product_variants;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS system_config;
    `);
    initSchema();
  } else {
    const existingConfig = db.prepare('SELECT COUNT(*) as count FROM system_config').get();
    if (existingConfig && existingConfig.count > 0) {
      return;
    }
  }

  // System Config
  db.prepare(`
    INSERT INTO system_config (
      id, company_name, currency_symbol, late_fee_mode, late_fee_hourly_rate,
      late_fee_daily_multiplier, late_fee_weekly_rate, late_fee_monthly_rate,
      grace_period_hours, max_penalty_limit, auto_generate_penalty_invoice,
      deposit_percentage_default, default_pricelist_id, min_rental_days, max_rental_days,
      pickup_location, contact_email, simulated_days_offset
    ) VALUES (
      1, 'Leaseify Premier Fleet', '$', 'DAILY', 65.0,
      1.5, 2500.0, 8500.0,
      4, 5000.0, 1,
      20.0, 1, 1, 30,
      'Leaseify Executive Lounge, 850 Sunset Blvd, West Hollywood', 'concierge@leaseify.io', 0
    )
  `).run();

  // Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, salt, role, avatar, address, phone, membership_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adminSalt = generateSalt();
  insertUser.run(
    1,
    'Sarah Connor',
    'admin@leaseify.io',
    hashPassword('admin123', adminSalt),
    adminSalt,
    'admin',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'Leaseify HQ, 850 Sunset Blvd, West Hollywood, CA',
    '+1 (555) 234-5678',
    'Executive Fleet Director'
  );

  const alexSalt = generateSalt();
  insertUser.run(
    2,
    'Alex Rivera',
    'alex.rivera@example.com',
    hashPassword('user123', alexSalt),
    alexSalt,
    'customer',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    '452 Ocean Drive, Apt 14B, Santa Monica, CA',
    '+1 (555) 876-5432',
    'Black Card Elite'
  );

  const marcusSalt = generateSalt();
  insertUser.run(
    3,
    'Marcus Vance',
    'marcus.v@example.com',
    hashPassword('user123', marcusSalt),
    marcusSalt,
    'customer',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    '788 Beverly Glen Blvd, Los Angeles, CA',
    '+1 (555) 345-6789',
    'Platinum Driver'
  );

  const elenaSalt = generateSalt();
  insertUser.run(
    4,
    'Elena Rostova',
    'elena.r@example.com',
    hashPassword('user123', elenaSalt),
    elenaSalt,
    'customer',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    '120 Wilshire Blvd, Suite 800, Los Angeles, CA',
    '+1 (555) 987-6543',
    'Gold Member'
  );

  // Categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, icon, description)
    VALUES (?, ?, ?, ?)
  `);

  insertCategory.run('supercars', 'Supercars & Exotics', 'gauge', 'V10 & V8 mid-engine hypercars and aerodynamic track weapons');
  insertCategory.run('electric', 'Electric Performance', 'zap', 'Instant-torque electric hyper-GTs and luxury cruisers');
  insertCategory.run('luxury-suv', 'Luxury & Armored SUVs', 'shield', 'High-riding executive off-roaders with ultimate comfort and road presence');
  insertCategory.run('grand-touring', 'Grand Tourers & Coupes', 'compass', 'High-speed long-distance luxury coupes with bespoke leather interiors');
  insertCategory.run('executive', 'Executive Luxury Sedans', 'briefcase', 'Chauffeur-grade flagships engineered for effortless quiet cruising');

  // Products with Brand, Manufacturer, Color, Size
  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, name, category_id, brand, manufacturer, color, size, model, image, daily_rate, weekly_rate,
      deposit_type, deposit_rate, deposit_amount, replacement_value, total_stock, available_stock,
      condition_status, description, features, accessories_included, serial_number,
      top_speed, acceleration, horsepower, fuel_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const carsData = [
    {
      id: 1,
      name: 'Porsche 911 GT3 RS (992)',
      category: 'supercars',
      brand: 'Porsche',
      manufacturer: 'Dr. Ing. h.c. F. Porsche AG (Stuttgart-Zuffenhausen, Germany)',
      color: 'Speed Yellow / Weissach Carbon',
      size: 'Track Widebody (2-Door Coupe)',
      model: '911 GT3 RS',
      image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 650.0,
      weekly_rate: 3400.0,
      deposit_type: 'FIXED',
      deposit_rate: 1500.0,
      deposit_amount: 1500.0,
      replacement_val: 285000.0,
      total_stock: 3,
      available_stock: 2,
      condition: 'Pristine',
      desc: 'Naturally aspirated 4.0-liter flat-six engine revving to 9,000 RPM with DRS active aerodynamics, Weissach package, and carbon fiber bucket seats.',
      features: JSON.stringify(['Weissach Lightweight Pack', 'PDK 7-Speed Dual Clutch', 'Active DRS Aero Wing', 'Front Axle Lift System']),
      accessories: JSON.stringify(['Telemetry Track Pack Key', 'Indoor Car Cover', 'Emergency Tire Kit', 'Fast Transponder']),
      serial: 'VIN-WP0ZZZ99ZTS-8812',
      top_speed: '296 km/h',
      acceleration: '3.0s (0-100)',
      horsepower: '525 HP',
      fuel_type: 'Premium 98'
    },
    {
      id: 2,
      name: 'Audi RS e-tron GT Carbon Black Edition',
      category: 'electric',
      brand: 'Audi',
      manufacturer: 'Audi Sport GmbH (Neckarsulm, Germany)',
      color: 'Electric Cyan Metallic',
      size: '4-Door Grand Tourer (4-Seater)',
      model: 'RS e-tron GT',
      image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 420.0,
      weekly_rate: 2200.0,
      deposit_type: 'PERCENTAGE',
      deposit_rate: 25.0,
      deposit_amount: 1050.0,
      replacement_val: 165000.0,
      total_stock: 4,
      available_stock: 3,
      condition: 'Pristine',
      desc: 'Dual electric motors producing up to 637 HP in boost mode with 800-volt high-speed architecture, carbon ceramic brakes, and Bang & Olufsen 3D sound.',
      features: JSON.stringify(['800V Ultra-Fast Charging', 'All-Wheel Steering', 'Carbon Ceramic Brakes', 'Head-Up Display with AR']),
      accessories: JSON.stringify(['CCS Fast Charge Cable (350kW)', 'Audi KeyCard', 'Luggage Net']),
      serial: 'VIN-WAUZZZF28N1-4491',
      top_speed: '250 km/h',
      acceleration: '3.1s (0-100)',
      horsepower: '637 HP',
      fuel_type: '100% Electric (93 kWh)'
    },
    {
      id: 3,
      name: 'Mercedes-AMG G63 Night Edition',
      category: 'luxury-suv',
      brand: 'Mercedes-Benz',
      manufacturer: 'Mercedes-AMG GmbH (Affalterbach / Graz, Austria)',
      color: 'Obsidian Black Matte',
      size: 'Heavy-Duty 5-Door Armored SUV',
      model: 'AMG G63',
      image: 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 580.0,
      weekly_rate: 2950.0,
      deposit_type: 'FIXED',
      deposit_rate: 1400.0,
      deposit_amount: 1400.0,
      replacement_val: 210000.0,
      total_stock: 3,
      available_stock: 1,
      condition: 'Pristine',
      desc: 'Handcrafted AMG 4.0L V8 Biturbo producing 577 hp and 627 lb-ft of torque with side-exit sport exhaust, 3 lockable differentials, and designo Nappa leather.',
      features: JSON.stringify(['AMG Performance Exhaust', 'Burmester Surround Audio', '3 Independent Diff Locks', '22-inch Forged Wheels']),
      accessories: JSON.stringify(['Night Edition Key Fob', 'Roof Crossbars', 'All-Weather Floor Liners']),
      serial: 'VIN-WDB4632761X-9902',
      top_speed: '240 km/h',
      acceleration: '4.5s (0-100)',
      horsepower: '577 HP',
      fuel_type: 'Twin-Turbo V8'
    },
    {
      id: 4,
      name: 'Ferrari F8 Tributo Spider',
      category: 'supercars',
      brand: 'Ferrari',
      manufacturer: 'Ferrari N.V. (Maranello, Italy)',
      color: 'Rosso Corsa Racing Red',
      size: 'Mid-Engine Retractable Spider',
      model: 'F8 Tributo',
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 890.0,
      weekly_rate: 4600.0,
      deposit_type: 'FIXED',
      deposit_rate: 2200.0,
      deposit_amount: 2200.0,
      replacement_val: 375000.0,
      total_stock: 2,
      available_stock: 1,
      condition: 'Pristine',
      desc: 'Award-winning 3.9-liter twin-turbo V8 pumping out 710 HP with retractable hardtop, Ferrari Dynamic Enhancer (FDE+), and Rosso Corsa paintwork.',
      features: JSON.stringify(['Side Slip Angle Control 6.1', 'Retractable Hardtop (14s)', 'Carbon Steering Wheel with LEDs', 'Carbon Ceramic Brakes']),
      accessories: JSON.stringify(['Ferrari Presentation Box', 'Battery Tender Kit', 'Toolkit']),
      serial: 'VIN-ZFF88NHA000-7711',
      top_speed: '340 km/h',
      acceleration: '2.9s (0-100)',
      horsepower: '710 HP',
      fuel_type: '3.9L Twin-Turbo V8'
    },
    {
      id: 5,
      name: 'BMW M8 Competition Gran Coupé',
      category: 'grand-touring',
      brand: 'BMW',
      manufacturer: 'BMW M GmbH (Dingolfing, Germany)',
      color: 'Isle of Man Green Metallic',
      size: 'Executive 4-Door Gran Coupé',
      model: 'M8 Competition',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 390.0,
      weekly_rate: 1980.0,
      deposit_type: 'PERCENTAGE',
      deposit_rate: 20.0,
      deposit_amount: 900.0,
      replacement_val: 148000.0,
      total_stock: 4,
      available_stock: 2,
      condition: 'Excellent',
      desc: '617-hp 4.4-liter M TwinPower Turbo V8 paired with M xDrive all-wheel drive with switchable 2WD mode and carbon fiber roof.',
      features: JSON.stringify(['M xDrive with 2WD Track Mode', 'M Carbon Bucket Seats', 'Bowers & Wilkins Diamond Sound', 'Laserlight Headlights']),
      accessories: JSON.stringify(['BMW Display Key', 'Tire Mobility Set', 'Travel Luggage Pack']),
      serial: 'VIN-WBAAE0C05M-3329',
      top_speed: '305 km/h',
      acceleration: '3.2s (0-100)',
      horsepower: '617 HP',
      fuel_type: 'TwinPower Turbo V8'
    },
    {
      id: 6,
      name: 'Tesla Model S Plaid (Tri-Motor)',
      category: 'electric',
      brand: 'Tesla',
      manufacturer: 'Tesla, Inc. (Fremont Factory, California, USA)',
      color: 'Pearl White Multi-Coat',
      size: '5-Passenger Performance Liftback',
      model: 'Model S Plaid',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 350.0,
      weekly_rate: 1800.0,
      deposit_type: 'FIXED',
      deposit_rate: 800.0,
      deposit_amount: 800.0,
      replacement_val: 110000.0,
      total_stock: 5,
      available_stock: 3,
      condition: 'Pristine',
      desc: 'Tri-motor all-wheel drive with carbon-sleeved rotors delivering 1,020 HP and unmatched straight-line acceleration with full Autopilot suite.',
      features: JSON.stringify(['1,020 HP Tri-Motor AWD', 'Yoke Steering / Wheel', 'Full Self-Driving Computer', 'Gaming Computer (10 TFLOPs)']),
      accessories: JSON.stringify(['Tesla Key Card', 'Mobile Charging Connector', 'J1772 Adapter']),
      serial: 'VIN-5YJSA1E67N-1190',
      top_speed: '322 km/h',
      acceleration: '1.99s (0-100)',
      horsepower: '1020 HP',
      fuel_type: '100% Electric (100 kWh)'
    },
    {
      id: 7,
      name: 'Rolls-Royce Ghost Extended Series II',
      category: 'executive',
      brand: 'Rolls-Royce',
      manufacturer: 'Rolls-Royce Motor Cars (Goodwood Estate, West Sussex, UK)',
      color: 'Arctic White / Bespoke Silver Contrast',
      size: 'Extended Long-Wheelbase (LWB Flagship)',
      model: 'Ghost Extended',
      image: 'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 980.0,
      weekly_rate: 5100.0,
      deposit_type: 'FIXED',
      deposit_rate: 2500.0,
      deposit_amount: 2500.0,
      replacement_val: 450000.0,
      total_stock: 2,
      available_stock: 1,
      condition: 'Pristine',
      desc: '6.75-liter twin-turbocharged V12 with Planar suspension system, Shooting Star Starlight Headliner, and bespoke champagne cooler in rear lounge.',
      features: JSON.stringify(['Starlight Headliner with Shooting Stars', 'Bespoke Audio System (1300W)', 'Effortless Automatic Doors', 'Champagne Chiller']),
      accessories: JSON.stringify(['Bespoke Umbrellas (in doors)', 'Crystal Decanter Set', 'Lambswool Floor Mats']),
      serial: 'VIN-SCA664S43M-9011',
      top_speed: '250 km/h',
      acceleration: '4.8s (0-100)',
      horsepower: '563 HP',
      fuel_type: '6.75L Twin-Turbo V12'
    },
    {
      id: 8,
      name: 'Range Rover SV Autobiography V8',
      category: 'luxury-suv',
      brand: 'Land Rover',
      manufacturer: 'Jaguar Land Rover Special Vehicle Operations (Coventry, UK)',
      color: 'Ligurian Black Satin',
      size: 'Long Wheelbase Executive SUV (4-Seater Lounge)',
      model: 'Range Rover SV',
      image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 490.0,
      weekly_rate: 2500.0,
      deposit_type: 'PERCENTAGE',
      deposit_rate: 20.0,
      deposit_amount: 1200.0,
      replacement_val: 235000.0,
      total_stock: 3,
      available_stock: 2,
      condition: 'Pristine',
      desc: 'Flagship SV bespoke luxury SUV with 523 HP twin-turbo V8, rear executive class seating, active noise cancellation, and all-wheel steering.',
      features: JSON.stringify(['SV Bespoke Ceramic Controls', '24-Way Heated/Cooled Hot Stone Massage Seats', 'Active Noise Cancelling Headrests', 'Electronic Air Suspension']),
      accessories: JSON.stringify(['SV Key Pouch', 'Deployable Side Steps Remote', 'Luggage Cover']),
      serial: 'VIN-SALWR2V45M-6623',
      top_speed: '261 km/h',
      acceleration: '4.4s (0-100)',
      horsepower: '523 HP',
      fuel_type: '4.4L Twin-Turbo V8'
    }
  ];

  for (const p of carsData) {
    insertProduct.run(
      p.id, p.name, p.category, p.brand, p.manufacturer, p.color, p.size, p.model, p.image,
      p.daily_rate, p.weekly_rate, p.deposit_type, p.deposit_rate, p.deposit_amount, p.replacement_val,
      p.total_stock, p.available_stock, p.condition, p.desc,
      p.features, p.accessories, p.serial,
      p.top_speed, p.acceleration, p.horsepower, p.fuel_type
    );
  }

  // Seed Product Variants
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (
      product_id, sku, variant_name, brand, manufacturer, color, color_hex, size, trim_package,
      daily_rate_override, deposit_amount_override, stock_count, available_stock, image_override, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Porsche 911 GT3 RS Variants
  insertVariant.run(1, 'VAR-911-YEL', 'Weissach Track Pack (Speed Yellow)', 'Porsche', 'Dr. Ing. h.c. F. Porsche AG', 'Speed Yellow', '#f59e0b', 'Track Widebody (Coupe)', 'Weissach Package & Carbon Aero', 650.0, 1500.0, 2, 1, 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200', 1);
  insertVariant.run(1, 'VAR-911-RED', 'ClubSport Racing Edition (Guards Red)', 'Porsche', 'Dr. Ing. h.c. F. Porsche AG', 'Guards Red', '#ef4444', 'Track Widebody (Coupe)', 'ClubSport Rollcage & Magnesium Wheels', 680.0, 1600.0, 1, 1, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200', 0);
  insertVariant.run(1, 'VAR-911-BLK', 'Obsidian Touring Stealth (Jet Black)', 'Porsche', 'Dr. Ing. h.c. F. Porsche AG', 'Jet Black Metallic', '#1e293b', 'Track Widebody (Coupe)', 'Touring Package with Carbon Brakes', 650.0, 1500.0, 1, 1, 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200', 0);

  // Audi RS e-tron GT Variants
  insertVariant.run(2, 'VAR-ETRON-CYAN', 'Carbon Black Edition (Electric Cyan)', 'Audi', 'Audi Sport GmbH', 'Electric Cyan', '#06b6d4', '4-Door Grand Tourer', 'Carbon Aerodynamics & 21-inch Blades', 420.0, 1050.0, 2, 2, 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200', 1);
  insertVariant.run(2, 'VAR-ETRON-GRY', 'Vorsprung Executive (Daytona Gray)', 'Audi', 'Audi Sport GmbH', 'Daytona Gray Pearl', '#64748b', '4-Door Grand Tourer', 'Vorsprung Luxury Pack with B&O 3D Sound', 450.0, 1100.0, 2, 1, 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200', 0);

  // Ferrari F8 Tributo Spider Variants
  insertVariant.run(4, 'VAR-F8-ROSSO', 'Rosso Corsa Scuderia Spec', 'Ferrari', 'Ferrari N.V.', 'Rosso Corsa', '#ef4444', 'Mid-Engine Spider (2-Seater)', 'Carbon Driving Zone & Titanium Exhaust', 890.0, 2200.0, 1, 1, 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200', 1);
  insertVariant.run(4, 'VAR-F8-GIALLO', 'Giallo Modena Track Spec', 'Ferrari', 'Ferrari N.V.', 'Giallo Modena', '#facc15', 'Mid-Engine Spider (2-Seater)', 'Forged Diamond Wheels & Carbon Splitter', 920.0, 2300.0, 1, 0, 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=1200', 0);

  // Mercedes-AMG G63 Variants
  insertVariant.run(3, 'VAR-G63-MATTE', 'Night Edition Magno (Matte Black)', 'Mercedes-Benz', 'Mercedes-AMG GmbH', 'Obsidian Black Matte', 'Heavy-Duty 5-Door Armored SUV', 'Night Package II & 22-inch Cross-Spoke', 580.0, 1400.0, 2, 1, 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=1200', 1);
  insertVariant.run(3, 'VAR-G63-WHITE', 'G Manufaktur Exclusive (Opalite White)', 'Mercedes-Benz', 'Mercedes-AMG GmbH', 'Opalite White Bright', '#f8fafc', 'Heavy-Duty 5-Door Armored SUV', 'G Manufaktur Saddle Brown Leather', 590.0, 1450.0, 1, 0, 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1200', 0);

  // Rolls-Royce Ghost Extended Variants
  insertVariant.run(7, 'VAR-RR-WHITE', 'Goodwood Bespoke (Arctic White)', 'Rolls-Royce', 'Rolls-Royce Motor Cars', 'Arctic White', 'Extended Long-Wheelbase (LWB)', 'Starlight Headliner & Champagne Cooler', 980.0, 2500.0, 1, 1, 'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?w=1200', 1);
  insertVariant.run(7, 'VAR-RR-BLACK', 'Black Badge Ghost (Midnight Sapphire)', 'Rolls-Royce', 'Rolls-Royce Motor Cars', 'Midnight Sapphire / Black Badge', '#0f172a', 'Extended Long-Wheelbase (LWB)', 'Black Badge High-Power Spec (600 HP)', 1080.0, 2800.0, 1, 0, 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200', 0);

  // Dynamic Pricelists with Condition Types & Time-Based Pricing Rules
  const insertPricelist = db.prepare(`
    INSERT INTO pricelists (
      id, name, code, is_default, condition_type, discount_percent, weekend_multiplier,
      min_days, time_tier_1d_discount, time_tier_3d_discount, time_tier_7d_discount, time_tier_30d_discount,
      valid_from, valid_to, applicable_category_id, description, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Default Standard Fleet Pricelist (Applied for all products)
  insertPricelist.run(
    1,
    'Default Global Fleet Pricelist',
    'STANDARD_FLEET_2026',
    1, // is_default
    'GENERAL',
    0.0,
    1.0,
    1,
    0.0,   // 1-2 days: full catalog daily rate
    5.0,   // 3-6 days: 5% duration savings
    15.0,  // 7-29 days: 15% weekly discount
    25.0,  // 30+ days: 25% monthly lease discount
    null, null, null,
    'Default universal rate schedule applied across entire fleet with automated time-based duration discount brackets.',
    1
  );

  // 2. VIP Black Card Concierge (Customer Condition)
  insertPricelist.run(
    2,
    'VIP Black Card Concierge (15% Off)',
    'VIP_BLACK_CARD',
    0,
    'CUSTOMER_TIER',
    15.0,
    1.0,
    1,
    15.0,
    20.0,
    25.0,
    35.0,
    null, null, null,
    'Exclusive VIP member tier offering guaranteed 15% discount across all vehicles and up to 35% on monthly bookings.',
    1
  );

  // 3. Weekend Track Surge (Demand & Day-of-Week Condition)
  insertPricelist.run(
    3,
    'Weekend Supercar Track Surge (1.20x)',
    'WEEKEND_SURGE',
    0,
    'WEEKEND_TRACK',
    0.0,
    1.20,
    2,
    0.0,
    0.0,
    10.0,
    20.0,
    null, null, 'supercars',
    'High-demand weekend multiplier for track weapons and mid-engine exotic supercars.',
    1
  );

  // 4. Summer Peak Season Surge (Seasonal Condition)
  insertPricelist.run(
    4,
    'Summer Coastal Peak Season (1.15x)',
    'SUMMER_PEAK',
    0,
    'SEASONAL_DEMAND',
    -15.0, // Negative discount = surge
    1.15,
    3,
    0.0,
    0.0,
    10.0,
    20.0,
    '2026-06-01', '2026-08-31', null,
    'Peak summer coastal surge pricing applied to convertibles and luxury SUVs.',
    1
  );

  // 5. Corporate Long-Term Lease (Corporate Fleet Condition)
  insertPricelist.run(
    5,
    'Corporate Executive Partner Lease (25% Off)',
    'CORP_EXEC_25',
    0,
    'CORPORATE_FLEET',
    25.0,
    1.0,
    14,
    25.0,
    25.0,
    30.0,
    40.0,
    null, null, 'executive',
    'Enterprise corporate executive agreements for multi-week and monthly leases.',
    1
  );

  // Rental Period Presets
  const insertPreset = db.prepare(`
    INSERT INTO rental_period_presets (id, name, code, duration_days, discount_percent, badge_tag, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertPreset.run(1, '24-Hour Supercar Sprint', 'SPRINT_1D', 1, 0, 'Sprint', 'Single day exotic car experience at base daily rate');
  insertPreset.run(2, '3-Day Weekend Coastal Escape', 'WEEKEND_3D', 3, 5, 'Popular', 'Friday through Sunday rental with 5% automated time-based discount');
  insertPreset.run(3, '7-Day Grand Tourer Week', 'WEEKLY_7D', 7, 15, 'Best Value', 'Full week booking with 15% automated time-based weekly discount');
  insertPreset.run(4, '30-Day Executive Residence Lease', 'MONTHLY_30D', 30, 25, 'Executive', 'Monthly corporate or residency fleet package with 25% discount');

  // Dates helpers
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const futureDate = (daysAhead) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return fmt(d);
  };
  const pastDate = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return fmt(d);
  };

  // Quotations
  const insertQuote = db.prepare(`
    INSERT INTO quotations (
      quote_number, customer_name, customer_email, customer_phone, customer_address,
      product_id, variant_id, start_date, end_date, duration_days, pricelist_id, custom_daily_rate,
      base_rental_fee, deposit_type, deposit_amount, delivery_fee, total_quoted, fulfillment_type,
      delivery_address, valid_until, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuote.run(
    'QUO-2026-8801',
    'Lord Charles Kensington',
    'charles.kensington@mayfair.co.uk',
    '+1 (555) 789-0123',
    'Beverly Hills Hotel, Suite 100, Beverly Hills, CA',
    7,
    10, // Rolls-Royce White Variant
    futureDate(3),
    futureDate(7),
    4,
    2,
    833.0,
    3332.0,
    'FIXED',
    2500.0,
    150.0,
    5982.0,
    'DELIVERY',
    'Beverly Hills Hotel, 9641 Sunset Blvd, Beverly Hills, CA',
    futureDate(5),
    'SENT',
    'VIP bespoke quotation prepared for London diplomatic delegation with Rolls-Royce Extended LWB.'
  );

  // Pre-seed realistic active, overdue, returned rentals
  const insertRental = db.prepare(`
    INSERT INTO rentals (
      id, rental_code, invoice_number, user_id, product_id, variant_id, quotation_id, pricelist_id,
      start_date, end_date, actual_return_date, duration_days, daily_rate, base_rental_fee,
      deposit_type, deposit_rate_applied, deposit_amount, deposit_status, damage_fee,
      late_hours_count, late_days_count, late_penalty_fee, late_fee_mode_applied, late_penalty_invoice_number,
      outstanding_penalty_balance, penalty_invoice_generated_at, deposit_refunded_amount,
      deposit_held_at, deposit_settled_at, deposit_refund_tx_id, status, fulfillment_type,
      delivery_address, delivery_fee, payment_method, paid_at, pickup_notes, return_notes,
      customer_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDepTx = db.prepare(`
    INSERT INTO deposit_transactions (rental_id, transaction_code, user_id, type, amount, balance_after, payment_channel, notes, actor_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Rental 1 (Active)
  insertRental.run(
    1, 'RNT-9110', 'INV-2026-9110', 2, 1, 1, null, 2, pastDate(2), futureDate(3), null,
    5, 650.0, 3250.0, 'FIXED', 1500.0, 1500.0, 'HELD',
    0, 0, 0, 0, 'DAILY', null, 0, null, 0, pastDate(2) + ' 10:28:00', null, null, 'ACTIVE',
    'PICKUP', 'Leaseify Executive Lounge, 850 Sunset Blvd', 0, 'CREDIT_CARD', pastDate(2) + ' 10:28:00',
    'Customer completed identity verification. Track telemetry key released in pristine condition.',
    null, 'Weekend drive on Pacific Coast Highway.', pastDate(2) + ' 10:30:00'
  );
  insertDepTx.run(1, 'DEP-TX-9110-01', 2, 'ESCROW_LOCK', 1500.0, 1500.0, 'CREDIT_CARD', 'Security deposit locked in escrow during checkout booking', 'Alex Rivera', pastDate(2) + ' 10:28:00');

  // Rental 2 (Overdue with Auto-Generated Penalty Invoice)
  insertRental.run(
    2, 'RNT-7419', 'INV-2026-7419', 3, 4, 6, null, 1, pastDate(6), pastDate(2), null,
    4, 890.0, 3560.0, 'FIXED', 2200.0, 2200.0, 'HELD',
    0, 48.0, 2, 2670.0, 'DAILY', 'INV-PEN-2026-7419', 470.0, pastDate(0) + ' 00:05:00', 0, pastDate(6) + ' 09:10:00', null, null, 'OVERDUE',
    'DELIVERY', '788 Beverly Glen Blvd, Los Angeles, CA', 150.0, 'APPLE_PAY', pastDate(6) + ' 09:10:00',
    'Delivered via white-glove enclosed transporter.',
    null, 'VIP film premiere and charity gala.', pastDate(6) + ' 09:15:00'
  );
  insertDepTx.run(2, 'DEP-TX-7419-01', 3, 'ESCROW_LOCK', 2200.0, 2200.0, 'APPLE_PAY', 'Fixed deposit locked in escrow for Ferrari F8', 'Marcus Vance', pastDate(6) + ' 09:10:00');

  // Rental 3 (Pending Approval)
  insertRental.run(
    3, 'RNT-8832', 'INV-2026-8832', 4, 2, 4, null, 1, futureDate(1), futureDate(4), null,
    3, 420.0, 1260.0, 'PERCENTAGE', 25.0, 315.0, 'HELD',
    0, 0, 0, 0, 'DAILY', null, 0, null, 0, pastDate(0) + ' 08:40:00', null, null, 'PENDING_APPROVAL',
    'PICKUP', 'LAX Private Flight Terminal Hub', 0, 'CREDIT_CARD', pastDate(0) + ' 08:40:00',
    null, null, 'Executive airport pickup and business conference tour.', pastDate(0) + ' 08:45:00'
  );
  insertDepTx.run(3, 'DEP-TX-8832-01', 4, 'ESCROW_LOCK', 315.0, 315.0, 'CREDIT_CARD', 'Percentage-based deposit (25% of $1,260.00 subtotal) locked in escrow', 'Elena Rostova', pastDate(0) + ' 08:40:00');

  // Rental 4 (Ready for Pickup)
  insertRental.run(
    4, 'RNT-6204', 'INV-2026-6204', 2, 3, 8, null, 1, futureDate(0), futureDate(3), null,
    3, 580.0, 1740.0, 'FIXED', 1400.0, 1400.0, 'HELD',
    0, 0, 0, 0, 'DAILY', null, 0, null, 0, pastDate(1) + ' 14:15:00', null, null, 'READY_FOR_PICKUP',
    'PICKUP', 'Leaseify Executive Lounge, Bay 02', 0, 'CREDIT_CARD', pastDate(1) + ' 14:15:00',
    'Vehicle fully detailed, tank topped with 98 Octane, parked in Executive Bay 02.',
    null, 'Mountain resort weekend trip.', pastDate(1) + ' 14:20:00'
  );
  insertDepTx.run(4, 'DEP-TX-6204-01', 2, 'ESCROW_LOCK', 1400.0, 1400.0, 'CREDIT_CARD', 'Deposit locked in escrow', 'Alex Rivera', pastDate(1) + ' 14:15:00');

  // Rental 5 (Return Submitted)
  insertRental.run(
    5, 'RNT-4155', 'INV-2026-4155', 4, 5, null, null, 1, pastDate(4), pastDate(0), pastDate(0),
    4, 390.0, 1560.0, 'PERCENTAGE', 20.0, 312.0, 'HELD',
    0, 0, 0, 0, 'DAILY', null, 0, null, 0, pastDate(4) + ' 10:55:00', null, null, 'RETURN_SUBMITTED',
    'PICKUP', 'Leaseify Executive Lounge Intake', 0, 'CREDIT_CARD', pastDate(4) + ' 10:55:00',
    'Vehicle returned to intake bay. Awaiting wheel rim and paintwork diagnostic inspection.',
    'Customer returned at lounge intake bay.', 'Coastal weekend tour.', pastDate(4) + ' 11:00:00'
  );
  insertDepTx.run(5, 'DEP-TX-4155-01', 4, 'ESCROW_LOCK', 312.0, 312.0, 'CREDIT_CARD', 'Percentage deposit (20% of $1,560) locked in escrow', 'Elena Rostova', pastDate(4) + ' 10:55:00');

  // Pre-seed Pickup Schedule
  const insertPickupSched = db.prepare(`
    INSERT INTO pickup_schedules (
      rental_id, schedule_date, time_slot, route_name, stop_sequence, driver_name,
      fulfillment_type, destination_address, qr_token, checklist_json, status, customer_notified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPickupSched.run(
    4, futureDate(0), '11:00 AM - 01:00 PM', 'Beverly Hills & Hollywood Route #1', 1, 'Marcus Valet Dispatch',
    'PICKUP', 'Leaseify Executive Lounge, Bay 02', 'QR-PKUP-6204-A1',
    JSON.stringify([
      { item: 'Battery / Fuel Level at 100%', passed: true },
      { item: 'Tire Pressure & Wheels Checked (34 PSI)', passed: true },
      { item: 'Exterior Paintwork Pristine & Washed', passed: true },
      { item: 'Identity & Driver License Verified', passed: true },
      { item: 'Key Fob & Access Credentials Handoff', passed: true }
    ]),
    'SCHEDULED', pastDate(0) + ' 09:00:00'
  );

  // Pre-seed Repair Order
  const insertRepair = db.prepare(`
    INSERT INTO repair_orders (
      work_order_code, rental_id, product_id, severity, damage_description, parts_needed_json,
      estimated_cost, actual_cost, service_center, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRepair.run(
    'REP-2026-1082', 2, 4, 'MEDIUM', 'Front bumper lower carbon splitter curb scrape and driver wheel rim rash.',
    JSON.stringify(['Carbon Front Splitter Blade', 'Forged Rim Polish & Refinishing']),
    1850.0, 0.0, 'Leaseify Master Supercar Service Center (Beverly Hills)', 'IN_SERVICE', pastDate(0) + ' 11:00:00'
  );

  const insertActivity = db.prepare(`
    INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertActivity.run(2, 'Penalty Engine', 'system', 'PENALTY_ACCRUED', 'Automated late penalty triggered for Ferrari F8 Tributo (RNT-7419): +$2,670.00 for 2 overdue days. Penalty Invoice INV-PEN-2026-7419 auto-generated.', pastDate(0) + ' 00:05:00');
  insertActivity.run(1, 'Sarah Connor', 'admin', 'PICKUP_AUTHORIZED', 'Vehicle Porsche 911 GT3 RS handed over to Alex Rivera with deposit lock verified in escrow.', pastDate(2) + ' 10:35:00');
}

module.exports = {
  db,
  initSchema,
  migrateSchema,
  seedDatabase
};
