const MaintenanceRequest = require('../models/MaintenanceRequest');
const Lease = require('../models/Lease');
const Property = require('../models/Property');

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
      
      // Auto-assign property based on tenant's active lease if not already provided
      if (!req.body.property) {
        const lease = await Lease.findOne({ tenant: req.user.id, status: 'active' });
        if (lease) {
          req.body.property = lease.property;
        } else {
          return res.status(400).json({
            success: false,
            message: 'You do not have an active lease. Cannot file a maintenance request without an associated property.',
          });
        }
      }
    } else {
      // If admin, check if property is specified in the request
      if (!req.body.property) {
        return res.status(400).json({
          success: false,
          message: 'Please specify a property for the maintenance request.',
        });
      }
      
      // If tenant is not specified, try to find the tenant currently renting the property
      if (!req.body.tenant) {
        const property = await Property.findById(req.body.property);
        if (property && property.currentTenant) {
          req.body.tenant = property.currentTenant;
        } else {
          // If no current tenant (vacant), set it to the admin (req.user.id) so the required field is satisfied
          req.body.tenant = req.user.id;
        }
      }
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
