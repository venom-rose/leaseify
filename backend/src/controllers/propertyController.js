const Property = require('../models/Property');

// @desc    Get all properties with optional filtering and search
// @route   GET /api/properties
// @access  Public / Private
exports.getProperties = async (req, res, next) => {
  try {
    let queryObj = {};

    // Filter by status
    if (req.query.status && req.query.status !== 'all') {
      queryObj.status = req.query.status;
    }

    // Filter by property type
    if (req.query.type && req.query.type !== 'all') {
      queryObj.type = req.query.type;
    }

    // Search query in title, address.city, address.street
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      queryObj.$or = [
        { title: searchRegex },
        { 'address.street': searchRegex },
        { 'address.city': searchRegex },
        { 'address.state': searchRegex },
      ];
    }

    // Price range
    if (req.query.minRent || req.query.maxRent) {
      queryObj.rentAmount = {};
      if (req.query.minRent) queryObj.rentAmount.$gte = Number(req.query.minRent);
      if (req.query.maxRent) queryObj.rentAmount.$lte = Number(req.query.maxRent);
    }

    const properties = await Property.find(queryObj)
      .populate('currentTenant', 'name email phone avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single property by ID
// @route   GET /api/properties/:id
// @access  Public / Private
exports.getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('currentTenant', 'name email phone avatar')
      .populate('createdBy', 'name email');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property not found with ID ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (Admin only)
exports.createProperty = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;
    const property = await Property.create(req.body);

    res.status(201).json({
      success: true,
      data: property,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Admin only)
exports.updateProperty = async (req, res, next) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property not found with ID ${req.params.id}`,
      });
    }

    property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Admin only)
exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property not found with ID ${req.params.id}`,
      });
    }

    await property.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
