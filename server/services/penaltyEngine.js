// penaltyEngine.js - Automated late return & deposit reconciliation engine
const { db } = require('../db');

function evaluateRentals() {
  const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get() || {
    grace_period_hours: 4,
    late_fee_daily_multiplier: 1.5,
    simulated_days_offset: 0
  };

  const now = new Date();
  // Apply simulated days offset if configured by admin
  now.setDate(now.getDate() + (config.simulated_days_offset || 0));

  // Find all ACTIVE and OVERDUE rentals
  const activeRentals = db.prepare(`
    SELECT r.*, p.daily_rate as prod_daily_rate, p.name as prod_name, u.name as customer_name
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
    WHERE r.status IN ('ACTIVE', 'OVERDUE')
  `).all();

  const updateRentalStmt = db.prepare(`
    UPDATE rentals
    SET status = ?, late_days_count = ?, late_penalty_fee = ?
    WHERE id = ?
  `);

  const insertActivity = db.prepare(`
    INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description)
    VALUES (?, 'System Engine', 'system', 'PENALTY_EVALUATED', ?)
  `);

  let updatedCount = 0;

  for (const rental of activeRentals) {
    const endDate = new Date(rental.end_date + 'T23:59:59');
    // Add grace period
    const gracePeriodMs = (config.grace_period_hours || 4) * 60 * 60 * 1000;
    const deadlineWithGrace = new Date(endDate.getTime() + gracePeriodMs);

    if (now > deadlineWithGrace) {
      // Overdue
      const diffMs = now.getTime() - endDate.getTime();
      const overdueDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const dailyPenaltyRate = rental.prod_daily_rate * config.late_fee_daily_multiplier;
      const totalLatePenalty = overdueDays * dailyPenaltyRate;

      if (rental.status !== 'OVERDUE' || rental.late_days_count !== overdueDays || rental.late_penalty_fee !== totalLatePenalty) {
        updateRentalStmt.run('OVERDUE', overdueDays, totalLatePenalty, rental.id);
        insertActivity.run(rental.id, `Rental ${rental.rental_code} flagged OVERDUE (${overdueDays} day(s) late). Accrued penalty: $${totalLatePenalty.toFixed(2)}.`);
        updatedCount++;
      }
    } else if (rental.status === 'OVERDUE' && now <= deadlineWithGrace) {
      // Returned back to ACTIVE if date offset was reset
      updateRentalStmt.run('ACTIVE', 0, 0, rental.id);
      updatedCount++;
    }
  }

  return { evaluated: activeRentals.length, updated: updatedCount, simulatedNow: now.toISOString() };
}

function calculateInspectionSettlement(rentalId, damageFee = 0, conditionGrade = 'Good', inspectorNotes = '', inspectorName = 'Sarah Connor') {
  const rental = db.prepare(`
    SELECT r.*, p.daily_rate as prod_daily_rate, p.deposit_amount as prod_deposit
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    WHERE r.id = ?
  `).get(rentalId);

  if (!rental) {
    throw new Error('Rental not found');
  }

  const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get();
  
  // Late fee already calculated or evaluate now
  const lateFee = rental.late_penalty_fee || 0;
  const deposit = rental.deposit_amount;
  const totalDeductions = parseFloat(damageFee || 0) + parseFloat(lateFee || 0);
  
  const refundAmount = Math.max(0, deposit - totalDeductions);
  const depositStatus = refundAmount >= deposit ? 'REFUNDED' : refundAmount > 0 ? 'PARTIALLY_REFUNDED' : 'FORFEITED';

  return {
    rentalId,
    depositAmount: deposit,
    damageFee: parseFloat(damageFee || 0),
    lateFee: parseFloat(lateFee || 0),
    totalDeductions,
    refundAmount,
    depositStatus,
    conditionGrade
  };
}

module.exports = {
  evaluateRentals,
  calculateInspectionSettlement
};
