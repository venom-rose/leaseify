// backend/controllers/penaltyController.js - Late Penalty Management & Invoicing Engine
const { db } = require('../config/database');
const { calculateRentalPenalty, calculateDepositSettlement } = require('../services/penaltyEngine');

function getOutstandingPenalties() {
  const overdueRentals = db.prepare(`
    SELECT r.*, p.name as product_name, p.image as product_image, p.brand as product_brand, p.daily_rate,
           u.name as customer_name, u.email as customer_email, u.phone as customer_phone
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
    WHERE r.late_penalty_fee > 0 OR r.status = 'OVERDUE'
    ORDER BY r.late_penalty_fee DESC, r.id DESC
  `).all();

  // Summary Metrics
  const totalAccrued = overdueRentals.reduce((sum, r) => sum + (r.late_penalty_fee || 0), 0);
  const totalDepositCovered = overdueRentals.reduce((sum, r) => sum + Math.min(r.deposit_amount, r.late_penalty_fee || 0), 0);
  const totalOutstanding = overdueRentals.reduce((sum, r) => sum + (r.outstanding_penalty_balance || 0), 0);
  const overdueCount = overdueRentals.filter(r => r.status === 'OVERDUE').length;

  return {
    status: 200,
    data: {
      metrics: {
        total_overdue_count: overdueCount,
        total_penalties_accrued: totalAccrued,
        total_deposit_coverage: totalDepositCovered,
        total_outstanding_balance: totalOutstanding
      },
      penalties: overdueRentals
    }
  };
}

function getPenaltyInvoice(rentalId) {
  const rental = db.prepare(`
    SELECT r.*, p.name as product_name, p.image as product_image, p.brand as product_brand,
           p.model as product_model, p.serial_number as product_serial, p.daily_rate, p.weekly_rate,
           u.name as customer_name, u.email as customer_email, u.phone as customer_phone, u.address as customer_address
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(rentalId);

  if (!rental) {
    return { status: 404, data: { error: 'Rental record not found' } };
  }

  const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get();

  // If no penalty invoice number exists, generate one
  let invoiceNumber = rental.late_penalty_invoice_number;
  if (!invoiceNumber) {
    invoiceNumber = `INV-PEN-2026-${rental.rental_code.replace('RNT-', '') || Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare('UPDATE rentals SET late_penalty_invoice_number = ?, penalty_invoice_generated_at = ? WHERE id = ?')
      .run(invoiceNumber, nowStr, rentalId);
    rental.late_penalty_invoice_number = invoiceNumber;
    rental.penalty_invoice_generated_at = nowStr;
  }

  const depositTransactions = db.prepare('SELECT * FROM deposit_transactions WHERE rental_id = ? ORDER BY id ASC').all(rentalId);

  return {
    status: 200,
    data: {
      rental,
      config,
      invoice: {
        invoice_number: invoiceNumber,
        generated_at: rental.penalty_invoice_generated_at || rental.paid_at || new Date().toISOString(),
        delay_hours: rental.late_hours_count || 0,
        delay_days: rental.late_days_count || 0,
        fee_mode: rental.late_fee_mode_applied || config.late_fee_mode || 'DAILY',
        grace_period_hours: config.grace_period_hours || 4,
        max_penalty_limit: config.max_penalty_limit || 5000.0,
        late_penalty_fee: rental.late_penalty_fee || 0,
        damage_fee: rental.damage_fee || 0,
        deposit_deduction: Math.min(rental.deposit_amount, (rental.late_penalty_fee || 0) + (rental.damage_fee || 0)),
        deposit_refunded: rental.deposit_refunded_amount || 0,
        outstanding_balance: rental.outstanding_penalty_balance || 0,
        payment_method: rental.payment_method || 'CREDIT_CARD',
        status: rental.status === 'INSPECTED_COMPLETED' ? 'SETTLED' : 'ACCRUING_ACTIVE'
      },
      deposit_transactions: depositTransactions
    }
  };
}

module.exports = {
  getOutstandingPenalties,
  getPenaltyInvoice
};
