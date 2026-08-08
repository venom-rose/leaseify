// backend/seed.js - Standalone database reset and re-seed script
const { initSchema, seedDatabase } = require('./config/database');

console.log('Resetting and seeding Leaseify database...');
initSchema();
seedDatabase(true);
console.log('Leaseify Database successfully seeded with demo luxury fleet & users!');
