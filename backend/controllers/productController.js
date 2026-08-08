// backend/controllers/productController.js - Product Catalog with Attributes & Variants Support
const { db } = require('../config/database');

function getCategories() {
  const rows = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  return { status: 200, data: rows };
}

function getProducts(categoryId = null) {
  let query = 'SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id';
  const params = [];

  if (categoryId && categoryId !== 'all') {
    query += ' WHERE p.category_id = ?';
    params.push(categoryId);
  }

  query += ' ORDER BY p.id ASC';
  const products = db.prepare(query).all(...params);

  // Fetch all variants for each product
  const allVariants = db.prepare('SELECT * FROM product_variants ORDER BY is_default DESC, id ASC').all();

  const formatted = products.map(p => {
    const variants = allVariants.filter(v => v.product_id === p.id);
    return {
      ...p,
      features: p.features ? JSON.parse(p.features) : [],
      accessories_included: p.accessories_included ? JSON.parse(p.accessories_included) : [],
      variants: variants.length > 0 ? variants : [
        {
          id: `def-${p.id}`,
          product_id: p.id,
          sku: `SKU-${p.id}-STD`,
          variant_name: `${p.name} (Standard Specification)`,
          brand: p.brand,
          manufacturer: p.manufacturer || 'OEM Factory',
          color: p.color || 'Obsidian Black',
          color_hex: '#f59e0b',
          size: p.size || 'Standard Spec',
          trim_package: 'Factory Standard Performance',
          daily_rate_override: p.daily_rate,
          deposit_amount_override: p.deposit_amount,
          stock_count: p.total_stock,
          available_stock: p.available_stock,
          image_override: p.image,
          is_default: 1
        }
      ]
    };
  });

  return { status: 200, data: formatted };
}

function getProductById(id) {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(id);

  if (!product) {
    return { status: 404, data: { error: 'Vehicle not found' } };
  }

  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY is_default DESC, id ASC').all(id);

  return {
    status: 200,
    data: {
      ...product,
      features: product.features ? JSON.parse(product.features) : [],
      accessories_included: product.accessories_included ? JSON.parse(product.accessories_included) : [],
      variants: variants.length > 0 ? variants : [
        {
          id: `def-${product.id}`,
          product_id: product.id,
          sku: `SKU-${product.id}-STD`,
          variant_name: `${product.name} (Standard Specification)`,
          brand: product.brand,
          manufacturer: product.manufacturer || 'OEM Factory',
          color: product.color || 'Obsidian Black',
          color_hex: '#f59e0b',
          size: product.size || 'Standard Spec',
          trim_package: 'Factory Standard Performance',
          daily_rate_override: product.daily_rate,
          deposit_amount_override: product.deposit_amount,
          stock_count: product.total_stock,
          available_stock: product.available_stock,
          image_override: product.image,
          is_default: 1
        }
      ]
    }
  };
}

