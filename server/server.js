// server.js - Native Node HTTP server & REST API with JWT Auth for Leaseify
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { db, initSchema, seedDatabase } = require('./db');
const { evaluateRentals, calculateInspectionSettlement } = require('./services/penaltyEngine');
const { generateSalt, hashPassword, verifyPassword, generateJWT, verifyJWT } = require('./services/authService');

// Initialize database schema and data
initSchema();
seedDatabase();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function getAuthenticatedUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyJWT(token);
  if (!payload || !payload.id) return null;

  const user = db.prepare('SELECT id, name, email, role, avatar, address, phone, membership_tier, created_at FROM users WHERE id = ?').get(payload.id);
  return user || null;
}

function handleStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(filePath, (err2, content) => {
        if (err2) {
          res.writeHead(404);
          return res.end('Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err2, content) => {
      if (err2) {
        res.writeHead(500);
        return res.end('Server Error reading static file');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  try {
    evaluateRentals();
  } catch (err) {
    console.error('Penalty evaluation error:', err);
  }

  try {
    // ==========================================
    // AUTHENTICATION & PROFILE APIS
    // ==========================================

    // User Signup (Strictly enforces role = 'customer')
    if (pathname === '/api/auth/signup' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { name, email, password, address, avatar, phone } = body;

      if (!name || !email || !password) {
        return sendJson(res, 400, { error: 'Name, email, and password are required.' });
      }

      const emailTrim = email.trim().toLowerCase();

      // Check for duplicate email
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailTrim);
      if (existing) {
        return sendJson(res, 400, { error: 'An account with this email address already exists.' });
      }

      // Security check: Never allow signing up as admin
      const role = 'customer';
      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);
      const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

      const insertStmt = db.prepare(`
        INSERT INTO users (name, email, password_hash, salt, role, avatar, address, phone, membership_tier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Standard Driver')
      `);

      const result = insertStmt.run(name.trim(), emailTrim, passwordHash, salt, role, defaultAvatar, address || 'Los Angeles, CA', phone || '+1 (555) 000-0000');
      const newUser = db.prepare('SELECT id, name, email, role, avatar, address, phone, membership_tier, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

      const token = generateJWT({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name });

      return sendJson(res, 201, {
        message: 'Account created successfully! Welcome to Leaseify.',
        token,
        user: newUser
      });
    }

    // User Login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required.' });
      }

      const emailTrim = email.trim().toLowerCase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailTrim);

      if (!user || !user.password_hash || !user.salt) {
        return sendJson(res, 401, { error: 'Invalid email or password.' });
      }

      const isValid = verifyPassword(password, user.salt, user.password_hash);
      if (!isValid) {
        return sendJson(res, 401, { error: 'Invalid email or password.' });
      }

      const token = generateJWT({ id: user.id, email: user.email, role: user.role, name: user.name });

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        address: user.address,
        phone: user.phone,
        membership_tier: user.membership_tier,
        created_at: user.created_at
      };

      return sendJson(res, 200, {
        message: `Welcome back, ${user.name}!`,
        token,
        user: safeUser
      });
    }

    // Get Current Authenticated User Profile
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return sendJson(res, 401, { error: 'Unauthorized. Invalid or expired token.' });
      }
      return sendJson(res, 200, user);
    }

    // Update Profile
    if (pathname === '/api/auth/profile' && req.method === 'PUT') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return sendJson(res, 401, { error: 'Unauthorized.' });
      }

      const body = await parseJsonBody(req);
      const { name, address, avatar, phone } = body;

      db.prepare(`
        UPDATE users SET
          name = COALESCE(?, name),
          address = COALESCE(?, address),
          avatar = COALESCE(?, avatar),
          phone = COALESCE(?, phone)
        WHERE id = ?
      `).run(name ?? null, address ?? null, avatar ?? null, phone ?? null, user.id);

      const updated = db.prepare('SELECT id, name, email, role, avatar, address, phone, membership_tier, created_at FROM users WHERE id = ?').get(user.id);
      return sendJson(res, 200, { message: 'Profile updated successfully', user: updated });
    }

    // Health Check
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { status: 'healthy', app: 'Leaseify Premier Fleet', timestamp: new Date().toISOString() });
    }

    // System Config
    if (pathname === '/api/config' && req.method === 'GET') {
      const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get();
      return sendJson(res, 200, config);
    }

    if (pathname === '/api/config' && req.method === 'PUT') {
      const body = await parseJsonBody(req);
      const updateStmt = db.prepare(`
        UPDATE system_config SET
          company_name = COALESCE(?, company_name),
          currency_symbol = COALESCE(?, currency_symbol),
          grace_period_hours = COALESCE(?, grace_period_hours),
          late_fee_daily_multiplier = COALESCE(?, late_fee_daily_multiplier),
          deposit_percentage_default = COALESCE(?, deposit_percentage_default),
          min_rental_days = COALESCE(?, min_rental_days),
          max_rental_days = COALESCE(?, max_rental_days),
          pickup_location = COALESCE(?, pickup_location),
          contact_email = COALESCE(?, contact_email),
          simulated_days_offset = COALESCE(?, simulated_days_offset),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `);

      updateStmt.run(
        body.company_name,
        body.currency_symbol,
        body.grace_period_hours !== undefined ? Number(body.grace_period_hours) : null,
        body.late_fee_daily_multiplier !== undefined ? Number(body.late_fee_daily_multiplier) : null,
        body.deposit_percentage_default !== undefined ? Number(body.deposit_percentage_default) : null,
        body.min_rental_days !== undefined ? Number(body.min_rental_days) : null,
        body.max_rental_days !== undefined ? Number(body.max_rental_days) : null,
        body.pickup_location,
        body.contact_email,
        body.simulated_days_offset !== undefined ? Number(body.simulated_days_offset) : null
      );

      evaluateRentals();
      const updated = db.prepare('SELECT * FROM system_config WHERE id = 1').get();
      return sendJson(res, 200, { message: 'Config updated successfully', config: updated });
    }

    // Time Machine Simulation Tool
    if (pathname === '/api/config/simulate-time' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const daysOffset = Number(body.days_offset || 0);
      db.prepare('UPDATE system_config SET simulated_days_offset = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(daysOffset);
      const evalResult = evaluateRentals();
      const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get();
      return sendJson(res, 200, {
        message: `System simulated time adjusted by +${daysOffset} day(s).`,
        days_offset: daysOffset,
        simulated_now: evalResult.simulatedNow,
        updated_rentals_count: evalResult.updated,
        config
      });
    }

    // Users List
    if (pathname === '/api/users' && req.method === 'GET') {
      const users = db.prepare('SELECT id, name, email, role, avatar, address, phone, membership_tier, created_at FROM users').all();
      return sendJson(res, 200, users);
    }

    // Categories
    if (pathname === '/api/categories' && req.method === 'GET') {
      const categories = db.prepare(`
        SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count
        FROM categories c
      `).all();
      return sendJson(res, 200, categories);
    }

    // Products List
    if (pathname === '/api/products' && req.method === 'GET') {
      const category = searchParams.get('category');
      const search = searchParams.get('search');
      const minPrice = searchParams.get('min_price');
      const maxPrice = searchParams.get('max_price');

      let query = `
        SELECT p.*, c.name as category_name, c.icon as category_icon
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (category && category !== 'all') {
        query += ` AND p.category_id = ?`;
        params.push(category);
      }

      if (search) {
        query += ` AND (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      if (minPrice) {
        query += ` AND p.daily_rate >= ?`;
        params.push(Number(minPrice));
      }

      if (maxPrice) {
        query += ` AND p.daily_rate <= ?`;
        params.push(Number(maxPrice));
      }

      query += ` ORDER BY p.id ASC`;

      const products = db.prepare(query).all(...params);
      const parsedProducts = products.map(p => ({
        ...p,
        features: p.features ? JSON.parse(p.features) : [],
        accessories_included: p.accessories_included ? JSON.parse(p.accessories_included) : []
      }));

      return sendJson(res, 200, parsedProducts);
    }

    // Product Detail
    if (pathname.startsWith('/api/products/') && req.method === 'GET') {
      const id = pathname.split('/')[3];
      const product = db.prepare(`
        SELECT p.*, c.name as category_name, c.icon as category_icon
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `).get(id);

      if (!product) {
        return sendJson(res, 404, { error: 'Product not found' });
      }

      return sendJson(res, 200, {
        ...product,
        features: product.features ? JSON.parse(product.features) : [],
        accessories_included: product.accessories_included ? JSON.parse(product.accessories_included) : []
      });
    }

    // Product Create
    if (pathname === '/api/products' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name || !body.category_id || !body.daily_rate) {
        return sendJson(res, 400, { error: 'Missing required product fields' });
      }

      const stmt = db.prepare(`
        INSERT INTO products (
          name, category_id, brand, model, image, daily_rate, weekly_rate,
          deposit_amount, replacement_value, total_stock, available_stock,
          condition_status, description, features, accessories_included, serial_number,
          top_speed, acceleration, horsepower, fuel_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const featuresJson = JSON.stringify(Array.isArray(body.features) ? body.features : []);
      const accessoriesJson = JSON.stringify(Array.isArray(body.accessories_included) ? body.accessories_included : []);

      const result = stmt.run(
        body.name,
        body.category_id,
        body.brand || 'Leaseify Premier',
        body.model || 'Standard',
        body.image || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200',
        Number(body.daily_rate),
        Number(body.weekly_rate || (body.daily_rate * 5)),
        Number(body.deposit_amount || (body.daily_rate * 2)),
        Number(body.replacement_value || (body.daily_rate * 300)),
        Number(body.total_stock || 1),
        Number(body.total_stock || 1),
        body.condition_status || 'Pristine',
        body.description || 'High performance luxury rental vehicle.',
        featuresJson,
        accessoriesJson,
        body.serial_number || `VIN-LSE-${Math.floor(1000 + Math.random() * 9000)}`,
        body.top_speed || '300 km/h',
        body.acceleration || '3.2s',
        body.horsepower || '500 HP',
        body.fuel_type || 'Premium 98'
      );

      const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
      return sendJson(res, 201, created);
    }

    // Product Update
    if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseJsonBody(req);

      const stmt = db.prepare(`
        UPDATE products SET
          name = COALESCE(?, name),
          category_id = COALESCE(?, category_id),
          brand = COALESCE(?, brand),
          model = COALESCE(?, model),
          image = COALESCE(?, image),
          daily_rate = COALESCE(?, daily_rate),
          weekly_rate = COALESCE(?, weekly_rate),
          deposit_amount = COALESCE(?, deposit_amount),
          replacement_value = COALESCE(?, replacement_value),
          total_stock = COALESCE(?, total_stock),
          available_stock = COALESCE(?, available_stock),
          condition_status = COALESCE(?, condition_status),
          description = COALESCE(?, description),
          serial_number = COALESCE(?, serial_number)
        WHERE id = ?
      `);

      stmt.run(
        body.name, body.category_id, body.brand, body.model, body.image,
        body.daily_rate !== undefined ? Number(body.daily_rate) : null,
        body.weekly_rate !== undefined ? Number(body.weekly_rate) : null,
        body.deposit_amount !== undefined ? Number(body.deposit_amount) : null,
        body.replacement_value !== undefined ? Number(body.replacement_value) : null,
        body.total_stock !== undefined ? Number(body.total_stock) : null,
        body.available_stock !== undefined ? Number(body.available_stock) : null,
        body.condition_status, body.description, body.serial_number,
        id
      );

      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      return sendJson(res, 200, updated);
    }

    // Rentals List
    if (pathname === '/api/rentals' && req.method === 'GET') {
      const status = searchParams.get('status');
      const userId = searchParams.get('user_id');
      const search = searchParams.get('search');

      let query = `
        SELECT r.*,
               p.name as product_name, p.image as product_image, p.brand as product_brand, p.serial_number as product_serial,
               u.name as user_name, u.email as user_email, u.phone as user_phone, u.avatar as user_avatar
        FROM rentals r
        JOIN products p ON r.product_id = p.id
        JOIN users u ON r.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'ALL') {
        query += ` AND r.status = ?`;
        params.push(status);
      }

      if (userId) {
        query += ` AND r.user_id = ?`;
        params.push(Number(userId));
      }

      if (search) {
        query += ` AND (r.rental_code LIKE ? OR p.name LIKE ? OR u.name LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      query += ` ORDER BY r.id DESC`;

      const rentals = db.prepare(query).all(...params);
      return sendJson(res, 200, rentals);
    }

    // Rental Detail
    if (pathname.startsWith('/api/rentals/') && req.method === 'GET' && !pathname.endsWith('/status')) {
      const id = pathname.split('/')[3];
      const rental = db.prepare(`
        SELECT r.*,
               p.name as product_name, p.image as product_image, p.brand as product_brand, p.serial_number as product_serial, p.replacement_value,
               u.name as user_name, u.email as user_email, u.phone as user_phone, u.avatar as user_avatar, u.membership_tier
        FROM rentals r
        JOIN products p ON r.product_id = p.id
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ? OR r.rental_code = ?
      `).get(id, id);

      if (!rental) {
        return sendJson(res, 404, { error: 'Rental not found' });
      }

      const logs = db.prepare('SELECT * FROM activity_logs WHERE rental_id = ? ORDER BY timestamp DESC').all(rental.id);
      const inspections = db.prepare('SELECT * FROM inspection_logs WHERE rental_id = ? ORDER BY timestamp DESC').all(rental.id);

      return sendJson(res, 200, {
        ...rental,
        activity_logs: logs,
        inspection_logs: inspections.map(i => ({ ...i, checklist: JSON.parse(i.checklist_json || '[]') }))
      });
    }

    // Create New Rental
    if (pathname === '/api/rentals' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { user_id, product_id, start_date, end_date, customer_notes } = body;

      if (!user_id || !product_id || !start_date || !end_date) {
        return sendJson(res, 400, { error: 'Missing required rental parameters' });
      }

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
      if (!product) {
        return sendJson(res, 404, { error: 'Vehicle not found' });
      }

      if (product.available_stock <= 0) {
        return sendJson(res, 400, { error: 'Vehicle is currently reserved for the selected dates.' });
      }

      const s = new Date(start_date);
      const e = new Date(end_date);
      const diffTime = e.getTime() - s.getTime();
      const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      let baseFee = 0;
      if (durationDays >= 7 && product.weekly_rate > 0) {
        const weeks = Math.floor(durationDays / 7);
        const remDays = durationDays % 7;
        baseFee = (weeks * product.weekly_rate) + (remDays * product.daily_rate);
      } else {
        baseFee = durationDays * product.daily_rate;
      }

      const depositAmount = product.deposit_amount;
      const rentalCode = `RNT-${Math.floor(1000 + Math.random() * 9000)}`;

      const insertRental = db.prepare(`
        INSERT INTO rentals (
          rental_code, user_id, product_id, start_date, end_date, duration_days,
          daily_rate, base_rental_fee, deposit_amount, deposit_status, status, customer_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'HELD', 'PENDING_APPROVAL', ?)
      `);

      const result = insertRental.run(
        rentalCode, user_id, product_id, start_date, end_date,
        durationDays, product.daily_rate, baseFee, depositAmount, customer_notes || ''
      );

      db.prepare('UPDATE products SET available_stock = MAX(0, available_stock - 1) WHERE id = ?').run(product_id);

      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(user_id);
      db.prepare(`
        INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description)
        VALUES (?, ?, 'customer', 'RENTAL_CREATED', ?)
      `).run(result.lastInsertRowid, user ? user.name : 'Driver', `Vehicle booking reserved for ${durationDays} day(s). Escrow deposit of $${depositAmount.toFixed(2)} secured.`);

      const created = db.prepare('SELECT * FROM rentals WHERE id = ?').get(result.lastInsertRowid);
      return sendJson(res, 201, created);
    }

    // Status Transition Workflow
    if (pathname.match(/^\/api\/rentals\/\d+\/status$/) && req.method === 'POST') {
      const id = pathname.split('/')[3];
      const body = await parseJsonBody(req);
      const { status, actor_name, actor_role, notes } = body;

      const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
      if (!rental) {
        return sendJson(res, 404, { error: 'Rental not found' });
      }

      let extraUpdate = '';
      if (status === 'READY_FOR_PICKUP') {
        extraUpdate = `, pickup_notes = COALESCE(?, pickup_notes)`;
      } else if (status === 'RETURN_SUBMITTED') {
        extraUpdate = `, actual_return_date = CURRENT_DATE, return_notes = COALESCE(?, return_notes)`;
      } else if (status === 'CANCELLED') {
        db.prepare('UPDATE products SET available_stock = available_stock + 1 WHERE id = ?').run(rental.product_id);
        extraUpdate = `, deposit_status = 'REFUNDED', deposit_refunded_amount = deposit_amount`;
      }

      const stmt = db.prepare(`UPDATE rentals SET status = ? ${extraUpdate} WHERE id = ?`);
      if (status === 'READY_FOR_PICKUP' || status === 'RETURN_SUBMITTED') {
        stmt.run(status, notes || null, id);
      } else {
        stmt.run(status, id);
      }

      db.prepare(`
        INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description)
        VALUES (?, ?, ?, 'STATUS_CHANGED', ?)
      `).run(id, actor_name || 'Fleet Director', actor_role || 'admin', `Status transitioned to: ${status}. ${notes ? `Note: ${notes}` : ''}`);

      const updated = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
      return sendJson(res, 200, updated);
    }

    // Vehicle Inspection & Escrow Refund
    if (pathname.match(/^\/api\/rentals\/\d+\/inspect$/) && req.method === 'POST') {
      const id = pathname.split('/')[3];
      const body = await parseJsonBody(req);
      const { inspector_name, condition_grade, checklist, damage_fee, inspection_notes } = body;

      const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
      if (!rental) {
        return sendJson(res, 404, { error: 'Rental not found' });
      }

      const settlement = calculateInspectionSettlement(id, damage_fee, condition_grade, inspection_notes, inspector_name);

      db.prepare(`
        INSERT INTO inspection_logs (
          rental_id, inspector_name, inspection_type, condition_grade,
          checklist_json, damage_fee_assessed, late_fee_assessed, deposit_refund_calculated, inspection_notes
        ) VALUES (?, ?, 'RETURN_CHECK', ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        inspector_name || 'Sarah Connor',
        condition_grade || 'Pristine',
        JSON.stringify(checklist || []),
        settlement.damageFee,
        settlement.lateFee,
        settlement.refundAmount,
        inspection_notes || ''
      );

      db.prepare(`
        UPDATE rentals SET
          status = 'INSPECTED_COMPLETED',
          damage_fee = ?,
          deposit_refunded_amount = ?,
          deposit_status = ?,
          actual_return_date = COALESCE(actual_return_date, CURRENT_DATE),
          return_notes = ?
        WHERE id = ?
      `).run(
        settlement.damageFee,
        settlement.refundAmount,
        settlement.depositStatus,
        `Inspection closed (${condition_grade}). ${inspection_notes || ''}`,
        id
      );

      db.prepare(`
        UPDATE products SET
          available_stock = available_stock + 1,
          condition_status = CASE WHEN ? IN ('Damaged', 'Heavily Damaged') THEN 'Requires Service' ELSE condition_status END
        WHERE id = ?
      `).run(condition_grade, rental.product_id);

      db.prepare(`
        INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description)
        VALUES (?, ?, 'admin', 'INSPECTION_COMPLETED', ?)
      `).run(
        id,
        inspector_name || 'Sarah Connor',
        `Vehicle return diagnostic (${condition_grade}). Damage: $${settlement.damageFee.toFixed(2)}, Late Fee: $${settlement.lateFee.toFixed(2)}. Net Escrow Refund: $${settlement.refundAmount.toFixed(2)} (${settlement.depositStatus}).`
      );

      const updated = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
      return sendJson(res, 200, {
        message: 'Vehicle diagnostic completed and escrow reconciled.',
        settlement,
        rental: updated
      });
    }

    // Analytics
    if (pathname === '/api/analytics' && req.method === 'GET') {
      const activeCount = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'ACTIVE'").get().count;
      const overdueCount = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'OVERDUE'").get().count;
      const pendingCount = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'PENDING_APPROVAL'").get().count;
      const readyPickupCount = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'READY_FOR_PICKUP'").get().count;
      const returnSubmittedCount = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'RETURN_SUBMITTED'").get().count;
      const completedCount = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'INSPECTED_COMPLETED'").get().count;

      const totalRentals = db.prepare('SELECT COUNT(*) as count FROM rentals').get().count;

      const revenueRow = db.prepare(`
        SELECT
          SUM(base_rental_fee) as total_base_revenue,
          SUM(late_penalty_fee) as total_late_penalties,
          SUM(damage_fee) as total_damage_fees,
          SUM(deposit_amount) as total_deposit_escrow,
          SUM(deposit_refunded_amount) as total_deposit_refunded
        FROM rentals
        WHERE status != 'CANCELLED'
      `).get();

      const totalBaseRev = revenueRow.total_base_revenue || 0;
      const totalPenalties = revenueRow.total_late_penalties || 0;
      const totalDamage = revenueRow.total_damage_fees || 0;
      const totalGrossRevenue = totalBaseRev + totalPenalties + totalDamage;

      const heldDepositRow = db.prepare("SELECT SUM(deposit_amount) as held FROM rentals WHERE deposit_status = 'HELD'").get();
      const currentEscrowHeld = heldDepositRow.held || 0;

      const fleetRow = db.prepare('SELECT SUM(total_stock) as total, SUM(available_stock) as available FROM products').get();
      const totalFleet = fleetRow.total || 1;
      const availableFleet = fleetRow.available || 0;
      const rentedFleet = totalFleet - availableFleet;
      const utilizationRate = Math.round((rentedFleet / totalFleet) * 100);

      const overdueList = db.prepare(`
        SELECT r.id, r.rental_code, r.end_date, r.late_days_count, r.late_penalty_fee, r.deposit_amount,
               p.name as product_name, p.daily_rate,
               u.name as customer_name, u.phone as customer_phone, u.email as customer_email
        FROM rentals r
        JOIN products p ON r.product_id = p.id
        JOIN users u ON r.user_id = u.id
        WHERE r.status = 'OVERDUE'
        ORDER BY r.late_days_count DESC
      `).all();

      const recentActivity = db.prepare(`
        SELECT a.*, r.rental_code
        FROM activity_logs a
        LEFT JOIN rentals r ON a.rental_id = r.id
        ORDER BY a.timestamp DESC
        LIMIT 10
      `).all();

      const categoryDistribution = db.prepare(`
        SELECT c.id, c.name, COUNT(r.id) as rental_count, SUM(r.base_rental_fee) as category_revenue
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        LEFT JOIN rentals r ON r.product_id = p.id AND r.status != 'CANCELLED'
        GROUP BY c.id, c.name
      `).all();

      const funnel = {
        pending_approval: pendingCount,
        ready_for_pickup: readyPickupCount,
        active: activeCount,
        overdue: overdueCount,
        return_submitted: returnSubmittedCount,
        completed: completedCount
      };

      return sendJson(res, 200, {
        kpis: {
          active_rentals: activeCount,
          overdue_rentals: overdueCount,
          pending_approval: pendingCount,
          ready_for_pickup: readyPickupCount,
          return_submitted: returnSubmittedCount,
          completed_rentals: completedCount,
          total_rentals: totalRentals,
          total_gross_revenue: totalGrossRevenue,
          base_rental_revenue: totalBaseRev,
          late_penalty_revenue: totalPenalties,
          damage_fee_revenue: totalDamage,
          current_escrow_held: currentEscrowHeld,
          total_deposit_refunded: revenueRow.total_deposit_refunded || 0,
          utilization_rate: utilizationRate,
          total_fleet_items: totalFleet,
          rented_fleet_items: rentedFleet
        },
        overdue_items: overdueList,
        funnel,
        category_distribution: categoryDistribution,
        recent_activity: recentActivity
      });
    }

    // Static Fallback
    return handleStatic(req, res, pathname);

  } catch (err) {
    console.error('Server error processing request:', err);
    return sendJson(res, 500, { error: 'Internal server error', details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Leaseify Car Rental & Auth Server running on port ${PORT}`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` API Base: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});
