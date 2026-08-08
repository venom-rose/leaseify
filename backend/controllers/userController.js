// backend/controllers/userController.js - Admin User & Client Profile Management
const { db } = require('../config/database');
const { generateSalt, hashPassword } = require('../services/authService');

function getUsers(searchParams) {
  const role = searchParams.get('role');
  const search = searchParams.get('search');

  let query = `
    SELECT u.id, u.name, u.email, u.role, u.avatar, u.address, u.phone, u.membership_tier, u.created_at,
           (SELECT COUNT(*) FROM rentals r WHERE r.user_id = u.id) as total_rentals,
           (SELECT SUM(r.base_rental_fee) FROM rentals r WHERE r.user_id = u.id) as lifetime_spend
    FROM users u
    WHERE 1=1
  `;
  const params = [];

  if (role && role !== 'ALL') {
    query += ` AND u.role = ?`;
    params.push(role);
  }

  if (search) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY u.id ASC`;

  const users = db.prepare(query).all(...params);
  return { status: 200, data: users };
}

function createUser(body) {
  const { name, email, password, role, address, phone, membership_tier, avatar } = body;
  if (!name || !email || !password) {
    return { status: 400, data: { error: 'Name, email, and password are required.' } };
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return { status: 400, data: { error: 'A user with this email address already exists.' } };
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const stmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, salt, role, avatar, address, phone, membership_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name.trim(),
    email.trim().toLowerCase(),
    passwordHash,
    salt,
    role || 'customer',
    avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    address || 'Los Angeles, CA',
    phone || '+1 (555) 000-0000',
    membership_tier || 'Standard Driver'
  );

  const created = db.prepare('SELECT id, name, email, role, avatar, address, phone, membership_tier, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  return { status: 201, data: created };
}

function updateUser(id, body) {
  const { name, role, address, phone, membership_tier, avatar, password } = body;

  let extraUpdate = '';
  const params = [
    name ?? null,
    role ?? null,
    address ?? null,
    phone ?? null,
    membership_tier ?? null,
    avatar ?? null
  ];

  if (password) {
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    extraUpdate = `, password_hash = ?, salt = ?`;
    params.push(hash, salt);
  }

  params.push(id);

  const sql = `
    UPDATE users SET
      name = COALESCE(?, name),
      role = COALESCE(?, role),
      address = COALESCE(?, address),
      phone = COALESCE(?, phone),
      membership_tier = COALESCE(?, membership_tier),
      avatar = COALESCE(?, avatar)
      ${extraUpdate}
    WHERE id = ?
  `;

  db.prepare(sql).run(...params);

  const updated = db.prepare('SELECT id, name, email, role, avatar, address, phone, membership_tier, created_at FROM users WHERE id = ?').get(id);
  return { status: 200, data: updated };
}

module.exports = {
  getUsers,
  createUser,
  updateUser
};