function createProduct(body) {
  const {
    name,
    category_id,
    brand,
    manufacturer = 'OEM Factory',
    color = 'Obsidian Black',
    size = 'Standard Spec',
    model = '',
    image,
    daily_rate,
    weekly_rate,
    deposit_type = 'FIXED',
    deposit_rate = 1000.0,
    deposit_amount,
    replacement_value = 150000.0,
    total_stock = 1,
    condition_status = 'Pristine',
    description = '',
    features = [],
    accessories_included = [],
    serial_number = '',
    top_speed = '300 km/h',
    acceleration = '3.2s (0-100)',
    horsepower = '500 HP',
    fuel_type = 'Premium 98',
    variants = []
  } = body;

  if (!name || !category_id || !brand || !daily_rate) {
    return { status: 400, data: { error: 'Name, category, brand, and daily rate are required.' } };
  }

  const effectiveDepositAmount = deposit_amount || (deposit_type === 'PERCENTAGE' ? (daily_rate * 3 * (deposit_rate / 100)) : deposit_rate);
  const effectiveWeekly = weekly_rate || (daily_rate * 7 * 0.85);

  const insert = db.prepare(`
    INSERT INTO products (
      name, category_id, brand, manufacturer, color, size, model, image, daily_rate, weekly_rate,
      deposit_type, deposit_rate, deposit_amount, replacement_value, total_stock, available_stock,
      condition_status, description, features, accessories_included, serial_number,
      top_speed, acceleration, horsepower, fuel_type
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const result = insert.run(
    name.trim(),
    category_id,
    brand.trim(),
    manufacturer.trim(),
    color.trim(),
    size.trim(),
    model ? model.trim() : null,
    image || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200',
    Number(daily_rate),
    Number(effectiveWeekly),
    deposit_type,
    Number(deposit_rate),
    Number(effectiveDepositAmount),
    Number(replacement_value),
    Number(total_stock),
    Number(total_stock),
    condition_status,
    description.trim(),
    JSON.stringify(features),
    JSON.stringify(accessories_included),
    serial_number || `VIN-${brand.toUpperCase().substring(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
    top_speed,
    acceleration,
    horsepower,
    fuel_type
  );

  const productId = result.lastInsertRowid;

  // Insert default variant
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (
      product_id, sku, variant_name, brand, manufacturer, color, color_hex, size, trim_package,
      daily_rate_override, deposit_amount_override, stock_count, available_stock, image_override, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  if (variants && variants.length > 0) {
    for (const v of variants) {
      insertVariant.run(
        productId,
        v.sku || `SKU-${productId}-${Math.floor(100 + Math.random() * 900)}`,
        v.variant_name || `${name} (${v.color || color})`,
        brand,
        manufacturer,
        v.color || color,
        v.color_hex || '#f59e0b',
        v.size || size,
        v.trim_package || 'Performance Spec',
        v.daily_rate_override ? Number(v.daily_rate_override) : Number(daily_rate),
        v.deposit_amount_override ? Number(v.deposit_amount_override) : Number(effectiveDepositAmount),
        v.stock_count || 1,
        v.available_stock || 1,
        v.image_override || image,
        v.is_default ? 1 : 0
      );
    }
  } else {
    insertVariant.run(
      productId,
      `SKU-${productId}-STD`,
      `${name} (${color})`,
      brand,
      manufacturer,
      color,
      '#f59e0b',
      size,
      'Standard Performance Spec',
      Number(daily_rate),
      Number(effectiveDepositAmount),
      Number(total_stock),
      Number(total_stock),
      image,
      1
    );
  }

  const created = getProductById(productId);
  return { status: 201, data: created.data };
}

function updateProduct(id, body) {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return { status: 404, data: { error: 'Product not found' } };
  }

  const {
    name = existing.name,
    category_id = existing.category_id,
    brand = existing.brand,
    manufacturer = existing.manufacturer,
    color = existing.color,
    size = existing.size,
    model = existing.model,
    image = existing.image,
    daily_rate = existing.daily_rate,
    weekly_rate = existing.weekly_rate,
    deposit_type = existing.deposit_type,
    deposit_rate = existing.deposit_rate,
    deposit_amount = existing.deposit_amount,
    replacement_value = existing.replacement_value,
    total_stock = existing.total_stock,
    condition_status = existing.condition_status,
    description = existing.description,
    features = null,
    accessories_included = null,
    serial_number = existing.serial_number,
    top_speed = existing.top_speed,
    acceleration = existing.acceleration,
    horsepower = existing.horsepower,
    fuel_type = existing.fuel_type
  } = body;

  db.prepare(`
    UPDATE products SET
      name = ?, category_id = ?, brand = ?, manufacturer = ?, color = ?, size = ?, model = ?,
      image = ?, daily_rate = ?, weekly_rate = ?, deposit_type = ?, deposit_rate = ?, deposit_amount = ?,
      replacement_value = ?, total_stock = ?, condition_status = ?, description = ?,
      features = COALESCE(?, features), accessories_included = COALESCE(?, accessories_included),
      serial_number = ?, top_speed = ?, acceleration = ?, horsepower = ?, fuel_type = ?
    WHERE id = ?
  `).run(
    name, category_id, brand, manufacturer, color, size, model,
    image, Number(daily_rate), Number(weekly_rate), deposit_type, Number(deposit_rate), Number(deposit_amount),
    Number(replacement_value), Number(total_stock), condition_status, description,
    features ? JSON.stringify(features) : null,
    accessories_included ? JSON.stringify(accessories_included) : null,
    serial_number, top_speed, acceleration, horsepower, fuel_type,
    id
  );

  const updated = getProductById(id);
  return { status: 200, data: updated.data };
}

// Product Variant CRUD
function createProductVariant(productId, body) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) {
    return { status: 404, data: { error: 'Product not found' } };
  }

  const {
    sku,
    variant_name,
    color,
    color_hex = '#f59e0b',
    size = product.size,
    trim_package = 'Custom Performance Trim',
    daily_rate_override,
    deposit_amount_override,
    stock_count = 1,
    image_override,
    is_default = 0
  } = body;

  if (!variant_name || !color) {
    return { status: 400, data: { error: 'Variant name and color are required.' } };
  }

  const uniqueSku = sku || `SKU-${productId}-${color.toUpperCase().substring(0, 3)}-${Math.floor(100 + Math.random() * 900)}`;

  const result = db.prepare(`
    INSERT INTO product_variants (
      product_id, sku, variant_name, brand, manufacturer, color, color_hex, size, trim_package,
      daily_rate_override, deposit_amount_override, stock_count, available_stock, image_override, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    productId,
    uniqueSku,
    variant_name,
    product.brand,
    product.manufacturer,
    color,
    color_hex,
    size,
    trim_package,
    daily_rate_override ? Number(daily_rate_override) : product.daily_rate,
    deposit_amount_override ? Number(deposit_amount_override) : product.deposit_amount,
    Number(stock_count),
    Number(stock_count),
    image_override || product.image,
    is_default ? 1 : 0
  );

  const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(result.lastInsertRowid);
  return { status: 201, data: variant };
}

function updateProductVariant(variantId, body) {
  const existing = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId);
  if (!existing) {
    return { status: 404, data: { error: 'Variant not found' } };
  }

  const {
    variant_name = existing.variant_name,
    color = existing.color,
    color_hex = existing.color_hex,
    size = existing.size,
    trim_package = existing.trim_package,
    daily_rate_override = existing.daily_rate_override,
    deposit_amount_override = existing.deposit_amount_override,
    stock_count = existing.stock_count,
    available_stock = existing.available_stock,
    image_override = existing.image_override,
    is_default = existing.is_default
  } = body;

  db.prepare(`
    UPDATE product_variants SET
      variant_name = ?, color = ?, color_hex = ?, size = ?, trim_package = ?,
      daily_rate_override = ?, deposit_amount_override = ?, stock_count = ?,
      available_stock = ?, image_override = ?, is_default = ?
    WHERE id = ?
  `).run(
    variant_name, color, color_hex, size, trim_package,
    Number(daily_rate_override), Number(deposit_amount_override), Number(stock_count),
    Number(available_stock), image_override, is_default ? 1 : 0,
    variantId
  );

  const updated = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId);
  return { status: 200, data: updated };
}

function deleteProductVariant(variantId) {
  db.prepare('DELETE FROM product_variants WHERE id = ?').run(variantId);
  return { status: 200, data: { message: 'Variant deleted successfully' } };
}

module.exports = {
  getCategories,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant
};
