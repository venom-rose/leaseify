const Lease = require('../models/Lease');
const Property = require('../models/Property');

// @desc    Get all leases (Admin gets all, Tenant gets own)
// @route   GET /api/leases
// @access  Private
exports.getLeases = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.tenant = req.user.id;
    }

    const leases = await Lease.find(query)
      .populate('property')
      .populate('tenant', 'name email phone avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leases.length,
      data: leases,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single lease by ID
// @route   GET /api/leases/:id
// @access  Private
exports.getLeaseById = async (req, res, next) => {
  try {
    const lease = await Lease.findById(req.params.id)
      .populate('property')
      .populate('tenant', 'name email phone avatar');

    if (!lease) {
      return res.status(404).json({
        success: false,
        message: `Lease agreement not found with ID ${req.params.id}`,
      });
    }

    // Tenant can only see their own lease
    if (req.user.role !== 'admin' && lease.tenant._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this lease',
      });
    }

    res.status(200).json({
      success: true,
      data: lease,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new lease
// @route   POST /api/leases
// @access  Private (Admin only)
exports.createLease = async (req, res, next) => {
  try {
    const { property, tenant, startDate, endDate, monthlyRent, securityDeposit, terms } = req.body;

    const lease = await Lease.create({
      property,
      tenant,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      terms,
      status: 'active',
    });

    // Automatically update property status to 'rented' and assign currentTenant
    await Property.findByIdAndUpdate(property, {
      status: 'rented',
      currentTenant: tenant,
    });

    const populatedLease = await Lease.findById(lease._id)
      .populate('property')
      .populate('tenant', 'name email phone');

    res.status(201).json({
      success: true,
      data: populatedLease,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update lease status or terms
// @route   PUT /api/leases/:id
// @access  Private (Admin only)
exports.updateLease = async (req, res, next) => {
  try {
    const lease = await Lease.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('property')
      .populate('tenant', 'name email phone');

    if (!lease) {
      return res.status(404).json({
        success: false,
        message: `Lease not found with ID ${req.params.id}`,
      });
    }

    // If status changed to terminated/expired, free the property
    if (req.body.status === 'terminated' || req.body.status === 'expired') {
      await Property.findByIdAndUpdate(lease.property._id, {
        status: 'available',
        currentTenant: null,
      });
    }

    res.status(200).json({
      success: true,
      data: lease,
    });
  } catch (err) {
    next(err);
  }
};
