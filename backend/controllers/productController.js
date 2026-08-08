// backend/controllers/productController.js - Multi-Category Rental Marketplace Catalog Controller
const { db } = require('../config/database');

function getCategories() {
  const rows = db.prepare('SELECT * FROM categories ORDER BY parent_category_id ASC, name ASC').all();
  
  // Group main categories and subcategories
  const mainCategories = rows.filter(c => !c.parent_category_id);
  const result = mainCategories.map(main => ({
    ...main,
    subcategories: rows.filter(sub => sub.parent_category_id === main.id)
  }));

  return { status: 200, data: result, raw: rows };
}

function createCategory(body) {
  const { id, parent_category_id = null, name, icon = 'tag', description = '' } = body;
  if (!id || !name) {
    return { status: 400, data: { error: 'Category ID and Name are required.' } };
  }

  const cleanId = id.trim().toLowerCase().replace(/\s+/g, '-');
  db.prepare(`
    INSERT INTO categories (id, parent_category_id, name, icon, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(cleanId, parent_category_id || null, name.trim(), icon, description.trim());

  return { status: 201, data: { id: cleanId, parent_category_id, name, icon, description } };
}

function updateCategory(id, body) {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) {
    return { status: 404, data: { error: 'Category not found' } };
  }

  const { name = existing.name, icon = existing.icon, description = existing.description, parent_category_id = existing.parent_category_id } = body;
  db.prepare(`
    UPDATE categories
    SET name = ?, icon = ?, description = ?, parent_category_id = ?
    WHERE id = ?
  `).run(name.trim(), icon, description.trim(), parent_category_id || null, id);

  return { status: 200, data: { id, name, icon, description, parent_category_id } };
}

function deleteCategory(id) {
  db.prepare('DELETE FROM categories WHERE id = ? OR parent_category_id = ?').run(id, id);
  return { status: 200, data: { message: `Category ${id} deleted` } };
}

function getProducts(categoryId = null, subcategoryId = null) {
  let query = 'SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id';
  const params = [];
  const conditions = [];

  if (categoryId && categoryId !== 'all') {
    conditions.push('p.category_id = ?');
    params.push(categoryId);
  }

  if (subcategoryId && subcategoryId !== 'all') {
    conditions.push('p.subcategory_id = ?');
    params.push(subcategoryId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY p.id ASC';
  const products = db.prepare(query).all(...params);
  const allVariants = db.prepare('SELECT * FROM product_variants ORDER BY is_default DESC, id ASC').all();

  const formatted = products.map(p => {
    const variants = allVariants.filter(v => v.product_id === p.id);
    return {
      ...p,
      features: p.features ? JSON.parse(p.features) : [],
      accessories_included: p.accessories_included ? JSON.parse(p.accessories_included) : [],
      attributes: p.attributes_json ? JSON.parse(p.attributes_json) : {},
      variants: variants.length > 0 ? variants : [
        {
          id: `def-${p.id}`,
          product_id: p.id,
          sku: `SKU-${p.id}-STD`,
          variant_name: `${p.name} (Standard Specification)`,
          brand: p.brand,
          manufacturer: p.manufacturer || 'OEM Factory',
          color: p.color || 'Standard',
          color_hex: '#f59e0b',
          size: p.size || 'Standard Spec',
          trim_package: 'Standard Marketplace Spec',
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
    return { status: 404, data: { error: 'Product not found' } };
  }

  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY is_default DESC, id ASC').all(id);

  return {
    status: 200,
    data: {
      ...product,
      features: product.features ? JSON.parse(product.features) : [],
      accessories_included: product.accessories_included ? JSON.parse(product.accessories_included) : [],
      attributes: product.attributes_json ? JSON.parse(product.attributes_json) : {},
      variants: variants.length > 0 ? variants : [
        {
          id: `def-${product.id}`,
          product_id: product.id,
          sku: `SKU-${product.id}-STD`,
          variant_name: `${product.name} (Standard Specification)`,
          brand: product.brand,
          manufacturer: product.manufacturer || 'OEM Factory',
          color: product.color || 'Standard',
          color_hex: '#f59e0b',
          size: product.size || 'Standard Spec',
          trim_package: 'Standard Marketplace Spec',
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
    subcategory_id = null,
    brand = 'Generic',
    manufacturer = 'OEM Factory',
    color = 'Standard',
    size = 'Standard Spec',
    model = '',
    image,
    hourly_rate = 0,
    daily_rate,
    weekly_rate,
    deposit_type = 'FIXED',
    deposit_rate = 100.0,
    deposit_amount,
    replacement_value = 500.0,
    total_stock = 1,
    condition_status = 'Pristine',
    description = '',
    features = [],
    accessories_included = [],
    attributes = {},
    serial_number = '',
    variants = []
  } = body;

  if (!name || !category_id || !daily_rate) {
    return { status: 400, data: { error: 'Name, category, and daily rate are required.' } };
  }

  const effectiveDepositAmount = deposit_amount || (deposit_type === 'PERCENTAGE' ? (daily_rate * 3 * (deposit_rate / 100)) : deposit_rate);
  const effectiveWeekly = weekly_rate || (daily_rate * 7 * 0.85);

  const insert = db.prepare(`
    INSERT INTO products (
      name, category_id, subcategory_id, brand, manufacturer, color, size, model, image,
      hourly_rate, daily_rate, weekly_rate, deposit_type, deposit_rate, deposit_amount, replacement_value,
      total_stock, available_stock, condition_status, description, features, accessories_included, attributes_json, serial_number
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const result = insert.run(
    name.trim(),
    category_id,
    subcategory_id,
    brand.trim(),
    manufacturer.trim(),
    color.trim(),
    size.trim(),
    model ? model.trim() : null,
    image || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200',
    Number(hourly_rate),
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
    JSON.stringify(attributes),
    serial_number || `SN-${brand.toUpperCase().substring(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  const productId = result.lastInsertRowid;
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
    subcategory_id = existing.subcategory_id,
    brand = existing.brand,
    manufacturer = existing.manufacturer,
    color = existing.color,
    size = existing.size,
    model = existing.model,
    image = existing.image,
    hourly_rate = existing.hourly_rate,
    daily_rate = existing.daily_rate,
    weekly_rate = existing.weekly_rate,
    deposit_type = existing.deposit_type,
    deposit_rate = existing.deposit_rate,
    deposit_amount = existing.deposit_amount,
    replacement_value = existing.replacement_value,
    total_stock = existing.total_stock,
    available_stock = existing.available_stock,
    condition_status = existing.condition_status,
    description = existing.description,
    features = existing.features ? JSON.parse(existing.features) : [],
    accessories_included = existing.accessories_included ? JSON.parse(existing.accessories_included) : [],
    attributes = existing.attributes_json ? JSON.parse(existing.attributes_json) : {},
    serial_number = existing.serial_number
  } = body;

  db.prepare(`
    UPDATE products
    SET name = ?, category_id = ?, subcategory_id = ?, brand = ?, manufacturer = ?, color = ?, size = ?, model = ?, image = ?,
        hourly_rate = ?, daily_rate = ?, weekly_rate = ?, deposit_type = ?, deposit_rate = ?, deposit_amount = ?, replacement_value = ?,
        total_stock = ?, available_stock = ?, condition_status = ?, description = ?, features = ?, accessories_included = ?, attributes_json = ?, serial_number = ?
    WHERE id = ?
  `).run(
    name.trim(), category_id, subcategory_id, brand.trim(), manufacturer.trim(), color.trim(), size.trim(), model ? model.trim() : null, image,
    Number(hourly_rate), Number(daily_rate), Number(weekly_rate), deposit_type, Number(deposit_rate), Number(deposit_amount), Number(replacement_value),
    Number(total_stock), Number(available_stock), condition_status, description.trim(), JSON.stringify(features), JSON.stringify(accessories_included), JSON.stringify(attributes), serial_number,
    id
  );

  return getProductById(id);
}

function deleteProduct(id) {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
  return { status: 200, data: { message: `Product #${id} deleted successfully` } };
}

// Product Variants CRUD
function createProductVariant(productId, body) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return { status: 404, data: { error: 'Parent product not found' } };

  const {
    sku, variant_name, brand = product.brand, manufacturer = product.manufacturer,
    color = product.color, color_hex = '#f59e0b', size = product.size, trim_package = 'Standard Spec',
    daily_rate_override = product.daily_rate, deposit_amount_override = product.deposit_amount,
    stock_count = 1, available_stock = 1, image_override = product.image, is_default = 0
  } = body;

  const generatedSku = sku || `SKU-${productId}-${Math.floor(100 + Math.random() * 900)}`;
  const info = db.prepare(`
    INSERT INTO product_variants (
      product_id, sku, variant_name, brand, manufacturer, color, color_hex, size, trim_package,
      daily_rate_override, deposit_amount_override, stock_count, available_stock, image_override, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    productId, generatedSku, variant_name || `${product.name} (${color})`, brand, manufacturer,
    color, color_hex, size, trim_package, Number(daily_rate_override), Number(deposit_amount_override),
    Number(stock_count), Number(available_stock), image_override, is_default ? 1 : 0
  );

  return { status: 201, data: { id: info.lastInsertRowid, product_id: productId, sku: generatedSku, variant_name } };
}

function deleteProductVariant(variantId) {
  db.prepare('DELETE FROM product_variants WHERE id = ?').run(variantId);
  return { status: 200, data: { message: `Variant #${variantId} deleted successfully` } };
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductVariant,
  deleteProductVariant
};
