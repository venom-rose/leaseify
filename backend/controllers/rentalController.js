// backend/controllers/rentalController.js - Full Rental Lifecycle & Escrow Deposit Engine
const { db } = require('../config/database');
const { calculateRentalPenalty, calculateDepositSettlement } = require('../services/penaltyEngine');

function getRentals(filters = {}) {
  let query = `
    SELECT r.*, p.name as product_name, p.image as product_image, p.brand as product_brand, p.serial_number as product_serial,
           u.name as user_name, u.email as user_email, u.phone as user_phone
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
  `;

  const conditions = [];
  const params = [];

  if (filters.userId) {
    conditions.push('r.user_id = ?');
    params.push(filters.userId);
  }

  if (filters.status && filters.status !== 'ALL') {
    conditions.push('r.status = ?');
    params.push(filters.status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY r.id DESC';

  const rows = db.prepare(query).all(...params);
  return { status: 200, data: rows };
}

function getRentalById(id) {
  const row = db.prepare(`
    SELECT r.*, p.name as product_name, p.image as product_image, p.brand as product_brand,
           p.model as product_model, p.serial_number as product_serial, p.replacement_value,
           u.name as user_name, u.email as user_email, u.phone as user_phone, u.address as user_address
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(id);

  if (!row) {
    return { status: 404, data: { error: 'Rental not found' } };
  }

  const inspectionLogs = db.prepare('SELECT * FROM inspection_logs WHERE rental_id = ? ORDER BY timestamp DESC').all(id);
  const depositTx = db.prepare('SELECT * FROM deposit_transactions WHERE rental_id = ? ORDER BY id ASC').all(id);

  return { status: 200, data: { ...row, inspection_logs: inspectionLogs, deposit_transactions: depositTx } };
}

function createRental(payload) {
  const {
    user_id,
    product_id,
    start_date,
    end_date,
    fulfillment_type = 'PICKUP',
    delivery_address = '',
    payment_method = 'CREDIT_CARD',
    customer_notes = ''
  } = payload;

  if (!user_id || !product_id || !start_date || !end_date) {
    return { status: 400, data: { error: 'Missing required booking fields' } };
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return { status: 404, data: { error: 'Vehicle not found' } };
  }

  if (product.available_stock <= 0) {
    return { status: 400, data: { error: 'Vehicle is currently out of stock or reserved' } };
  }

  const start = new Date(start_date);
  const end = new Date(end_date);
  const diffTime = end.getTime() - start.getTime();
  const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let baseRentalFee = 0;
  if (durationDays >= 7 && product.weekly_rate > 0) {
    const weeks = Math.floor(durationDays / 7);
    const remDays = durationDays % 7;
    baseRentalFee = (weeks * product.weekly_rate) + (remDays * product.daily_rate);
  } else {
    baseRentalFee = durationDays * product.daily_rate;
  }

  // Support FIXED vs PERCENTAGE deposit
  let depositAmount = product.deposit_amount;
  const depositType = product.deposit_type || 'FIXED';
  const depositRate = product.deposit_rate || product.deposit_amount;

  if (depositType === 'PERCENTAGE') {
    depositAmount = Math.round((baseRentalFee * (depositRate / 100)) * 100) / 100;
  }

  const deliveryFee = fulfillment_type === 'DELIVERY' ? 150.0 : 0.0;
  const totalPaidToday = baseRentalFee + depositAmount + deliveryFee;

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const rentalCode = `RNT-${randomNum}`;
  const invoiceNumber = `INV-2026-${randomNum}`;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const insert = db.prepare(`
    INSERT INTO rentals (
      rental_code, invoice_number, user_id, product_id, quotation_id,
      start_date, end_date, duration_days, daily_rate, base_rental_fee,
      deposit_type, deposit_rate_applied, deposit_amount, deposit_status,
      damage_fee, late_hours_count, late_days_count, late_penalty_fee, deposit_refunded_amount,
      deposit_held_at, status, fulfillment_type, delivery_address, delivery_fee,
      payment_method, paid_at, customer_notes, created_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, 'HELD',
      0, 0, 0, 0, 0,
      ?, 'PENDING_APPROVAL', ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const result = insert.run(
    rentalCode,
    invoiceNumber,
    user_id,
    product_id,
    payload.quotation_id ?? null,
    start_date,
    end_date,
    durationDays,
    product.daily_rate,
    baseRentalFee,
    depositType,
    depositRate,
    depositAmount,
    nowStr,
    fulfillment_type,
    delivery_address || (fulfillment_type === 'PICKUP' ? 'Leaseify Executive Lounge' : 'Client Delivery Destination'),
    deliveryFee,
    payment_method,
    nowStr,
    customer_notes ?? null,
    nowStr
  );

  const rentalId = result.lastInsertRowid;

  // Log Escrow Lock Transaction in deposit_transactions
  const depTxCode = `DEP-TX-${randomNum}-01`;
  db.prepare(`
    INSERT INTO deposit_transactions (rental_id, transaction_code, user_id, type, amount, balance_after, payment_channel, notes, actor_name, created_at)
    VALUES (?, ?, ?, 'ESCROW_LOCK', ?, ?, ?, ?, ?, ?)
  `).run(
    rentalId,
    depTxCode,
    user_id,
    depositAmount,
    depositAmount,
    payment_method,
    `Security deposit of $${depositAmount.toFixed(2)} (${depositType === 'PERCENTAGE' ? depositRate + '%' : 'Fixed'}) collected and locked in escrow.`,
    'System Escrow Gateway',
    nowStr
  );

  // Decrement stock
  db.prepare('UPDATE products SET available_stock = available_stock - 1 WHERE id = ?').run(product_id);

  // Log Activity
  const user = db.prepare('SELECT name, role FROM users WHERE id = ?').get(user_id);
  db.prepare(`
    INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description, timestamp)
    VALUES (?, ?, ?, 'ORDER_PAID', ?, ?)
  `).run(
    rentalId,
    user ? user.name : 'Customer',
    user ? user.role : 'customer',
    `Reservation ${rentalCode} booked for ${product.name}. Paid $${totalPaidToday.toFixed(2)} with $${depositAmount.toFixed(2)} locked in escrow.`,
    nowStr
  );

  return {
    status: 201,
    data: {
      message: 'Rental reservation & payment confirmed successfully',
      rental: { id: rentalId, rental_code: rentalCode, invoice_number: invoiceNumber },
      total_paid: totalPaidToday,
      deposit_amount: depositAmount,
      invoice_number: invoiceNumber
    }
  };
}

function updateRentalStatus(id, payload) {
  const { status, actor_name = 'Fleet Director', actor_role = 'admin', notes = '' } = payload;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
  if (!rental) {
    return { status: 404, data: { error: 'Rental not found' } };
  }

  db.prepare('UPDATE rentals SET status = ? WHERE id = ?').run(status, id);

  db.prepare(`
    INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description, timestamp)
    VALUES (?, ?, ?, 'STATUS_CHANGE', ?, ?)
  `).run(
    id,
    actor_name,
    actor_role,
    `Status updated from ${rental.status} to ${status}. ${notes}`,
    nowStr
  );

  return { status: 200, data: { message: `Rental status updated to ${status}` } };
}

// Complete Store Hub Return & Escrow Deposit Settlement
function processStoreReturn(id, payload) {
  const { return_notes = '', inspector_name = 'Store Concierge' } = payload;
  const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
  if (!rental) {
    return { status: 404, data: { error: 'Rental not found' } };
  }

  // Calculate return date with simulated days offset
  const offset = config.simulated_days_offset || 0;
  const returnDate = new Date();
  returnDate.setDate(returnDate.getDate() + offset);
  const actualReturnDateStr = returnDate.toISOString().split('T')[0];

  const penaltyCalc = calculateRentalPenalty(rental, returnDate, config);
  const settlement = calculateDepositSettlement(
    rental.deposit_amount,
    penaltyCalc.latePenaltyFee,
    0, // zero damage during on-time store return
    rental.daily_rate
  );

  const refundTxId = `DEP-REF-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    UPDATE rentals SET
      actual_return_date = ?,
      late_hours_count = ?,
      late_days_count = ?,
      late_penalty_fee = ?,
      late_fee_mode_applied = ?,
      outstanding_penalty_balance = ?,
      deposit_status = ?,
      deposit_refunded_amount = ?,
      deposit_settled_at = ?,
      deposit_refund_tx_id = ?,
      status = 'INSPECTED_COMPLETED',
      return_notes = ?
    WHERE id = ?
  `).run(
    actualReturnDateStr,
    penaltyCalc.delayHours || 0,
    penaltyCalc.delayDays || 0,
    penaltyCalc.latePenaltyFee || 0,
    penaltyCalc.feeMode || 'DAILY',
    settlement.outstandingBalance || 0,
    settlement.depositStatus,
    settlement.refundAmount,
    nowStr,
    refundTxId,
    return_notes || 'Vehicle returned at store hub. Escrow deposit reconciled.',
    id
  );

  // Increment product stock back
  db.prepare('UPDATE products SET available_stock = available_stock + 1 WHERE id = ?').run(rental.product_id);

  // Log Escrow Settlement Transactions
  if (penaltyCalc.latePenaltyFee > 0) {
    db.prepare(`
      INSERT INTO deposit_transactions (rental_id, transaction_code, user_id, type, amount, balance_after, payment_channel, notes, actor_name, created_at)
      VALUES (?, ?, ?, 'PENALTY_DEDUCTION', ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      `DEP-DED-${Math.floor(1000 + Math.random() * 9000)}`,
      rental.user_id,
      penaltyCalc.latePenaltyFee,
      Math.max(0, rental.deposit_amount - penaltyCalc.latePenaltyFee),
      rental.payment_method,
      `Late penalty deduction of $${penaltyCalc.latePenaltyFee.toFixed(2)} (${penaltyCalc.delayHours}h / ${penaltyCalc.delayDays}d overdue).`,
      inspector_name,
      nowStr
    );
  }

  if (settlement.refundAmount > 0) {
    const txType = settlement.refundAmount === rental.deposit_amount ? 'FULL_REFUND' : 'PARTIAL_REFUND';
    db.prepare(`
      INSERT INTO deposit_transactions (rental_id, transaction_code, user_id, type, amount, balance_after, payment_channel, notes, actor_name, created_at)
      VALUES (?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?)
    `).run(
      id,
      refundTxId,
      rental.user_id,
      txType,
      settlement.refundAmount,
      rental.payment_method,
      `Escrow deposit refund of $${settlement.refundAmount.toFixed(2)} released to customer ${rental.payment_method}.`,
      inspector_name,
      nowStr
    );
  } else if (penaltyCalc.latePenaltyFee >= rental.deposit_amount) {
    db.prepare(`
      INSERT INTO deposit_transactions (rental_id, transaction_code, user_id, type, amount, balance_after, payment_channel, notes, actor_name, created_at)
      VALUES (?, ?, ?, 'FORFEITURE', ?, 0.0, ?, ?, ?, ?)
    `).run(
      id,
      `DEP-FORFEIT-${Math.floor(1000 + Math.random() * 9000)}`,
      rental.user_id,
      rental.deposit_amount,
      rental.payment_method,
      `Entire security deposit of $${rental.deposit_amount.toFixed(2)} forfeited due to accrued late penalty exceeding deposit.`,
      inspector_name,
      nowStr
    );
  }

  // Log Activity
  db.prepare(`
    INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description, timestamp)
    VALUES (?, ?, 'system', 'DEPOSIT_REFUNDED', ?, ?)
  `).run(
    id,
    inspector_name,
    `Vehicle returned for ${rental.rental_code}. Net escrow deposit of $${settlement.refundAmount.toFixed(2)} settled (Deductions: $${penaltyCalc.latePenaltyFee.toFixed(2)}).`,
    nowStr
  );

  return {
    status: 200,
    data: {
      message: settlement.refundAmount === rental.deposit_amount ?
        `Vehicle return completed! 100% full deposit of $${settlement.refundAmount.toFixed(2)} refunded.` :
        `Vehicle return completed. Net deposit refund of $${settlement.refundAmount.toFixed(2)} released after $${penaltyCalc.latePenaltyFee.toFixed(2)} late penalty deduction.`,
      is_late: penaltyCalc.isLate,
      late_days: penaltyCalc.delayDays || 0,
      late_hours: penaltyCalc.delayHours || 0,
      late_penalty_fee: penaltyCalc.latePenaltyFee,
      deposit_refunded: settlement.refundAmount,
      outstanding_balance: settlement.outstandingBalance || 0,
      refund_tx_id: refundTxId
    }
  };
}

// Complete Diagnostic Return Inspection Terminal (Admin)
function inspectAndCompleteRental(id, payload) {
  const {
    inspector_name = 'Sarah Connor',
    condition_grade = 'Pristine',
    checklist = [],
    damage_fee = 0,
    inspection_notes = ''
  } = payload;

  const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
  if (!rental) {
    return { status: 404, data: { error: 'Rental not found' } };
  }

  const offset = config.simulated_days_offset || 0;
  const returnDate = new Date();
  returnDate.setDate(returnDate.getDate() + offset);
  const actualReturnDateStr = returnDate.toISOString().split('T')[0];

  const penaltyCalc = calculateRentalPenalty(rental, returnDate, config);
  const settlement = calculateDepositSettlement(
    rental.deposit_amount,
    penaltyCalc.latePenaltyFee,
    damage_fee,
    rental.daily_rate
  );

  const refundTxId = `DEP-REF-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    UPDATE rentals SET
      actual_return_date = ?,
      late_hours_count = ?,
      late_days_count = ?,
      late_penalty_fee = ?,
      late_fee_mode_applied = ?,
      damage_fee = ?,
      outstanding_penalty_balance = ?,
      deposit_status = ?,
      deposit_refunded_amount = ?,
      deposit_settled_at = ?,
      deposit_refund_tx_id = ?,
      status = 'INSPECTED_COMPLETED',
      return_notes = ?
    WHERE id = ?
  `).run(
    actualReturnDateStr,
    penaltyCalc.delayHours || 0,
    penaltyCalc.delayDays || 0,
    penaltyCalc.latePenaltyFee || 0,
    penaltyCalc.feeMode || 'DAILY',
    damage_fee,
    settlement.outstandingBalance || 0,
    settlement.depositStatus,
    settlement.refundAmount,
    nowStr,
    refundTxId,
    inspection_notes || 'Diagnostic return inspection complete and deposit settled.',
    id
  );

  // Increment product stock back
  db.prepare('UPDATE products SET available_stock = available_stock + 1 WHERE id = ?').run(rental.product_id);

  // Insert Inspection Log
  db.prepare(`
    INSERT INTO inspection_logs (
      rental_id, inspector_name, inspection_type, condition_grade,
      checklist_json, damage_fee_assessed, late_fee_assessed,
      deposit_refund_calculated, inspection_notes, timestamp
    ) VALUES (?, ?, 'RETURN_DIAGNOSTIC', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    inspector_name,
    condition_grade,
    JSON.stringify(checklist),
    damage_fee,
    penaltyCalc.latePenaltyFee,
    settlement.refundAmount,
    inspection_notes ?? null,
    nowStr
  );

  // Log Escrow Transactions
  if (penaltyCalc.latePenaltyFee > 0) {
    db.prepare(`
      INSERT INTO deposit_transactions (rental_id, transaction_code, user_id, type, amount, balance_after, payment_channel, notes, actor_name, created_at)
      VALUES (?, ?, ?, 'PENALTY_DEDUCTION', ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      `DEP-DED-${Math.floor(1000 + Math.random() * 9000)}`,
      rental.user_id,
      penaltyCalc.latePenaltyFee,
      Math.max(0, rental.deposit_amount - penaltyCalc.latePenaltyFee),
      rental.payment_method,
      `Late penalty deduction: +$${penaltyCalc.latePenaltyFee.toFixed(2)} (${penaltyCalc.delayHours}h / ${penaltyCalc.delayDays}d overdue).`,
      inspector_name,
      nowStr
    );
  }

  if (damage_fee > 0) {
    db.prepare(`
      INSERT INTO deposit_transactions (rental_id, transaction_code, user_id, type, amount, balance_after, payment_channel, notes, actor_name, created_at)
      VALUES (?, ?, ?, 'DAMAGE_DEDUCTION', ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      `DEP-DMG-${Math.floor(1000 + Math.random() * 9000)}`,
      rental.user_id,
      damage_fee,
      Math.max(0, rental.deposit_amount - penaltyCalc.latePenaltyFee - damage_fee),
      rental.payment_method,
      `Damage/Detailing fee deduction: $${damage_fee.toFixed(2)} (${condition_grade}).`,
      inspector_name,
      nowStr
    );
  }

  if (settlement.refundAmount > 0) {
    const txType = settlement.refundAmount === rental.deposit_amount ? 'FULL_REFUND' : 'PARTIAL_REFUND';
    db.prepare(`
      INSERT INTO deposit_transactions (rental_id, transaction_code, user_id, type, amount, balance_after, payment_channel, notes, actor_name, created_at)
      VALUES (?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?)
    `).run(
      id,
      refundTxId,
      rental.user_id,
      txType,
      settlement.refundAmount,
      rental.payment_method,
      `Net deposit refund of $${settlement.refundAmount.toFixed(2)} released to client card.`,
      inspector_name,
      nowStr
    );
  }

  // Activity Log
  db.prepare(`
    INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description, timestamp)
    VALUES (?, ?, 'admin', 'RETURN_INSPECTED', ?, ?)
  `).run(
    id,
    inspector_name,
    `Diagnostic inspection finished for ${rental.rental_code}. Grade: ${condition_grade}. Net refund of $${settlement.refundAmount.toFixed(2)} released (Deductions: Late $${penaltyCalc.latePenaltyFee.toFixed(2)}, Damage $${damage_fee.toFixed(2)}).`,
    nowStr
  );

  return {
    status: 200,
    data: {
      message: `Return inspection complete. Net escrow refund of $${settlement.refundAmount.toFixed(2)} processed.`,
      settlement,
      refund_tx_id: refundTxId
    }
  };
}

module.exports = {
  getRentals,
  getRentalById,
  createRental,
  updateRentalStatus,
  processStoreReturn,
  inspectAndCompleteRental
};
