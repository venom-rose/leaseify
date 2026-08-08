const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'leaseify-super-secret-luxury-jwt-key-2026',
  TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  PUBLIC_DIR: fs.existsSync(path.join(__dirname, '..', '..', 'frontend', 'public'))
    ? path.join(__dirname, '..', '..', 'frontend', 'public')
    : path.join(__dirname, '..', '..', 'public'),
  MIME_TYPES: {
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
  }
};
