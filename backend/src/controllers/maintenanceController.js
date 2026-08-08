const MaintenanceRequest = require('../models/MaintenanceRequest');

// @desc    Get maintenance requests (Admin gets all, Tenant gets own)
// @route   GET /api/maintenance
// @access  Private
exports.getMaintenanceRequests = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.tenant = req.user.id;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    if (req.query.priority && req.query.priority !== 'all') {
      query.priority = req.query.priority;
    }

    const requests = await MaintenanceRequest.find(query)
      .populate('property', 'title address rentAmount images')
      .populate('tenant', 'name email phone avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new maintenance request
// @route   POST /api/maintenance
// @access  Private
exports.createMaintenanceRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      req.body.tenant = req.user.id;
    }

    const request = await MaintenanceRequest.create(req.body);

    const populated = await MaintenanceRequest.findById(request._id)
      .populate('property', 'title address')
      .populate('tenant', 'name email phone');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update maintenance request status/cost/contractor
// @route   PUT /api/maintenance/:id
// @access  Private
exports.updateMaintenanceRequest = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.body.status === 'resolved' && !req.body.resolvedDate) {
      updateData.resolvedDate = new Date();
    }

    const request = await MaintenanceRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('property', 'title address')
      .populate('tenant', 'name email phone');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: `Maintenance request not found with ID ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
};
