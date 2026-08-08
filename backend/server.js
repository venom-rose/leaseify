// backend/server.js - Leaseify Modular Backend Server Entrypoint
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { PORT, PUBLIC_DIR, MIME_TYPES } = require('./config/constants');
const { db, initSchema, migrateSchema, seedDatabase } = require('./config/database');
const { verifyJWT } = require('./services/authService');
const { evaluateRentals } = require('./services/penaltyEngine');
const { handleApiRequest } = require('./routes/router');

// Initialize database schema and data
initSchema();
migrateSchema();  // Apply incremental column migrations to existing databases
seedDatabase();

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
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      body = await parseJsonBody(req);
    }
    const user = getAuthenticatedUser(req);

    // Route through REST API router
    const apiResult = await handleApiRequest(req, res, pathname, searchParams, body, user);

    if (apiResult !== null) {
      return sendJson(res, apiResult.status, apiResult.data);
    }

    // Health check
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { status: 'healthy', app: 'Leaseify Premier Fleet', timestamp: new Date().toISOString() });
    }

    // Static Frontend Assets
    return handleStatic(req, res, pathname);

  } catch (err) {
    console.error('Server error processing request:', err);
    return sendJson(res, 500, { error: 'Internal server error', details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Leaseify Backend Server running on port ${PORT}`);
  console.log(` Frontend URL: http://localhost:${PORT}`);
  console.log(` Backend API:  http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});
