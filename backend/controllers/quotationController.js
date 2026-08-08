// backend/controllers/quotationController.js - Offline Quotations, Templates & Conversion to Invoices
const { db } = require('../config/database');

function getQuotations(searchParams) {
  const status = searchParams?.get ? searchParams.get('status') : (searchParams?.status || null);
  const search = searchParams?.get ? searchParams.get('search') : (searchParams?.search || null);

  let query = `
    SELECT q.*,
           p.name as product_name, p.image as product_image, p.brand as product_brand, p.serial_number as product_serial,
           pl.name as pricelist_name, pl.discount_percent as pricelist_discount
    FROM quotations q
    JOIN products p ON q.product_id = p.id
    LEFT JOIN pricelists pl ON q.pricelist_id = pl.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'ALL') {
    query += ` AND q.status = ?`;
    params.push(status);
  }

  if (search) {
    query += ` AND (q.quote_number LIKE ? OR q.customer_name LIKE ? OR q.customer_email LIKE ? OR p.name LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  query += ` ORDER BY q.id DESC`;

  const quotes = db.prepare(query).all(...params);
  return { status: 200, data: quotes };
}

function getQuotationById(idOrNumber) {
  const quote = db.prepare(`
    SELECT q.*,
           p.name as product_name, p.image as product_image, p.brand as product_brand, p.serial_number as product_serial, p.daily_rate as original_daily_rate, p.deposit_amount as original_deposit, p.top_speed, p.horsepower, p.acceleration,
           pl.name as pricelist_name, pl.discount_percent as pricelist_discount,
           r.rental_code, r.invoice_number, r.status as rental_status
    FROM quotations q
    JOIN products p ON q.product_id = p.id
    LEFT JOIN pricelists pl ON q.pricelist_id = pl.id
    LEFT JOIN rentals r ON q.converted_rental_id = r.id
    WHERE q.id = ? OR q.quote_number = ?
  `).get(idOrNumber, idOrNumber);

  if (!quote) {
    return { status: 404, data: { error: 'Quotation not found' } };
  }

  const config = db.prepare('SELECT * FROM system_config WHERE id = 1').get();

  return {
    status: 200,
    data: {
      ...quote,
      system_config: config
    }
  };
}

function createQuotation(body) {
  const {
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    product_id,
    start_date,
    end_date,
    pricelist_id,
    custom_daily_rate,
    fulfillment_type,
    delivery_address,
    delivery_fee,
    valid_until,
    notes
  } = body;

  if (!customer_name || !customer_email || !product_id || !start_date || !end_date) {
    return { status: 400, data: { error: 'Customer name, email, product, and dates are required.' } };
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return { status: 404, data: { error: 'Vehicle not found' } };
  }

  const s = new Date(start_date);
  const e = new Date(end_date);
  const diffTime = e.getTime() - s.getTime();
  const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let ratePerDay = custom_daily_rate ? Number(custom_daily_rate) : product.daily_rate;

  // Apply pricelist discount if selected
  if (pricelist_id) {
    const pl = db.prepare('SELECT * FROM pricelists WHERE id = ?').get(pricelist_id);
    if (pl && pl.discount_percent > 0 && !custom_daily_rate) {
      ratePerDay = Math.round(product.daily_rate * (1 - pl.discount_percent / 100) * 100) / 100;
    }
  }

  const baseRentalFee = durationDays * ratePerDay;
  const depositAmount = product.deposit_amount;
  const delivFee = fulfillment_type === 'DELIVERY' ? Number(delivery_fee !== undefined ? delivery_fee : 150.0) : 0.0;
  const totalQuoted = baseRentalFee + depositAmount + delivFee;

  const quoteNum = `QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  // Default validity: 7 days from now
  const defaultValid = new Date();
  defaultValid.setDate(defaultValid.getDate() + 7);
  const validityDate = valid_until || defaultValid.toISOString().split('T')[0];

  const stmt = db.prepare(`
    INSERT INTO quotations (
      quote_number, customer_name, customer_email, customer_phone, customer_address,
      product_id, start_date, end_date, duration_days, pricelist_id, custom_daily_rate,
      base_rental_fee, deposit_amount, delivery_fee, total_quoted, fulfillment_type,
      delivery_address, valid_until, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SENT', ?)
  `);

  const result = stmt.run(
    quoteNum,
    customer_name.trim(),
    customer_email.trim().toLowerCase(),
    customer_phone || '+1 (555) 000-0000',
    customer_address || 'Los Angeles, CA',
    product_id,
    start_date,
    end_date,
    durationDays,
    pricelist_id || null,
    ratePerDay,
    baseRentalFee,
    depositAmount,
    delivFee,
    totalQuoted,
    fulfillment_type || 'PICKUP',
    delivery_address || (fulfillment_type === 'DELIVERY' ? customer_address : 'Leaseify Executive Lounge, 850 Sunset Blvd'),
    validityDate,
    notes || 'VIP offline quotation issued.'
  );

  const created = db.prepare(`
    SELECT q.*, p.name as product_name, p.image as product_image, p.brand as product_brand
    FROM quotations q
    JOIN products p ON q.product_id = p.id
    WHERE q.id = ?
  `).get(result.lastInsertRowid);

  db.prepare(`
    INSERT INTO activity_logs (actor_name, actor_role, action_type, description)
    VALUES ('Sarah Connor', 'admin', 'QUOTATION_CREATED', ?)
  `).run(`Quotation ${quoteNum} issued to ${customer_name} for ${product.name} (Total: $${totalQuoted.toFixed(2)}).`);

  return {
    status: 201,
    data: {
      message: `Quotation ${quoteNum} generated successfully!`,
      quotation: created
    }
  };
}

function convertToInvoice(id, body) {
  const quote = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
  if (!quote) {
    return { status: 404, data: { error: 'Quotation not found' } };
  }

  if (quote.status === 'CONVERTED') {
    return { status: 400, data: { error: 'This quotation has already been converted to an active invoice.' } };
  }

  const { payment_method, actor_name, custom_notes } = body;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(quote.product_id);
  if (!product || product.available_stock <= 0) {
    return { status: 400, data: { error: 'Vehicle is currently unavailable/reserved in fleet stock.' } };
  }

  // Find or create customer user account
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(quote.customer_email);
  if (!user) {
    const { generateSalt, hashPassword } = require('../services/authService');
    const salt = generateSalt();
    const tempPass = 'user123';
    const insUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, salt, role, avatar, address, phone, membership_tier)
      VALUES (?, ?, ?, ?, 'customer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', ?, ?, 'VIP Quoted Member')
    `);
    const userRes = insUser.run(quote.customer_name, quote.customer_email, hashPassword(tempPass, salt), salt, quote.customer_address, quote.customer_phone);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userRes.lastInsertRowid);
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const rentalCode = `RNT-${randomSuffix}`;
  const invoiceNumber = `INV-2026-${randomSuffix}`;
  const nowTimestamp = new Date().toISOString().replace('T', ' ').split('.')[0];

  const insertRental = db.prepare(`
    INSERT INTO rentals (
      rental_code, invoice_number, user_id, product_id, quotation_id, start_date, end_date, duration_days,
      daily_rate, base_rental_fee, deposit_amount, deposit_status, status,
      fulfillment_type, delivery_address, delivery_fee, payment_method, paid_at,
      customer_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'HELD', 'READY_FOR_PICKUP', ?, ?, ?, ?, ?, ?)
  `);

  const rentalResult = insertRental.run(
    rentalCode,
    invoiceNumber,
    user.id,
    quote.product_id,
    quote.id,
    quote.start_date,
    quote.end_date,
    quote.duration_days,
    quote.custom_daily_rate,
    quote.base_rental_fee,
    quote.deposit_amount,
    quote.fulfillment_type,
    quote.delivery_address,
    quote.delivery_fee,
    payment_method || 'CREDIT_CARD',
    nowTimestamp,
    `Converted from Quotation ${quote.quote_number}. ${custom_notes || ''}`
  );

  const rentalId = rentalResult.lastInsertRowid;

  // Update Quotation Status to CONVERTED
  db.prepare(`
    UPDATE quotations SET
      status = 'CONVERTED',
      converted_rental_id = ?
    WHERE id = ?
  `).run(rentalId, quote.id);

  // Decrement product stock
  db.prepare('UPDATE products SET available_stock = MAX(0, available_stock - 1) WHERE id = ?').run(quote.product_id);

  // Log activity
  db.prepare(`
    INSERT INTO activity_logs (rental_id, actor_name, actor_role, action_type, description)
    VALUES (?, ?, 'admin', 'QUOTE_CONVERTED_TO_INVOICE', ?)
  `).run(
    rentalId,
    actor_name || 'Sarah Connor',
    `Quotation ${quote.quote_number} converted to official Invoice ${invoiceNumber}. Payment of $${quote.total_quoted.toFixed(2)} collected ($${quote.deposit_amount.toFixed(2)} deposit held in escrow). Vehicle staged for handover.`
  );

  const createdRental = db.prepare(`
    SELECT r.*, p.name as product_name, p.image as product_image, p.brand as product_brand, u.name as user_name, u.email as user_email
    FROM rentals r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(rentalId);

  return {
    status: 200,
    data: {
      message: `Quotation converted successfully! Invoice ${invoiceNumber} generated.`,
      invoice_number: invoiceNumber,
      rental_code: rentalCode,
      rental: createdRental
    }
  };
}

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  convertToInvoice
};
