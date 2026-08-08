// backend/controllers/depositController.js - Security Deposit Escrow Ledger & Transactions
const { db } = require('../config/database');

function getDepositLedger() {
  const transactions = db.prepare(`
    SELECT dt.*, r.rental_code, r.invoice_number, r.start_date, r.end_date, r.status as rental_status,
           r.deposit_type, r.deposit_rate_applied, r.deposit_amount as total_original_deposit,
           p.name as product_name, p.image as product_image, p.brand as product_brand,
           u.name as user_name, u.email as user_email, u.phone as user_phone
    FROM deposit_transactions dt
    JOIN rentals r ON dt.rental_id = r.id
    JOIN products p ON r.product_id = p.id
    JOIN users u ON dt.user_id = u.id
    ORDER BY dt.created_at DESC, dt.id DESC
  `).all();

  // Metrics
  const heldRow = db.prepare("SELECT SUM(deposit_amount) as held, COUNT(*) as count FROM rentals WHERE deposit_status = 'HELD'").get();
  const refundedRow = db.prepare("SELECT SUM(deposit_refunded_amount) as refunded FROM rentals").get();
  const penaltiesRow = db.prepare("SELECT SUM(late_penalty_fee) as penalties FROM rentals WHERE late_penalty_fee > 0").get();
  const damageRow = db.prepare("SELECT SUM(damage_fee) as damage FROM rentals WHERE damage_fee > 0").get();

  const totalHeld = heldRow.held || 0;
  const activeCount = heldRow.count || 0;
  const totalRefunded = refundedRow.refunded || 0;
  const totalPenalties = penaltiesRow.penalties || 0;
  const totalDamage = damageRow.damage || 0;

  // Active Held Deposits List
  const activeHeldDeposits = db.prepare(`
    SELECT r.id, r.rental_code, r.invoice_number, r.start_date, r.end_date, r.deposit_type, r.deposit_rate_applied,
           r.deposit_amount, r.deposit_status, r.deposit_held_at, r.status as rental_status,
           p.name as product_name, p.image as product_image,
           u.name as customer_name, u.email as customer_email, u.phone as customer_phone
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
    WHERE r.deposit_status = 'HELD'
    ORDER BY r.id DESC
  `).all();

  return {
    status: 200,
    data: {
      metrics: {
        total_escrow_held: totalHeld,
        active_deposits_count: activeCount,
        total_deposit_refunded: totalRefunded,
        total_penalties_deducted: totalPenalties,
        total_damage_deducted: totalDamage
      },
      active_held_deposits: activeHeldDeposits,
      transactions
    }
  };
}

function getRentalDepositHistory(rentalId) {
  const rental = db.prepare(`
    SELECT r.*, p.name as product_name, p.image as product_image, p.brand as product_brand, p.daily_rate,
           u.name as customer_name, u.email as customer_email, u.phone as customer_phone, u.address as customer_address
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(rentalId);

  if (!rental) {
    return { status: 404, data: { error: 'Rental booking not found' } };
  }

  const transactions = db.prepare(`
    SELECT * FROM deposit_transactions
    WHERE rental_id = ?
    ORDER BY id ASC
  `).all(rentalId);

  return {
    status: 200,
    data: {
      rental,
      transactions
    }
  };
}

module.exports = {
  getDepositLedger,
  getRentalDepositHistory
};
