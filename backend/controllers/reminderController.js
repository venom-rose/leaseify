// backend/controllers/reminderController.js - Automatic Customer Reminders & Lifecycle Communications
const { db } = require('../config/database');

function triggerAutoReminders() {
  const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get() || {};
  const offset = config.simulated_days_offset || 0;
  const now = new Date();
  now.setDate(now.getDate() + offset);

  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const rentals = db.prepare(`
    SELECT r.*, p.name as product_name, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
  `).all();

  let generatedCount = 0;

  rentals.forEach(r => {
    // 1. 24h Pre-Pickup QR Pass Reminder
    if (r.start_date === tomorrowStr && r.status === 'READY_FOR_PICKUP') {
      const exists = db.prepare("SELECT id FROM customer_reminders WHERE rental_id = ? AND reminder_type = 'PRE_PICKUP_24H'").get(r.id);
      if (!exists) {
        db.prepare(`
          INSERT INTO customer_reminders (rental_id, user_id, reminder_type, channel, status, scheduled_time, sent_at, message_body)
          VALUES (?, ?, 'PRE_PICKUP_24H', 'SMS', 'SENT', ?, ?, ?)
        `).run(
          r.id, r.user_id,
          now.toISOString(), now.toISOString(),
          `[Leaseify Premier] Hi ${r.customer_name}! Your ${r.product_name} pickup is tomorrow (${r.start_date}). QR Staging Pass: QR-PKUP-${r.rental_code.replace('RNT-', '')}-${r.id}. View digital pass at http://localhost:3000`
        );
        generatedCount++;
      }
    }

    // 2. Pre-Return 2h Schedule Reminder
    if (r.end_date === todayStr && r.status === 'ACTIVE') {
      const exists = db.prepare("SELECT id FROM customer_reminders WHERE rental_id = ? AND reminder_type = 'PRE_RETURN_2H'").get(r.id);
      if (!exists) {
        db.prepare(`
          INSERT INTO customer_reminders (rental_id, user_id, reminder_type, channel, status, scheduled_time, sent_at, message_body)
          VALUES (?, ?, 'PRE_RETURN_2H', 'SMS', 'SENT', ?, ?, ?)
        `).run(
          r.id, r.user_id,
          now.toISOString(), now.toISOString(),
          `[Leaseify Dispatch] Hi ${r.customer_name}, your ${r.product_name} is scheduled for return today at Leaseify Lounge (${config.pickup_location || 'Sunset Blvd'}). Escrow deposit will be released upon check-in.`
        );
        generatedCount++;
      }
    }

    // 3. Overdue Urgent Alert & Deposit Lock Warning
    if (r.status === 'OVERDUE') {
      const exists = db.prepare("SELECT id FROM customer_reminders WHERE rental_id = ? AND reminder_type = 'OVERDUE_WARNING'").get(r.id);
      if (!exists) {
        db.prepare(`
          INSERT INTO customer_reminders (rental_id, user_id, reminder_type, channel, status, scheduled_time, sent_at, message_body)
          VALUES (?, ?, 'OVERDUE_WARNING', 'SMS', 'SENT', ?, ?, ?)
        `).run(
          r.id, r.user_id,
          now.toISOString(), now.toISOString(),
          `[URGENT LEASEIFY ALERT] Your rental for ${r.product_name} (${r.rental_code}) is OVERDUE by ${r.late_days_count || 1} day(s). Late fee accruing. Escrow deposit lock: $${r.deposit_amount}. Return immediately to avoid legal escalation.`
        );
        generatedCount++;
      }
    }
  });

  return generatedCount;
}

function getReminders() {
  triggerAutoReminders();

  const reminders = db.prepare(`
    SELECT cr.*, r.rental_code, r.start_date, r.end_date, p.name as product_name, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
    FROM customer_reminders cr
    JOIN rentals r ON cr.rental_id = r.id
    JOIN products p ON r.product_id = p.id
    JOIN users u ON cr.user_id = u.id
    ORDER BY cr.created_at DESC
  `).all();

  const queuedCount = reminders.filter(m => m.status === 'QUEUED').length;
  const sentCount = reminders.filter(m => m.status === 'SENT').length;

  return {
    status: 200,
    data: {
      metrics: {
        total_communications: reminders.length,
        sent_count: sentCount,
        queued_count: queuedCount
      },
      reminders
    }
  };
}

function sendManualReminder(body) {
  const { rental_id, channel = 'SMS', custom_message } = body;
  const rental = db.prepare(`
    SELECT r.*, p.name as product_name, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(rental_id);

  if (!rental) {
    return { status: 404, data: { error: 'Rental not found' } };
  }

  const nowStr = new Date().toISOString();
  const messageBody = custom_message || `[Leaseify Customer Service] Hi ${rental.customer_name}, notice regarding your ${rental.product_name} booking (${rental.rental_code}). Concierge Desk: concierge@leaseify.io`;

  const info = db.prepare(`
    INSERT INTO customer_reminders (rental_id, user_id, reminder_type, channel, status, scheduled_time, sent_at, message_body)
    VALUES (?, ?, 'MANUAL_DISPATCH', ?, 'SENT', ?, ?, ?)
  `).run(rental.id, rental.user_id, channel, nowStr, nowStr, messageBody);

  return {
    status: 200,
    data: {
      message: `Reminder sent to ${rental.customer_name} via ${channel}`,
      reminder_id: info.lastInsertRowid
    }
  };
}

module.exports = {
  triggerAutoReminders,
  getReminders,
  sendManualReminder
};
