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
      parent_category_id TEXT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      subcategory_id TEXT,
      brand TEXT NOT NULL,
      manufacturer TEXT NOT NULL DEFAULT 'OEM Factory',
      color TEXT NOT NULL DEFAULT 'Standard',
      size TEXT NOT NULL DEFAULT 'Standard Spec',
      model TEXT,
      image TEXT NOT NULL,
      hourly_rate REAL NOT NULL DEFAULT 0,
      daily_rate REAL NOT NULL,
      weekly_rate REAL NOT NULL,
      deposit_type TEXT NOT NULL DEFAULT 'FIXED' CHECK(deposit_type IN ('FIXED', 'PERCENTAGE')),
      deposit_rate REAL NOT NULL DEFAULT 100.0,
      deposit_amount REAL NOT NULL,
      replacement_value REAL NOT NULL,
      total_stock INTEGER NOT NULL DEFAULT 1,
      available_stock INTEGER NOT NULL DEFAULT 1,
      condition_status TEXT NOT NULL DEFAULT 'Pristine',
      description TEXT NOT NULL,
      features TEXT,
      accessories_included TEXT,
      attributes_json TEXT,
      serial_number TEXT,
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
      quantity INTEGER NOT NULL DEFAULT 1,
      rate_unit TEXT NOT NULL DEFAULT 'DAY',
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

  // categories & products updates
  addColumnIfMissing('categories', 'parent_category_id', 'TEXT');
  addColumnIfMissing('products', 'subcategory_id', 'TEXT');
  addColumnIfMissing('products', 'hourly_rate', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('products', 'attributes_json', 'TEXT');
  addColumnIfMissing('rentals', 'quantity', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing('rentals', 'rate_unit', "TEXT NOT NULL DEFAULT 'DAY'");

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
  addColumnIfMissing('products', 'brand', "TEXT NOT NULL DEFAULT 'Generic'");
  addColumnIfMissing('products', 'manufacturer', "TEXT NOT NULL DEFAULT 'OEM Factory'");
  addColumnIfMissing('products', 'color', "TEXT NOT NULL DEFAULT 'Standard'");
  addColumnIfMissing('products', 'size', "TEXT NOT NULL DEFAULT 'Standard Spec'");
  addColumnIfMissing('products', 'deposit_type', "TEXT NOT NULL DEFAULT 'FIXED'");
  addColumnIfMissing('products', 'deposit_rate', 'REAL NOT NULL DEFAULT 0');

  // rental_period_presets table - add badge_tag if missing
  addColumnIfMissing('rental_period_presets', 'badge_tag', 'TEXT');
}


function seedDatabase(force = false) {
  if (!force) {
    try {
      const check = db.prepare("SELECT id FROM categories WHERE id = 'electronics'").get();
      if (check) return;
    } catch (e) {
      // Table missing, proceed to seed
    }
  }

  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec(`
    DROP TABLE IF EXISTS customer_reminders;
    DROP TABLE IF EXISTS vehicle_telemetry;
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
  db.exec('PRAGMA foreign_keys = ON;');
  initSchema();

  // System Config
  db.prepare(`
    INSERT INTO system_config (
      id, company_name, currency_symbol, late_fee_mode, late_fee_hourly_rate,
      late_fee_daily_multiplier, late_fee_weekly_rate, late_fee_monthly_rate,
      grace_period_hours, max_penalty_limit, auto_generate_penalty_invoice,
      deposit_percentage_default, default_pricelist_id, min_rental_days, max_rental_days,
      pickup_location, contact_email, simulated_days_offset
    ) VALUES (
      1, 'Leaseify Multi-Category Rental Marketplace', '$', 'DAILY', 65.0,
      1.5, 2500.0, 8500.0,
      4, 5000.0, 1,
      20.0, 1, 1, 30,
      'Leaseify Marketplace Fulfillment Center, 850 Sunset Blvd, West Hollywood', 'concierge@leaseify.io', 0
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

  // Categories & Subcategories
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, parent_category_id, name, icon, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Main Categories
  insertCategory.run('electronics', null, 'Electronics & Gadgets', 'laptop', 'Laptops, 4K cameras, lenses, drones & high-fidelity audio');
  insertCategory.run('appliances', null, 'Home Appliances', 'tv', 'Smart refrigerators, washing machines, air conditioners & microwave ovens');
  insertCategory.run('furniture', null, 'Furniture & Living', 'armchair', 'Ergonomic desk chairs, teak dining sets, luxury beds & leather sofas');
  insertCategory.run('household', null, 'Household & Tools', 'wrench', 'Power tools, pressure washers, vacuum cleaners & kitchen appliances');
  insertCategory.run('vehicles', null, 'Vehicles & Mobility', 'bike', 'Electric scooters, e-bikes, city commuters & luxury electric cars');
  insertCategory.run('events', null, 'Event & Party Gear', 'sparkles', 'Stage lighting, DJ speakers, party furniture & event props');

  // Subcategories
  insertCategory.run('electronics-laptops', 'electronics', 'Laptops & Workstations', 'laptop', 'High performance MacBooks & gaming laptops');
  insertCategory.run('electronics-cameras', 'electronics', 'Cameras & Lenses', 'camera', 'Mirrorless 4K cameras & cinema lenses');
  insertCategory.run('electronics-audio', 'electronics', 'Audio & Headphones', 'headphones', 'Wireless ANC headphones & studio monitors');

  insertCategory.run('appliances-fridges', 'appliances', 'Refrigerators', 'snowflake', 'Double door inverter refrigerators & mini fridges');
  insertCategory.run('appliances-ac', 'appliances', 'Air Conditioners', 'wind', 'Split ACs & portable air coolers');
  insertCategory.run('appliances-washers', 'appliances', 'Washing Machines', 'washing-machine', 'Front load & top load automatic washers');

  insertCategory.run('furniture-beds', 'furniture', 'Beds & Mattresses', 'bed', 'King/Queen beds & memory foam mattresses');
  insertCategory.run('furniture-sofas', 'furniture', 'Sofas & Chairs', 'armchair', 'L-shape recliners & ergonomic office chairs');
  insertCategory.run('furniture-tables', 'furniture', 'Tables & Desks', 'table', 'Standing motorized desks & teak dining tables');

  insertCategory.run('household-tools', 'household', 'Power & Hand Tools', 'hammer', 'Cordless drills, saws & tool kits');
  insertCategory.run('household-cleaning', 'household', 'Cleaning Equipment', 'sparkles', 'Vacuum cleaners & high pressure washers');
  insertCategory.run('household-utensils', 'household', 'Kitchenware & Utensils', 'utensils', 'Induction cookware & catering sets');

  insertCategory.run('vehicles-bikes', 'vehicles', 'Electric Bikes & Scooters', 'bike', 'Long-range electric scooters & city e-bikes');
  insertCategory.run('vehicles-cars', 'vehicles', 'Rental Cars & Vans', 'car', 'Electric sedans, SUVs & cargo vans');

  insertCategory.run('events-audio', 'events', 'DJ & Party Sound', 'speaker', '240W party speakers & wireless mic systems');
  insertCategory.run('events-lighting', 'events', 'Stage Lighting', 'lamp', 'RGB LED flood lights & laser projectors');
  insertCategory.run('events-furniture', 'events', 'Event Furniture', 'layout', 'Banquet chairs, foldable tables & photo backdrops');

  // Products across Multi-Category Marketplace
  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, name, category_id, subcategory_id, brand, manufacturer, color, size, model, image,
      hourly_rate, daily_rate, weekly_rate, deposit_type, deposit_rate, deposit_amount, replacement_value,
      total_stock, available_stock, condition_status, description, features, accessories_included, attributes_json, serial_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const marketplaceProducts = [
    {
      id: 1,
      name: 'MacBook Pro 16" M3 Max (32GB / 1TB SSD)',
      category_id: 'electronics',
      subcategory_id: 'electronics-laptops',
      brand: 'Apple',
      manufacturer: 'Apple Inc. (Cupertino, CA)',
      color: 'Space Black',
      size: '16.2-inch Display',
      model: 'M3 Max 16-Core',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 18.0,
      daily_rate: 45.0,
      weekly_rate: 180.0,
      deposit_type: 'FIXED',
      deposit_rate: 300.0,
      deposit_amount: 300.0,
      replacement_value: 3499.0,
      total_stock: 8,
      available_stock: 6,
      condition_status: 'Pristine',
      description: 'Apple M3 Max chip with 16-core CPU and 40-core GPU, 32GB Unified Memory, 1TB Liquid Retina XDR display, ideal for 8K video editing, 3D rendering and software development.',
      features: JSON.stringify(['M3 Max 16-Core CPU / 40-Core GPU', '32GB Unified Memory', '16.2 Liquid Retina XDR 120Hz', 'HDMI 2.1 & 3x Thunderbolt 4']),
      accessories_included: JSON.stringify(['140W USB-C Power Adapter', 'MagSafe 3 Braided Cable', 'Hard-Shell Travel Sleeve']),
      attributes_json: JSON.stringify({ Processor: 'M3 Max 16-Core', RAM: '32GB Unified', Storage: '1TB SSD', Screen: '16.2" XDR 120Hz' }),
      serial_number: 'SN-APL-MBP16M3-9081'
    },
    {
      id: 2,
      name: 'Sony Alpha A7 IV Mirrorless 4K Camera + FE 24-70mm GM Lens',
      category_id: 'electronics',
      subcategory_id: 'electronics-cameras',
      brand: 'Sony',
      manufacturer: 'Sony Corporation (Tokyo, Japan)',
      color: 'Matte Black',
      size: 'Full-Frame Mirrorless',
      model: 'ILCE-7M4',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 15.0,
      daily_rate: 35.0,
      weekly_rate: 140.0,
      deposit_type: 'FIXED',
      deposit_rate: 250.0,
      deposit_amount: 250.0,
      replacement_value: 2899.0,
      total_stock: 6,
      available_stock: 4,
      condition_status: 'Pristine',
      description: '33MP Full-Frame Exmor R CMOS sensor, 4K 60p 10-bit 4:2:2 recording, Real-time Eye AF, 5-axis IBIS image stabilization, paired with Sony G Master 24-70mm f/2.8 GM II lens.',
      features: JSON.stringify(['33MP Full-Frame Sensor', '4K 60p 10-Bit Video', 'Real-Time Eye Autofocus', '5-Axis In-Body Stabilization']),
      accessories_included: JSON.stringify(['FE 24-70mm f/2.8 GM II Lens', '2x NP-FZ100 Batteries', 'Dual Battery Charger', '128GB V90 SD Card', 'Padded Camera Bag']),
      attributes_json: JSON.stringify({ Sensor: '33MP Full-Frame', Lens: 'FE 24-70mm f/2.8 GM II', Video: '4K 60p 10-Bit', Stabilization: '5-Axis IBIS' }),
      serial_number: 'SN-SNY-A7M4-4412'
    },
    {
      id: 3,
      name: 'LG 450L Double Door Smart Inverter Refrigerator',
      category_id: 'appliances',
      subcategory_id: 'appliances-fridges',
      brand: 'LG',
      manufacturer: 'LG Electronics (Seoul, South Korea)',
      color: 'Stainless Steel Silver',
      size: '450 Liters (Double Door)',
      model: 'GL-T432APZX',
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 8.0,
      daily_rate: 25.0,
      weekly_rate: 110.0,
      deposit_type: 'FIXED',
      deposit_rate: 150.0,
      deposit_amount: 150.0,
      replacement_value: 1250.0,
      total_stock: 5,
      available_stock: 3,
      condition_status: 'Pristine',
      description: 'Frost-free double door refrigerator with Smart Inverter Compressor, DoorCooling+ technology, Convertible 4-in-1 storage modes, and ultra-quiet energy efficient operation.',
      features: JSON.stringify(['450L Net Capacity', 'Smart Inverter Compressor', 'DoorCooling+ & Multi Air Flow', 'Convertible 4-in-1 Mode']),
      accessories_included: JSON.stringify(['Ice Maker Tray', 'Egg Tray Holder', 'User Guide & Power Cord']),
      attributes_json: JSON.stringify({ Capacity: '450 Liters', Energy: '5 Star Inverter', Type: 'Double Door Frost Free', Noise: '38 dB Silent' }),
      serial_number: 'SN-LGE-REF450L-7710'
    },
    {
      id: 4,
      name: 'Dyson V15 Detect Cordless Vacuum Cleaner',
      category_id: 'household',
      subcategory_id: 'household-cleaning',
      brand: 'Dyson',
      manufacturer: 'Dyson Ltd (Malmesbury, UK)',
      color: 'Nickel / Yellow',
      size: 'Cordless Handheld / Stick',
      model: 'V15 Detect Complete',
      image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 5.0,
      daily_rate: 15.0,
      weekly_rate: 60.0,
      deposit_type: 'FIXED',
      deposit_rate: 80.0,
      deposit_amount: 80.0,
      replacement_value: 749.0,
      total_stock: 10,
      available_stock: 8,
      condition_status: 'Pristine',
      description: 'Dyson Hyperdymium motor producing 230 AW suction power, laser illumination reveals invisible dust, piezo sensor measures dust particles in real time with LCD screen feedback.',
      features: JSON.stringify(['Laser Dust Illumination', '230 AW Suction Power', 'Piezo Sensor Dust Particle Counter', '60 Minute Swappable Battery']),
      accessories_included: JSON.stringify(['Digital Motorbar Cleaner Head', 'Fluffy Optic Cleaner Head', 'Hair Screw Tool', 'Crevice & Combination Tool', 'Wall Dock Station']),
      attributes_json: JSON.stringify({ Suction: '230 AW', Runtime: '60 Minutes', Filtration: 'HEPA Whole-Machine', Weight: '3.0 kg' }),
      serial_number: 'SN-DYS-V15DET-1029'
    },
    {
      id: 5,
      name: 'Herman Miller Aeron Ergonomic Office Desk Chair',
      category_id: 'furniture',
      subcategory_id: 'furniture-sofas',
      brand: 'Herman Miller',
      manufacturer: 'Herman Miller, Inc. (Zeeland, MI)',
      color: 'Graphite Black',
      size: 'Size B (Medium Standard)',
      model: 'Aeron Remastered Fully Loaded',
      image: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 6.0,
      daily_rate: 20.0,
      weekly_rate: 75.0,
      deposit_type: 'FIXED',
      deposit_rate: 120.0,
      deposit_amount: 120.0,
      replacement_value: 1495.0,
      total_stock: 12,
      available_stock: 9,
      condition_status: 'Pristine',
      description: 'Iconic ergonomic chair with 8Z Pellicle breathable mesh, PostureFit SL adjustable sacral and lumbar support, fully adjustable vinyl arms, and forward tilt mechanism for 12+ hour comfort.',
      features: JSON.stringify(['8Z Pellicle Breathable Mesh', 'PostureFit SL Dual Lumbar Support', 'Forward & Backward Tilt Limiter', 'Fully Adjustable 4D Armrests']),
      accessories_included: JSON.stringify(['Quiet Carpet Casters', 'Headrest Extension Bracket']),
      attributes_json: JSON.stringify({ Material: '8Z Pellicle Mesh', Size: 'Size B (Medium)', Adjustability: 'PostureFit SL & Forward Tilt', Warranty: 'Fleet QA Verified' }),
      serial_number: 'SN-HMI-AERON-3011'
    },
    {
      id: 6,
      name: 'Solid Teak Wood 6-Seater Dining Table & Chair Set',
      category_id: 'furniture',
      subcategory_id: 'furniture-tables',
      brand: 'TeakCraft',
      manufacturer: 'TeakCraft Artisan Workshop',
      color: 'Natural Honey Walnut',
      size: '6 Feet x 3.5 Feet',
      model: 'Royal Heritage 6-Seater',
      image: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 10.0,
      daily_rate: 30.0,
      weekly_rate: 120.0,
      deposit_type: 'FIXED',
      deposit_rate: 200.0,
      deposit_amount: 200.0,
      replacement_value: 1850.0,
      total_stock: 4,
      available_stock: 2,
      condition_status: 'Pristine',
      description: 'Hand-carved 100% solid grade-A teak wood dining table with 6 cushioned ergonomic dining chairs finished in water-resistant matte varnish for indoor and semi-outdoor gatherings.',
      features: JSON.stringify(['100% Solid Teak Wood Frame', 'Stain & Heat Resistant Varnish', '6 Ergonomic Cushioned Chairs', 'Scratch Resistant Base Pads']),
      accessories_included: JSON.stringify(['6 Fabric Chair Cushions', 'Teak Wood Care Oil']),
      attributes_json: JSON.stringify({ Material: 'Grade-A Solid Teak', Seating: '6 Persons', Dimensions: '72" L x 42" W x 30" H', Weight: '85 kg' }),
      serial_number: 'SN-TKC-TAB6S-8821'
    },
    {
      id: 7,
      name: 'Bosch Professional 18V Cordless Drill & Impact Driver Tool Kit',
      category_id: 'household',
      subcategory_id: 'household-tools',
      brand: 'Bosch',
      manufacturer: 'Bosch Power Tools (Leinfelden, Germany)',
      color: 'Bosch Blue / Black',
      size: '18V Heavy Duty Kit',
      model: 'GSB 18V-55 + GDR 18V-200',
      image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 4.0,
      daily_rate: 12.0,
      weekly_rate: 45.0,
      deposit_type: 'FIXED',
      deposit_rate: 60.0,
      deposit_amount: 60.0,
      replacement_value: 450.0,
      total_stock: 15,
      available_stock: 12,
      condition_status: 'Pristine',
      description: 'Brushless 18V combi drill with 55 Nm torque + 200 Nm impact driver, 2x 4.0Ah ProCORE batteries, 35-piece screwdriver bit set, wood/metal drill bits, and L-BOXX carrying case.',
      features: JSON.stringify(['Brushless Motor Technology', '55 Nm Combi Drill + 200 Nm Impact Driver', '2x 4.0Ah ProCORE18V Batteries', 'Heavy Duty All-Metal Chuck']),
      accessories_included: JSON.stringify(['2x 4.0Ah Batteries', 'GAL 18V-40 Fast Charger', '35-Piece Bit Set', 'L-BOXX Carrying Case']),
      attributes_json: JSON.stringify({ Voltage: '18V Lithium-Ion', Torque: '55 Nm Drill / 200 Nm Impact', Batteries: '2x 4.0Ah Included', Motor: 'Brushless EC' }),
      serial_number: 'SN-BSH-18VKIT-5510'
    },
    {
      id: 8,
      name: 'JBL PartyBox 310 Portable Wireless Speaker & Mic System',
      category_id: 'events',
      subcategory_id: 'events-audio',
      brand: 'JBL',
      manufacturer: 'Harman International (Stamford, CT)',
      color: 'Party Black',
      size: '240W High Power Unit',
      model: 'JBL PartyBox 310',
      image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 9.0,
      daily_rate: 28.0,
      weekly_rate: 110.0,
      deposit_type: 'FIXED',
      deposit_rate: 120.0,
      deposit_amount: 120.0,
      replacement_value: 799.0,
      total_stock: 8,
      available_stock: 5,
      condition_status: 'Pristine',
      description: '240W RMS output sound with JBL Pro Sound, dynamic sync light show, built-in smooth-glide wheels and telescopic handle, IPX4 splashproof rating, 18-hour battery life and dual wireless mics.',
      features: JSON.stringify(['240W RMS JBL Pro Sound', 'Dynamic RGB Beat Light Show', '18-Hour Battery & Wheels/Telescopic Handle', 'Dual Mic & Guitar Inputs']),
      accessories_included: JSON.stringify(['2x JBL Wireless Microphones', 'AC Power Cord', 'AUX 3.5mm Cable', 'Protection Cover']),
      attributes_json: JSON.stringify({ Power: '240W RMS', Battery: '18 Hours', Waterproof: 'IPX4 Splashproof', Connectivity: 'Bluetooth 5.1 & AUX' }),
      serial_number: 'SN-JBL-PB310-9901'
    },
    {
      id: 9,
      name: 'Segway Ninebot Max G30P Electric Scooter (65km Range)',
      category_id: 'vehicles',
      subcategory_id: 'vehicles-bikes',
      brand: 'Segway',
      manufacturer: 'Segway-Ninebot (Bedford, NH)',
      color: 'Dark Grey',
      size: 'Adult Commuter EV',
      model: 'Ninebot KickScooter MAX G30P',
      image: 'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 8.0,
      daily_rate: 22.0,
      weekly_rate: 85.0,
      deposit_type: 'FIXED',
      deposit_rate: 100.0,
      deposit_amount: 100.0,
      replacement_value: 899.0,
      total_stock: 8,
      available_stock: 6,
      condition_status: 'Pristine',
      description: '350W motor with 700W peak power, 30 km/h top speed, 65 km max travel range on single charge, 10-inch self-healing pneumatic tires, built-in fast charger and dual braking system.',
      features: JSON.stringify(['30 km/h Top Speed & 65 km Range', '10" Self-Healing Pneumatic Tires', 'Dual Regenerative Braking System', 'Built-in 3A Internal Fast Charger']),
      accessories_included: JSON.stringify(['Safety Helmet', 'Heavy Duty Cable Lock', 'AC Power Charging Cord', 'Phone Mount']),
      attributes_json: JSON.stringify({ Speed: '30 km/h', Range: '65 km', Motor: '350W Nominal / 700W Peak', Tires: '10" Pneumatic' }),
      serial_number: 'SN-SGW-G30P-1182'
    },
    {
      id: 10,
      name: 'Tesla Model 3 Long Range EV Sedan',
      category_id: 'vehicles',
      subcategory_id: 'vehicles-cars',
      brand: 'Tesla',
      manufacturer: 'Tesla, Inc. (Fremont, CA)',
      color: 'Pearl White Multi-Coat',
      size: '5-Passenger Electric Sedan',
      model: 'Model 3 Long Range Dual Motor',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&auto=format&fit=crop&q=80',
      hourly_rate: 25.0,
      daily_rate: 85.0,
      weekly_rate: 390.0,
      deposit_type: 'FIXED',
      deposit_rate: 500.0,
      deposit_amount: 500.0,
      replacement_value: 47000.0,
      total_stock: 3,
      available_stock: 2,
      condition_status: 'Pristine',
      description: 'Dual Motor All-Wheel Drive, 576 km EPA estimated range, 0-100 km/h in 4.2 seconds, 15-inch touchscreen with Premium Audio and Autopilot included.',
      features: JSON.stringify(['Dual Motor AWD', '576 km Range', 'Autopilot Included', '15-inch Touchscreen with Netflix & Spotify']),
      accessories_included: JSON.stringify(['Tesla Key Card', 'Mobile Charging Cable Kit', 'J1772 Charger Adapter']),
      attributes_json: JSON.stringify({ Range: '576 km', Acceleration: '4.2s (0-100)', Drive: 'Dual Motor AWD', Seating: '5 Passengers' }),
      serial_number: 'VIN-5YJ3E1EA5MF-7710'
    }
  ];

  marketplaceProducts.forEach(p => {
    insertProduct.run(
      p.id, p.name, p.category_id, p.subcategory_id, p.brand, p.manufacturer, p.color, p.size, p.model, p.image,
      p.hourly_rate, p.daily_rate, p.weekly_rate, p.deposit_type, p.deposit_rate, p.deposit_amount, p.replacement_value,
      p.total_stock, p.available_stock, p.condition_status, p.description, p.features, p.accessories_included, p.attributes_json, p.serial_number
    );
  });




  // Seed Product Variants
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (
      product_id, sku, variant_name, brand, manufacturer, color, color_hex, size, trim_package,
      daily_rate_override, deposit_amount_override, stock_count, available_stock, image_override, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seed Multi-Category Product Variants
  insertVariant.run(1, 'VAR-MBP16-BLK', 'Space Black Edition', 'Apple', 'Apple Inc.', 'Space Black', '#1e293b', '16.2-inch Display', 'M3 Max 16-Core / 32GB RAM / 1TB SSD', 45.0, 300.0, 5, 4, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200', 1);
  insertVariant.run(1, 'VAR-MBP16-SLV', 'Silver Edition', 'Apple', 'Apple Inc.', 'Silver', '#e2e8f0', '16.2-inch Display', 'M3 Max 16-Core / 32GB RAM / 1TB SSD', 45.0, 300.0, 3, 2, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200', 0);

  insertVariant.run(2, 'VAR-A7M4-STD', 'Standard Kit (24-70mm GM II)', 'Sony', 'Sony Corporation', 'Matte Black', '#0f172a', 'Full-Frame', 'Sony FE 24-70mm f/2.8 GM II Lens', 35.0, 250.0, 4, 3, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200', 1);
  insertVariant.run(2, 'VAR-A7M4-RIG', 'Cinema Video Rig Pack', 'Sony', 'Sony Corporation', 'Matte Black', '#0f172a', 'Full-Frame', 'Rig Cage, Follow Focus & Monitor', 48.0, 320.0, 2, 1, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200', 0);

  insertVariant.run(5, 'VAR-AERON-BLK', 'Aeron Size B (Graphite)', 'Herman Miller', 'Herman Miller Inc.', 'Graphite Black', '#1e293b', 'Size B Medium', 'PostureFit SL & Forward Tilt', 20.0, 120.0, 8, 6, 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=1200', 1);
  insertVariant.run(5, 'VAR-AERON-SLV', 'Aeron Size B (Mineral Satin)', 'Herman Miller', 'Herman Miller Inc.', 'Mineral Satin Silver', '#cbd5e1', 'Size B Medium', 'PostureFit SL & Satin Frame', 22.0, 130.0, 4, 3, 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=1200', 0);

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
