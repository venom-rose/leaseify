const Payment = require('../models/Payment');

// @desc    Get all payments (Admin gets all, Tenant gets own)
// @route   GET /api/payments
// @access  Private
exports.getPayments = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.tenant = req.user.id;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const payments = await Payment.find(query)
      .populate('property', 'title address rentAmount')
      .populate('tenant', 'name email phone avatar')
      .populate('lease', 'startDate endDate')
      .sort({ paymentDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record a new payment
// @route   POST /api/payments
// @access  Private
exports.createPayment = async (req, res, next) => {
  try {
    // If tenant is paying, assign their ID
    if (req.user.role !== 'admin') {
      req.body.tenant = req.user.id;
    }

    const payment = await Payment.create(req.body);

    const populated = await Payment.findById(payment._id)
      .populate('property', 'title address')
      .populate('tenant', 'name email');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id
// @access  Private (Admin only)
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, notes: req.body.notes },
      { new: true, runValidators: true }
    )
      .populate('property', 'title address')
      .populate('tenant', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Payment record not found with ID ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (err) {
    next(err);
  }
};
