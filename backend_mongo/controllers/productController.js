const Product = require('../models/Product');

// @desc    Get all inventory products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create new inventory product
// @route   POST /api/products
// @access  Public
exports.createProduct = async (req, res) => {
  try {
    const { name, category, pricePerDay, availability } = req.body;
    const product = await Product.create({
      name,
      category,
      pricePerDay,
      availability: availability !== undefined ? availability : true
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
