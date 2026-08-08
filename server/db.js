// db.js - SQLite Database initialization with Auth credentials using Node 22 native SQLite
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { generateSalt, hashPassword } = require('./services/authService');

const dbPath = path.join(__dirname, 'leaseify.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode
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
      grace_period_hours INTEGER NOT NULL DEFAULT 4,
      late_fee_daily_multiplier REAL NOT NULL DEFAULT 1.5,
      deposit_percentage_default REAL NOT NULL DEFAULT 20.0,
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
      model TEXT,
      image TEXT NOT NULL,
      daily_rate REAL NOT NULL,
      weekly_rate REAL NOT NULL,
      deposit_amount REAL NOT NULL,
      replacement_value REAL NOT NULL,
      total_stock INTEGER NOT NULL DEFAULT 1,
      available_stock INTEGER NOT NULL DEFAULT 1,
      condition_status TEXT NOT NULL DEFAULT 'Pristine',
      description TEXT NOT NULL,
      features TEXT, -- JSON string
      accessories_included TEXT, -- JSON string
      serial_number TEXT,
      top_speed TEXT,
      acceleration TEXT,
      horsepower TEXT,
      fuel_type TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_code TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      actual_return_date TEXT,
      duration_days INTEGER NOT NULL,
      daily_rate REAL NOT NULL,
      base_rental_fee REAL NOT NULL,
      deposit_amount REAL NOT NULL,
      deposit_status TEXT NOT NULL DEFAULT 'HELD', -- HELD, REFUNDED, PARTIALLY_REFUNDED, FORFEITED
      damage_fee REAL NOT NULL DEFAULT 0,
      late_penalty_fee REAL NOT NULL DEFAULT 0,
      late_days_count INTEGER NOT NULL DEFAULT 0,
      deposit_refunded_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
      pickup_notes TEXT,
      return_notes TEXT,
      customer_notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
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

function seedDatabase(force = false) {
  if (force) {
    db.exec(`
      DELETE FROM activity_logs;
      DELETE FROM inspection_logs;
      DELETE FROM rentals;
      DELETE FROM products;
      DELETE FROM categories;
      DELETE FROM users;
      DELETE FROM system_config;
    `);
  } else {
    const existingConfig = db.prepare('SELECT COUNT(*) as count FROM system_config').get();
    if (existingConfig && existingConfig.count > 0) {
      return;
    }
  }

  // Insert default config
  db.prepare(`
    INSERT INTO system_config (
      id, company_name, currency_symbol, grace_period_hours,
      late_fee_daily_multiplier, deposit_percentage_default, min_rental_days,
      max_rental_days, pickup_location, contact_email, simulated_days_offset
    ) VALUES (1, 'Leaseify Premier Fleet', '$', 4, 1.5, 20.0, 1, 30, 'Leaseify Executive Lounge, 850 Sunset Blvd, West Hollywood', 'concierge@leaseify.io', 0)
  `).run();

  // Insert Predefined Secure Users with Password Hashes
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, salt, role, avatar, address, phone, membership_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Predefined Admin: admin@leaseify.io / admin123
  const adminSalt = generateSalt();
  const adminHash = hashPassword('admin123', adminSalt);
  insertUser.run(
    1,
    'Sarah Connor',
    'admin@leaseify.io',
    adminHash,
    adminSalt,
    'admin',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'Leaseify HQ, 850 Sunset Blvd, West Hollywood, CA',
    '+1 (555) 234-5678',
    'Executive Fleet Director'
  );

  // Predefined Customer: alex.rivera@example.com / user123
  const alexSalt = generateSalt();
  const alexHash = hashPassword('user123', alexSalt);
  insertUser.run(
    2,
    'Alex Rivera',
    'alex.rivera@example.com',
    alexHash,
    alexSalt,
    'customer',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    '452 Ocean Drive, Apt 14B, Santa Monica, CA',
    '+1 (555) 876-5432',
    'Black Card Elite'
  );

  // Customer 2: marcus.v@example.com / user123
  const marcusSalt = generateSalt();
  const marcusHash = hashPassword('user123', marcusSalt);
  insertUser.run(
    3,
    'Marcus Vance',
    'marcus.v@example.com',
    marcusHash,
    marcusSalt,
    'customer',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    '788 Beverly Glen Blvd, Los Angeles, CA',
    '+1 (555) 345-6789',
    'Platinum Driver'
  );

  // Customer 3: elena.r@example.com / user123
  const elenaSalt = generateSalt();
  const elenaHash = hashPassword('user123', elenaSalt);
  insertUser.run(
    4,
    'Elena Rostova',
    'elena.r@example.com',
    elenaHash,
    elenaSalt,
    'customer',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    '120 Wilshire Blvd, Suite 800, Los Angeles, CA',
    '+1 (555) 987-6543',
    'Gold Member'
  );

  // Insert Categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, icon, description)
    VALUES (?, ?, ?, ?)
  `);

  insertCategory.run('supercars', 'Supercars & Exotics', 'gauge', 'V10 & V8 mid-engine hypercars and aerodynamic track weapons');
  insertCategory.run('electric', 'Electric Performance', 'zap', 'Instant-torque electric hyper-GTs and luxury cruisers');
  insertCategory.run('luxury-suv', 'Luxury & Armored SUVs', 'shield', 'High-riding executive off-roaders with ultimate comfort and road presence');
  insertCategory.run('grand-touring', 'Grand Tourers & Coupes', 'compass', 'High-speed long-distance luxury coupes with bespoke leather interiors');
  insertCategory.run('executive', 'Executive Luxury Sedans', 'briefcase', 'Chauffeur-grade flagships engineered for effortless quiet cruising');

  // Insert Products
  const insertProduct = db.prepare(`
    INSERT INTO products (
      name, category_id, brand, model, image, daily_rate, weekly_rate,
      deposit_amount, replacement_value, total_stock, available_stock,
      condition_status, description, features, accessories_included, serial_number,
      top_speed, acceleration, horsepower, fuel_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const carsData = [
    {
      name: 'Porsche 911 GT3 RS (992)',
      category: 'supercars',
      brand: 'Porsche',
      model: '911 GT3 RS',
      image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 650.0,
      weekly_rate: 3400.0,
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
      name: 'Audi RS e-tron GT Carbon Black Edition',
      category: 'electric',
      brand: 'Audi',
      model: 'RS e-tron GT',
      image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 420.0,
      weekly_rate: 2200.0,
      deposit_amount: 1000.0,
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
      name: 'Mercedes-AMG G63 Night Edition',
      category: 'luxury-suv',
      brand: 'Mercedes-Benz',
      model: 'AMG G63',
      image: 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 580.0,
      weekly_rate: 2950.0,
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
      name: 'Ferrari F8 Tributo Spider',
      category: 'supercars',
      brand: 'Ferrari',
      model: 'F8 Tributo',
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 890.0,
      weekly_rate: 4600.0,
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
      name: 'BMW M8 Competition Gran Coupé',
      category: 'grand-touring',
      brand: 'BMW',
      model: 'M8 Competition',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 390.0,
      weekly_rate: 1980.0,
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
      name: 'Tesla Model S Plaid (Tri-Motor)',
      category: 'electric',
      brand: 'Tesla',
      model: 'Model S Plaid',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 350.0,
      weekly_rate: 1800.0,
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
      name: 'Rolls-Royce Ghost Extended Series II',
      category: 'executive',
      brand: 'Rolls-Royce',
      model: 'Ghost Extended',
      image: 'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 980.0,
      weekly_rate: 5100.0,
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
      name: 'Range Rover SV Autobiography V8',
      category: 'luxury-suv',
      brand: 'Land Rover',
      model: 'Range Rover SV',
      image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&auto=format&fit=crop&q=80',
      daily_rate: 490.0,
      weekly_rate: 2500.0,
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
      p.name, p.category, p.brand, p.model, p.image,
      p.daily_rate, p.weekly_rate, p.deposit_amount, p.replacement_val,
      p.total_stock, p.available_stock, p.condition, p.desc,
      p.features, p.accessories, p.serial,
      p.top_speed, p.acceleration, p.horsepower, p.fuel_type
    );
  }

  // Pre-seed realistic active, overdue, returned rentals
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const pastDate = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return fmt(d);
  };
  const futureDate = (daysAhead) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return fmt(d);
  };

  const insertRental = db.prepare(`
    INSERT INTO rentals (
      rental_code, user_id, product_id, start_date, end_date, actual_return_date,
      duration_days, daily_rate, base_rental_fee, deposit_amount, deposit_status,
      damage_fee, late_penalty_fee, late_days_count, deposit_refunded_amount, status,
      pickup_notes, return_notes, customer_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRental.run(
    'RNT-9110', 2, 1, pastDate(2), futureDate(3), null,
    5, 650.0, 3250.0, 1500.0, 'HELD',
    0, 0, 0, 0, 'ACTIVE',
    'Customer completed identity verification. Track telemetry key released in pristine condition.',
    null, 'Weekend drive on Pacific Coast Highway.', pastDate(2) + ' 10:30:00'
  );

  insertRental.run(
    'RNT-7419', 3, 4, pastDate(6), pastDate(2), null,
    4, 890.0, 3560.0, 2200.0, 'HELD',
    0, 2670.0, 2, 0, 'OVERDUE',
    'Released with full ceramic protection inspection certificate.',
    null, 'VIP film premiere and charity gala.', pastDate(6) + ' 09:15:00'
  );

  insertRental.run(
    'RNT-8832', 4, 2, futureDate(1), futureDate(4), null,
    3, 420.0, 1260.0, 1000.0, 'HELD',
    0, 0, 0, 0, 'PENDING_APPROVAL',
    null, null, 'Executive airport pickup and business conference tour.', pastDate(0) + ' 08:45:00'
  );

  insertRental.run(
    'RNT-6204', 2, 3, futureDate(0), futureDate(3), null,
    3, 580.0, 1740.0, 1400.0, 'HELD',
    0, 0, 0, 0, 'READY_FOR_PICKUP',
    'Vehicle fully detailed, tank topped with 98 Octane, parked in Executive Bay 02.',
    null, 'Mountain resort weekend trip.', pastDate(1) + ' 14:20:00'
  );

  insertRental.run(
    'RNT-4155', 4, 5, pastDate(4), pastDate(0), pastDate(0),
    4, 390.0, 1560.0, 900.0, 'HELD',
    0, 0, 0, 0, 'RETURN_SUBMITTED',
    'Vehicle returned to intake bay. Awaiting wheel rim and paintwork diagnostic inspection.',
    'Customer reported minor surface curb rash on rear right alloy.', 'Coastal weekend tour.', pastDate(4) + ' 11:00:00'
  );

  insertRental.run(
    'RNT-3011', 3, 7, pastDate(10), pastDate(7), pastDate(7),
    3, 980.0, 2940.0, 2500.0, 'REFUNDED',
    0, 0, 0, 2500.0, 'INSPECTED_COMPLETED',
    'Handover inspection passed with zero imperfections.',
    'Return inspection flawless. Full escrow deposit of $2,500 refunded to customer card.', 'Wedding celebration ceremony escort.', pastDate(10) + ' 16:00:00'
  );

  const insertActivity = db.prepare(`
    INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertActivity.run(2, 'System Engine', 'system', 'PENALTY_ACCRUED', 'Automated late penalty triggered for Ferrari F8 Tributo (RNT-7419): +$2,670.00 for 2 overdue days.', pastDate(0) + ' 00:05:00');
  insertActivity.run(1, 'Sarah Connor', 'admin', 'PICKUP_AUTHORIZED', 'Vehicle Porsche 911 GT3 RS handed over to Alex Rivera with deposit lock verified in escrow.', pastDate(2) + ' 10:35:00');
  insertActivity.run(6, 'Sarah Connor', 'admin', 'DEPOSIT_REFUNDED', 'Full deposit of $2,500.00 returned to Marcus Vance after clean vehicle diagnostic.', pastDate(7) + ' 18:20:00');
}

module.exports = {
  db,
  initSchema,
  seedDatabase
};
