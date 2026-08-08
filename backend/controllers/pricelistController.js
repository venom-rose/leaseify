// backend/controllers/pricelistController.js - Dynamic Pricelist, Condition Rules & Time-Based Pricing Engine
const { db } = require('../config/database');

function getPricelists() {
  const pricelists = db.prepare('SELECT * FROM pricelists ORDER BY is_default DESC, id ASC').all();
  return { status: 200, data: pricelists };
}

function getPricelistById(id) {
  const pricelist = db.prepare('SELECT * FROM pricelists WHERE id = ?').get(id);
  if (!pricelist) {
    return { status: 404, data: { error: 'Pricelist not found' } };
  }
  return { status: 200, data: pricelist };
}

function createPricelist(body) {
  const {
    name,
    code,
    is_default = 0,
    condition_type = 'GENERAL',
    discount_percent = 0,
    weekend_multiplier = 1.0,
    min_days = 1,
    time_tier_1d_discount = 0,
    time_tier_3d_discount = 5.0,
    time_tier_7d_discount = 15.0,
    time_tier_30d_discount = 25.0,
    valid_from = null,
    valid_to = null,
    applicable_category_id = null,
    description = ''
  } = body;

  if (!name || !code) {
    return { status: 400, data: { error: 'Pricelist name and unique code are required.' } };
  }

  // If set as default, reset other default pricelists
  if (is_default) {
    db.prepare('UPDATE pricelists SET is_default = 0').run();
  }

  const insert = db.prepare(`
    INSERT INTO pricelists (
      name, code, is_default, condition_type, discount_percent, weekend_multiplier,
      min_days, time_tier_1d_discount, time_tier_3d_discount, time_tier_7d_discount, time_tier_30d_discount,
      valid_from, valid_to, applicable_category_id, description, is_active
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 1
    )
  `);

  const result = insert.run(
    name.trim(),
    code.trim().toUpperCase(),
    is_default ? 1 : 0,
    condition_type,
    Number(discount_percent),
    Number(weekend_multiplier),
    Number(min_days),
    Number(time_tier_1d_discount),
    Number(time_tier_3d_discount),
    Number(time_tier_7d_discount),
    Number(time_tier_30d_discount),
    valid_from || null,
    valid_to || null,
    applicable_category_id || null,
    description.trim()
  );

  const newId = result.lastInsertRowid;
  if (is_default) {
    db.prepare('UPDATE system_config SET default_pricelist_id = ? WHERE id = 1').run(newId);
  }

  return { status: 201, data: getPricelistById(newId).data };
}

function updatePricelist(id, body) {
  const existing = db.prepare('SELECT * FROM pricelists WHERE id = ?').get(id);
  if (!existing) {
    return { status: 404, data: { error: 'Pricelist not found' } };
  }

  const {
    name = existing.name,
    code = existing.code,
    is_default = existing.is_default,
    condition_type = existing.condition_type,
    discount_percent = existing.discount_percent,
    weekend_multiplier = existing.weekend_multiplier,
    min_days = existing.min_days,
    time_tier_1d_discount = existing.time_tier_1d_discount,
    time_tier_3d_discount = existing.time_tier_3d_discount,
    time_tier_7d_discount = existing.time_tier_7d_discount,
    time_tier_30d_discount = existing.time_tier_30d_discount,
    valid_from = existing.valid_from,
    valid_to = existing.valid_to,
    applicable_category_id = existing.applicable_category_id,
    description = existing.description,
    is_active = existing.is_active
  } = body;

  if (is_default) {
    db.prepare('UPDATE pricelists SET is_default = 0').run();
    db.prepare('UPDATE system_config SET default_pricelist_id = ? WHERE id = 1').run(id);
  }

  db.prepare(`
    UPDATE pricelists SET
      name = ?, code = ?, is_default = ?, condition_type = ?, discount_percent = ?,
      weekend_multiplier = ?, min_days = ?, time_tier_1d_discount = ?, time_tier_3d_discount = ?,
      time_tier_7d_discount = ?, time_tier_30d_discount = ?, valid_from = ?, valid_to = ?,
      applicable_category_id = ?, description = ?, is_active = ?
    WHERE id = ?
  `).run(
    name, code, is_default ? 1 : 0, condition_type, Number(discount_percent),
    Number(weekend_multiplier), Number(min_days), Number(time_tier_1d_discount), Number(time_tier_3d_discount),
    Number(time_tier_7d_discount), Number(time_tier_30d_discount), valid_from || null, valid_to || null,
    applicable_category_id || null, description, is_active ? 1 : 0,
    id
  );

  return { status: 200, data: getPricelistById(id).data };
}

