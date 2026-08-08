// backend/services/penaltyEngine.js - Automated Late Return Penalties & Multi-Mode Calculation Engine
const { db } = require('../config/database');

/**
 * Calculates late penalty fee based on configured mode (HOURLY, DAILY, WEEKLY, MONTHLY),
 * grace period, and maximum penalty cap.
 */
function calculateRentalPenalty(rental, returnDate, config = null) {
  if (!config) {
    config = db.prepare('SELECT * FROM system_config WHERE id = 1').get() || {};
  }

  const scheduledEnd = new Date(rental.end_date + 'T23:59:59');
  const graceHours = config.grace_period_hours ?? 4;
  const deadlineWithGrace = new Date(scheduledEnd.getTime() + (graceHours * 60 * 60 * 1000));

  const actualReturn = returnDate instanceof Date ? returnDate : new Date(returnDate);

  // Return before or within grace period => Zero penalty
  if (actualReturn.getTime() <= deadlineWithGrace.getTime()) {
    return {
      isLate: false,
      delayHours: 0,
      delayDays: 0,
      lateHours: 0,
      lateDays: 0,
      latePenaltyFee: 0,
      feeMode: config.late_fee_mode || 'DAILY',
      maxCapApplied: false,
      originalUncappedFee: 0,
      gracePeriodHours: graceHours
    };
  }

  // Delay calculation
  const overdueDiffMs = actualReturn.getTime() - scheduledEnd.getTime();
  const delayHours = Math.max(0.1, Math.round((overdueDiffMs / (1000 * 60 * 60)) * 10) / 10);
  const delayDays = Math.max(1, Math.ceil(overdueDiffMs / (1000 * 60 * 60 * 24)));

  const mode = config.late_fee_mode || 'DAILY';
  let rawPenalty = 0;

  switch (mode) {
    case 'HOURLY': {
      const hourlyRate = config.late_fee_hourly_rate || (rental.daily_rate / 8);
      rawPenalty = Math.ceil(delayHours) * hourlyRate;
      break;
    }
    case 'DAILY': {
      const multiplier = config.late_fee_daily_multiplier || 1.5;
      rawPenalty = delayDays * (rental.daily_rate * multiplier);
      break;
    }
    case 'WEEKLY': {
      const weeklyRate = config.late_fee_weekly_rate || (rental.daily_rate * 7 * 1.25);
      const weeks = Math.max(1, Math.ceil(delayDays / 7));
      rawPenalty = weeks * weeklyRate;
      break;
    }
    case 'MONTHLY': {
      const monthlyRate = config.late_fee_monthly_rate || (rental.daily_rate * 30 * 1.15);
      const months = Math.max(1, Math.ceil(delayDays / 30));
      rawPenalty = months * monthlyRate;
      break;
    }
    default: {
      const multiplier = config.late_fee_daily_multiplier || 1.5;
      rawPenalty = delayDays * (rental.daily_rate * multiplier);
      break;
    }
  }

  const roundedRaw = Math.round(rawPenalty * 100) / 100;
  let finalPenalty = roundedRaw;
  let maxCapApplied = false;

  const maxLimit = config.max_penalty_limit ?? 5000.0;
  if (maxLimit > 0 && finalPenalty > maxLimit) {
    finalPenalty = maxLimit;
    maxCapApplied = true;
  }

  return {
    isLate: true,
    delayHours,
    delayDays,
    lateHours: delayHours,
    lateDays: delayDays,
    latePenaltyFee: finalPenalty,
    feeMode: mode,
    maxCapApplied,
    originalUncappedFee: roundedRaw,
    gracePeriodHours: graceHours,
    maxPenaltyLimit: maxLimit
  };
}

/**
 * Background auto-evaluator that detects overdue rentals, updates late fees dynamically,
 * and auto-generates penalty invoices.
 */
