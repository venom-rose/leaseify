// backend/controllers/configController.js - Fleet Policies & Automated Late Return Configurations
const { db } = require('../config/database');
const { evaluateRentals } = require('../services/penaltyEngine');

function getConfig() {
  const row = db.prepare('SELECT * FROM system_config WHERE id = 1').get();
  return { status: 200, data: row };
}

function updateConfig(payload) {
  const {
    late_fee_mode = 'DAILY',
    late_fee_hourly_rate = 65.0,
    late_fee_daily_multiplier = 1.5,
    late_fee_weekly_rate = 2500.0,
    late_fee_monthly_rate = 8500.0,
    grace_period_hours = 4,
    max_penalty_limit = 5000.0,
    auto_generate_penalty_invoice = 1,
    deposit_percentage_default = 20.0,
    min_rental_days = 1,
    max_rental_days = 30,
    pickup_location = 'Leaseify Executive Lounge, 850 Sunset Blvd, West Hollywood'
  } = payload;

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  db.prepare(`
    UPDATE system_config SET
      late_fee_mode = ?,
      late_fee_hourly_rate = ?,
      late_fee_daily_multiplier = ?,
      late_fee_weekly_rate = ?,
      late_fee_monthly_rate = ?,
      grace_period_hours = ?,
      max_penalty_limit = ?,
      auto_generate_penalty_invoice = ?,
      deposit_percentage_default = ?,
      min_rental_days = ?,
      max_rental_days = ?,
      pickup_location = ?,
      updated_at = ?
    WHERE id = 1
  `).run(
    late_fee_mode,
    Number(late_fee_hourly_rate),
    Number(late_fee_daily_multiplier),
    Number(late_fee_weekly_rate),
    Number(late_fee_monthly_rate),
    Number(grace_period_hours),
    Number(max_penalty_limit),
    auto_generate_penalty_invoice ? 1 : 0,
    Number(deposit_percentage_default),
    Number(min_rental_days),
    Number(max_rental_days),
    pickup_location,
    nowStr
  );

  // Immediately re-evaluate active fleet rentals with the updated policy parameters
  evaluateRentals();

  const updated = db.prepare('SELECT * FROM system_config WHERE id = 1').get();
  return { status: 200, data: { message: 'Late Return Policy & Fleet Engine Configuration updated successfully', config: updated } };
}

function simulateDaysOffset(offsetDays) {
  const days = parseInt(offsetDays, 10) || 0;
  db.prepare('UPDATE system_config SET simulated_days_offset = ? WHERE id = 1').run(days);

  // Re-evaluate rentals with new simulated time offset
  const evalResult = evaluateRentals();

  const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get();

  return {
    status: 200,
    data: {
      message: `Time Machine simulated ${days >= 0 ? '+' : ''}${days} day(s) offset successfully`,
      simulated_days_offset: days,
      simulated_now: evalResult.simulatedNow,
      rentals_overdue_updated: evalResult.updated,
      config
    }
  };
}

module.exports = {
  getConfig,
  updateConfig,
  simulateDaysOffset
};