function setDefaultPricelist(id) {
  const pricelist = db.prepare('SELECT * FROM pricelists WHERE id = ?').get(id);
  if (!pricelist) {
    return { status: 404, data: { error: 'Pricelist not found' } };
  }

  db.prepare('UPDATE pricelists SET is_default = 0').run();
  db.prepare('UPDATE pricelists SET is_default = 1 WHERE id = ?').run(id);
  db.prepare('UPDATE system_config SET default_pricelist_id = ? WHERE id = 1').run(id);

  return { status: 200, data: { message: `Pricelist '${pricelist.name}' is now the default pricelist for all products.` } };
}

/**
 * Universal Price Calculation Engine
 * Resolves base rates, variant overrides, pricelist conditions, and time-based duration discount brackets.
 */
function calculatePrice(params) {
  const {
    product_id,
    variant_id = null,
    duration_days = 1,
    start_date = null,
    pricelist_id = null,
    membership_tier = null
  } = params;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return { status: 404, data: { error: 'Product not found' } };
  }

  // 1. Resolve Variant or Product Base Daily Rate & Deposit
  let baseDaily = product.daily_rate;
  let depositAmount = product.deposit_amount;
  let variantName = 'Standard Specification';
  let variantColor = product.color;
  let variantSize = product.size;

  if (variant_id) {
    const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variant_id);
    if (variant) {
      baseDaily = variant.daily_rate_override || product.daily_rate;
      depositAmount = variant.deposit_amount_override || product.deposit_amount;
      variantName = variant.variant_name;
      variantColor = variant.color;
      variantSize = variant.size;
    }
  }

  // 2. Resolve Applicable Pricelist (Explicit > Membership Tier Condition > Default Global)
  let appliedPricelist = null;

  if (pricelist_id) {
    appliedPricelist = db.prepare('SELECT * FROM pricelists WHERE id = ? AND is_active = 1').get(pricelist_id);
  }

  if (!appliedPricelist && membership_tier && (membership_tier.includes('Black Card') || membership_tier.includes('Elite'))) {
    appliedPricelist = db.prepare('SELECT * FROM pricelists WHERE condition_type = "CUSTOMER_TIER" AND is_active = 1 LIMIT 1').get();
  }

  if (!appliedPricelist) {
    appliedPricelist = db.prepare('SELECT * FROM pricelists WHERE is_default = 1 AND is_active = 1 LIMIT 1').get() ||
      db.prepare('SELECT * FROM pricelists WHERE id = 1').get();
  }

  const days = Math.max(1, parseInt(duration_days, 10) || 1);

  // 3. Time-Based Duration Discount Calculation
  let durationDiscountPct = 0;
  let timeTierLabel = '1-2 Days (Standard Daily)';

  if (days >= 30) {
    durationDiscountPct = appliedPricelist?.time_tier_30d_discount ?? 25.0;
    timeTierLabel = '30+ Days (Monthly Executive Lease)';
  } else if (days >= 7) {
    durationDiscountPct = appliedPricelist?.time_tier_7d_discount ?? 15.0;
    timeTierLabel = '7-29 Days (Weekly Grand Tourer)';
  } else if (days >= 3) {
    durationDiscountPct = appliedPricelist?.time_tier_3d_discount ?? 5.0;
    timeTierLabel = '3-6 Days (Multi-Day Escape)';
  } else {
    durationDiscountPct = appliedPricelist?.time_tier_1d_discount ?? 0;
    timeTierLabel = '1-2 Days (Standard Rate)';
  }

  // 4. Weekend Multiplier check (if booking covers Friday/Saturday/Sunday)
  let weekendMultiplierApplied = 1.0;
  if (start_date && appliedPricelist && appliedPricelist.weekend_multiplier > 1.0) {
    const startDay = new Date(start_date).getDay();
    // 5 = Friday, 6 = Saturday, 0 = Sunday
    if (startDay === 5 || startDay === 6 || startDay === 0) {
      weekendMultiplierApplied = appliedPricelist.weekend_multiplier;
    }
  }

  // 5. Total Pricelist Discount
  const conditionDiscount = appliedPricelist ? appliedPricelist.discount_percent : 0;
  const netDiscountPct = Math.min(80, durationDiscountPct + (conditionDiscount > 0 ? conditionDiscount : 0));

  const effectiveDailyRate = Math.round((baseDaily * (1 - (netDiscountPct / 100)) * weekendMultiplierApplied) * 100) / 100;
  const baseRentalSubtotal = Math.round((effectiveDailyRate * days) * 100) / 100;
  const standardUndiscountedSubtotal = Math.round((baseDaily * days) * 100) / 100;
  const totalSavings = Math.max(0, Math.round((standardUndiscountedSubtotal - baseRentalSubtotal) * 100) / 100);

  return {
    status: 200,
    data: {
      product_id: product.id,
      product_name: product.name,
      brand: product.brand,
      manufacturer: product.manufacturer,
      variant_name: variantName,
      color: variantColor,
      size: variantSize,
      catalog_daily_rate: product.daily_rate,
      base_daily_rate: baseDaily,
      effective_daily_rate: effectiveDailyRate,
      duration_days: days,
      time_tier_label: timeTierLabel,
      time_tier_discount_percent: durationDiscountPct,
      condition_discount_percent: conditionDiscount,
      total_discount_percent: netDiscountPct,
      weekend_multiplier: weekendMultiplierApplied,
      standard_subtotal: standardUndiscountedSubtotal,
      base_rental_subtotal: baseRentalSubtotal,
      total_savings: totalSavings,
      deposit_amount: depositAmount,
      pricelist: appliedPricelist ? {
        id: appliedPricelist.id,
        name: appliedPricelist.name,
        code: appliedPricelist.code,
        condition_type: appliedPricelist.condition_type,
        is_default: Boolean(appliedPricelist.is_default)
      } : null
    }
  };
}

function getRentalPeriodPresets() {
  const presets = db.prepare('SELECT * FROM rental_period_presets ORDER BY duration_days ASC').all();
  return { status: 200, data: presets };
}

function createRentalPeriodPreset(body) {
  const { name, code, duration_days, discount_percent = 0, badge_tag = 'Popular', description = '' } = body;
  if (!name || !code || !duration_days) {
    return { status: 400, data: { error: 'Name, code, and duration days are required.' } };
  }

  const insert = db.prepare(`
    INSERT INTO rental_period_presets (name, code, duration_days, discount_percent, badge_tag, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const res = insert.run(name.trim(), code.trim().toUpperCase(), parseInt(duration_days, 10), Number(discount_percent), badge_tag, description);
  const created = db.prepare('SELECT * FROM rental_period_presets WHERE id = ?').get(res.lastInsertRowid);
  return { status: 201, data: created };
}

module.exports = {
  getPricelists,
  getPricelistById,
  createPricelist,
  updatePricelist,
  setDefaultPricelist,
  calculatePrice,
  getRentalPeriodPresets,
  createRentalPeriodPreset
};
