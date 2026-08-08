// backend/controllers/authController.js
const { db } = require('../config/database');
const { generateSalt, hashPassword, verifyPassword, generateJWT } = require('../services/authService');

function signup(body) {
  const { name, email, password, address, avatar, phone } = body || {};

  if (!name || !email || !password) {
    return { status: 400, data: { error: 'Name, email, and password are required.' } };
  }

  const emailTrim = email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailTrim);
  if (existing) {
    return { status: 400, data: { error: 'An account with this email address already exists.' } };
  }

  // Strictly enforce customer role for public signup
  const role = 'customer';
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

  const insertStmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, salt, role, avatar, address, phone, membership_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Standard Driver')
  `);

  const result = insertStmt.run(
    name.trim(),
    emailTrim,
    passwordHash,
    salt,
    role,
    defaultAvatar,
    address || 'Los Angeles, CA',
    phone || '+1 (555) 000-0000'
  );

  const newUser = db.prepare('SELECT id, name, email, role, avatar, address, phone, membership_tier, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateJWT({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name });

  return {
    status: 201,
    data: {
      message: 'Account created successfully! Welcome to Leaseify.',
      token,
      user: newUser
    }
  };
}

function login(body) {
  const { email, password } = body || {};

  if (!email || !password) {
    return { status: 400, data: { error: 'Email and password are required.' } };
  }

  const emailTrim = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailTrim);

  if (!user || !user.password_hash || !user.salt) {
    return { status: 401, data: { error: 'Invalid email or password.' } };
  }

  const isValid = verifyPassword(password, user.salt, user.password_hash);
  if (!isValid) {
    return { status: 401, data: { error: 'Invalid email or password.' } };
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

  return {
    status: 200,
    data: {
      message: 'Login successful',
      token,
      user: safeUser
    }
  };
}

function getProfile(userId) {
  const user = db.prepare('SELECT id, name, email, role, avatar, address, phone, membership_tier, created_at FROM users WHERE id = ?').get(userId);
  if (!user) {
    return { status: 404, data: { error: 'User not found' } };
  }
  return { status: 200, data: user };
}

function updateProfile(userId, body) {
  const { name, address, avatar, phone } = body || {};

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!current) {
    return { status: 404, data: { error: 'User not found' } };
  }

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      address = COALESCE(?, address),
      avatar = COALESCE(?, avatar),
      phone = COALESCE(?, phone)
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    address ? address.trim() : null,
    avatar ? avatar.trim() : null,
    phone ? phone.trim() : null,
    userId
  );

  const updated = db.prepare('SELECT id, name, email, role, avatar, address, phone, membership_tier, created_at FROM users WHERE id = ?').get(userId);

  return {
    status: 200,
    data: {
      message: 'Profile updated successfully',
      user: updated
    }
  };
}

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile
};
