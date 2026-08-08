const mongoose = require('mongoose');
const Product = require('../models/Product');

// @desc    Get all rental products with search and filtering
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    // 1. Extract query:
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const sort = req.query.sort || "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;

    // 2. Create filter object:
    let filter = {};

    // 3. Add search logic:
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } }
      ];
    }

    // 4. Add filters:
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }

    if (req.query.location) {
      filter.location = { $regex: req.query.location, $options: "i" };
    }

    // STEP 8: DEBUGGING logs
    console.log('[DEBUG - QUERY]:', req.query);
    console.log('[DEBUG - FILTER]:', filter);

    // Map filter.price to filter.pricePerDay for Product schema compatibility
    let dbFilter = { ...filter };
    if (dbFilter.price) {
      dbFilter.pricePerDay = dbFilter.price;
      delete dbFilter.price;
    }

    // Map sort field 'price' to 'pricePerDay' for Product schema
    let dbSort = sort;
    if (dbSort === 'price') {
      dbSort = 'pricePerDay';
    }

    // STEP 3: PAGINATION LOGIC
    // 1. Calculate skip:
    const skip = (page - 1) * limit;

    // 2. Fetch data:
    const products = await Product.find(dbFilter)
      .sort({ [dbSort]: order })
      .skip(skip)
      .limit(limit);

    // 3. Count total:
    const total = await Product.countDocuments(dbFilter);

    // STEP 4: RESPONSE FORMAT
    res.json({
      success: true,
      data: products,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (err) {
    console.error('[GET PRODUCTS ERROR]:', err);
    next(err);
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error('[GET PRODUCT BY ID ERROR]:', err);
    next(err);
  }
};

// @desc    Create new rental product from multi-step form data
// @route   POST /api/products
// @access  Private (Admin only)
exports.createProduct = async (req, res, next) => {
  try {
    console.log('==================================================');
    console.log('[DEBUG - CREATE PRODUCT] Incoming Payload:', req.body);
    console.log('[DEBUG - CREATE PRODUCT] Auth User:', req.user ? req.user.email : 'No auth user');

    // 1. Extract and normalize fields from Multi-Step Form
    const name = req.body.name?.trim();
    const category = req.body.category || 'Furniture';

    // Step 2: Pricing mapping (support both 'price' and 'pricePerDay', 'deposit' and 'securityDeposit')
    const pricePerDay = Number(req.body.pricePerDay !== undefined ? req.body.pricePerDay : req.body.price);
    const securityDeposit = Number(req.body.securityDeposit !== undefined ? req.body.securityDeposit : (req.body.deposit || 0));

    // Step 3: Availability mapping (support both 'location' and 'stock' / 'stockQuantity')
    const location = req.body.location?.trim() || 'Main Hub / Warehouse';
    const stockQuantity = Number(req.body.stockQuantity !== undefined ? req.body.stockQuantity : (req.body.stock !== undefined ? req.body.stock : 1));

    // Additional optional fields
    const description = req.body.description?.trim() || `${name} (${category}) available for daily rental at ${location}.`;
    const images = req.body.images?.length
      ? req.body.images
      : (req.body.image ? [req.body.image] : ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80']);

    // 2. Validation
    if (!name) {
      console.warn('[DEBUG - CREATE PRODUCT ERROR] Missing product name');
      return res.status(400).json({
        success: false,
        message: 'Step 1 Error: Product name is required.',
      });
    }

    if (isNaN(pricePerDay) || pricePerDay <= 0) {
      console.warn('[DEBUG - CREATE PRODUCT ERROR] Invalid pricePerDay:', pricePerDay);
      return res.status(400).json({
        success: false,
        message: 'Step 2 Error: Price per day must be a valid positive number.',
      });
    }

    // 3. Safe ObjectId check for createdBy
    let createdByUserId = null;
    const rawUserId = req.user?.id || req.user?._id;
    if (rawUserId && mongoose.Types.ObjectId.isValid(rawUserId) && String(rawUserId).length === 24) {
      createdByUserId = rawUserId;
    }

    // 4. Create document in MongoDB
    const product = await Product.create({
      name,
      category,
      pricePerDay,
      securityDeposit: isNaN(securityDeposit) ? 0 : securityDeposit,
      location,
      stockQuantity: isNaN(stockQuantity) ? 1 : stockQuantity,
      description,
      images,
      isAvailable: stockQuantity > 0,
      specifications: req.body.specifications || {
        brand: req.body.brand || '',
        condition: req.body.condition || 'Brand New',
        dimensions: req.body.dimensions || '',
      },
      ...(createdByUserId ? { createdBy: createdByUserId } : {}),
    });

    console.log('[DEBUG - CREATE PRODUCT SUCCESS] Saved to MongoDB with ID:', product._id);
    console.log('==================================================');

    res.status(201).json({
      success: true,
      message: 'Rental product created successfully in MongoDB',
      data: product,
    });
  } catch (err) {
    console.error('[DEBUG - CREATE PRODUCT FAILED]:', err.message);
    console.log('==================================================');
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to save rental product in database',
    });
  }
};

// @desc    Update product details / pricing / deposit / stock
// @route   PUT /api/products/:id
// @access  Private (Admin only)
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID ${req.params.id}`,
      });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID ${req.params.id}`,
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product removed from catalog',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