function evaluateRentals() {
  const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get() || {
    grace_period_hours: 4,
    late_fee_mode: 'DAILY',
    late_fee_daily_multiplier: 1.5,
    simulated_days_offset: 0,
    auto_generate_penalty_invoice: 1
  };

  const simulatedOffset = config.simulated_days_offset || 0;
  const now = new Date();
  now.setDate(now.getDate() + simulatedOffset);

  const activeRentals = db.prepare(`
    SELECT r.*, p.daily_rate, p.name as product_name
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    WHERE r.status IN ('ACTIVE', 'OVERDUE')
  `).all();

  let updatedCount = 0;

  for (const rental of activeRentals) {
    const penaltyCalc = calculateRentalPenalty(rental, now, config);

    if (penaltyCalc.isLate) {
      let penaltyInvoiceNum = rental.late_penalty_invoice_number;
      let penaltyGeneratedAt = rental.penalty_invoice_generated_at;

      // Auto-generate Late Penalty Invoice if enabled and not already assigned
      if (config.auto_generate_penalty_invoice && !penaltyInvoiceNum) {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        penaltyInvoiceNum = `INV-PEN-2026-${rental.rental_code.replace('RNT-', '') || randNum}`;
        penaltyGeneratedAt = now.toISOString().replace('T', ' ').substring(0, 19);
      }

      // Calculate outstanding balance beyond deposit
      const outstandingBalance = Math.max(0, Math.round((penaltyCalc.latePenaltyFee - rental.deposit_amount) * 100) / 100);

      const feeChanged = rental.late_penalty_fee !== penaltyCalc.latePenaltyFee || rental.status !== 'OVERDUE';

      if (feeChanged) {
        db.prepare(`
          UPDATE rentals SET
            status = 'OVERDUE',
            late_hours_count = ?,
            late_days_count = ?,
            late_penalty_fee = ?,
            late_fee_mode_applied = ?,
            late_penalty_invoice_number = COALESCE(?, late_penalty_invoice_number),
            outstanding_penalty_balance = ?,
            penalty_invoice_generated_at = COALESCE(?, penalty_invoice_generated_at)
          WHERE id = ?
        `).run(
          penaltyCalc.delayHours,
          penaltyCalc.delayDays,
          penaltyCalc.latePenaltyFee,
          penaltyCalc.feeMode,
          penaltyInvoiceNum ?? null,
          outstandingBalance,
          penaltyGeneratedAt ?? null,
          rental.id
        );

        if (rental.status !== 'OVERDUE') {
          db.prepare(`
            INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description)
            VALUES (?, 'Penalty Engine', 'system', 'PENALTY_ACCRUED', ?)
          `).run(
            rental.id,
            `Automated late penalty triggered for ${rental.product_name} (${rental.rental_code}): ${penaltyCalc.delayHours}h delay (${penaltyCalc.feeMode} mode). Penalty: $${penaltyCalc.latePenaltyFee.toFixed(2)}. Penalty Invoice: ${penaltyInvoiceNum || 'N/A'}.`
          );
        }

        updatedCount++;
      }
    }
  }

  return { updated: updatedCount, simulatedNow: now.toISOString() };
}

/**
 * Reconciles deposit escrow against accrued late penalties and damage fees.
 */
function calculateDepositSettlement(originalDeposit, latePenaltyFee = 0, damageFee = 0, dailyRate = 0) {
  const deposit = Number(originalDeposit || 0);
  const late = Number(latePenaltyFee || 0);
  const damage = Number(damageFee || 0);

  const totalDeductions = Math.round((late + damage) * 100) / 100;
  const refundAmount = Math.max(0, Math.round((deposit - totalDeductions) * 100) / 100);
  const outstandingBalance = Math.max(0, Math.round((totalDeductions - deposit) * 100) / 100);

  let depositStatus = 'REFUNDED';
  if (refundAmount === 0 && totalDeductions > 0) {
    depositStatus = 'FORFEITED';
  } else if (refundAmount < deposit) {
    depositStatus = 'PARTIALLY_REFUNDED';
  }

  return {
    originalDeposit: deposit,
    latePenaltyFee: late,
    damageFee: damage,
    totalDeductions,
    refundAmount,
    outstandingBalance,
    depositStatus
  };
}

function calculateInspectionSettlement(rentalId, damageFeeInput = 0, conditionGrade = 'Pristine', notes = '', inspectorName = 'Inspector') {
  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(rentalId);
  if (!rental) {
    throw new Error('Rental not found');
  }

  const settlement = calculateDepositSettlement(
    rental.deposit_amount,
    rental.late_penalty_fee,
    damageFeeInput,
    rental.daily_rate
  );

  return {
    rentalId,
    ...settlement,
    conditionGrade,
    inspectorName,
    notes
  };
}

module.exports = {
  evaluateRentals,
  calculateRentalPenalty,
  calculateDepositSettlement,
  calculateInspectionSettlement
};
