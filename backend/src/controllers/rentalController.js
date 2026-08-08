const Rental = require('../models/Rental');
const Product = require('../models/Product');
const RentalConfig = require('../models/RentalConfig');

// Helper: Get or initialize system-wide rental policy configuration
const getSystemConfig = async () => {
  let config = await RentalConfig.findOne();
  if (!config) {
    config = await RentalConfig.create({
      lateFeePerDay: 20,
      gracePeriodDays: 1,
      autoOverdueCheck: true,
      feeCalculationType: 'flat_rate',
      dailyRateMultiplier: 1.5,
    });
  }
  return config;
};

// Helper: Automated check and sync of overdue rentals past grace period
const syncOverdueRentals = async () => {
  try {
    const config = await getSystemConfig();
    const now = new Date();
    const activeRentals = await Rental.find({ status: { $in: ['active', 'overdue'] } });

    for (const rental of activeRentals) {
      const scheduledEnd = new Date(rental.endDate);
      const gracePeriodMs = (config.gracePeriodDays || 1) * 86400000;
      const deadlineWithGrace = new Date(scheduledEnd.getTime() + gracePeriodMs);

      if (now > deadlineWithGrace) {
        const rawOverdueDays = Math.ceil((now.getTime() - deadlineWithGrace.getTime()) / 86400000);
        const penalty = Math.min(rawOverdueDays * (config.lateFeePerDay || 20), rental.depositTotal);

        rental.status = 'overdue';
        rental.isLate = true;
        rental.lateDays = rawOverdueDays;
        rental.accruedPenalty = penalty;
        rental.gracePeriodDays = config.gracePeriodDays;
        rental.gracePeriodApplied = true;
        await rental.save();
      } else if (now > scheduledEnd && now <= deadlineWithGrace) {
        // Within grace period buffer
        rental.status = 'active';
        rental.gracePeriodApplied = true;
        rental.accruedPenalty = 0;
        await rental.save();
      }
    }
  } catch (err) {
    console.error('[SYNC OVERDUE ERROR]:', err);
  }
};

// @desc    Get system late fee & grace period settings
// @route   GET /api/rentals/settings
// @access  Public / Private
exports.getRentalSettings = async (req, res, next) => {
  try {
    const config = await getSystemConfig();
    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update system late fee & grace period settings
// @route   PUT /api/rentals/settings
// @access  Private (Admin only)
exports.updateRentalSettings = async (req, res, next) => {
  try {
    let config = await RentalConfig.findOne();
    if (!config) {
      config = new RentalConfig();
    }

    if (req.body.lateFeePerDay !== undefined) config.lateFeePerDay = Number(req.body.lateFeePerDay);
    if (req.body.gracePeriodDays !== undefined) config.gracePeriodDays = Number(req.body.gracePeriodDays);
    if (req.body.autoOverdueCheck !== undefined) config.autoOverdueCheck = Boolean(req.body.autoOverdueCheck);
    if (req.body.feeCalculationType) config.feeCalculationType = req.body.feeCalculationType;
    if (req.body.dailyRateMultiplier !== undefined) config.dailyRateMultiplier = Number(req.body.dailyRateMultiplier);

    await config.save();

    // Re-sync active rentals with new policy
    await syncOverdueRentals();

    res.status(200).json({
      success: true,
      message: 'Rental policy settings updated successfully',
      data: config,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Manually trigger overdue rentals sync
// @route   POST /api/rentals/sync-overdue
// @access  Private (Admin only)
exports.triggerOverdueSync = async (req, res, next) => {
  try {
    await syncOverdueRentals();
    const overdueCount = await Rental.countDocuments({ status: 'overdue' });
    res.status(200).json({
      success: true,
      message: `Overdue detection completed. ${overdueCount} rentals flagged overdue.`,
      overdueCount,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new rental booking / checkout with payment simulation
// @route   POST /api/rentals
// @access  Private
exports.createRentalBooking = async (req, res, next) => {
  try {
    const { items, startDate, endDate, totalDays, paymentMethod, deliveryAddress, notes } = req.body;
    const config = await getSystemConfig();

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Please select products to rent.',
      });
    }

    let rentalTotal = 0;
    let depositTotal = 0;
    const populatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found for ID: ${item.product}`,
        });
      }

      if (product.stockQuantity < 1) {
        return res.status(400).json({
          success: false,
          message: `Product '${product.name}' is currently out of stock.`,
        });
      }

      const days = item.days || totalDays || 1;
      const subtotal = product.pricePerDay * days;
      const deposit = product.securityDeposit;

      rentalTotal += subtotal;
      depositTotal += deposit;

      populatedItems.push({
        product: product._id,
        name: product.name,
        pricePerDay: product.pricePerDay,
        securityDeposit: product.securityDeposit,
        startDate: item.startDate || startDate,
        endDate: item.endDate || endDate,
        days,
        subtotal,
        deposit,
        image: product.images?.[0] || '',
      });

      // Decrease stock count
      await Product.findByIdAndUpdate(product._id, {
        $inc: { stockQuantity: -1 },
      });
    }

    const grandTotal = rentalTotal + depositTotal;
    const bookingStart = new Date(startDate || Date.now());
    const bookingEnd = new Date(endDate || Date.now() + (totalDays || 1) * 86400000);

    const rental = await Rental.create({
      user: req.user.id,
      items: populatedItems,
      startDate: bookingStart,
      endDate: bookingEnd,
      totalDays: totalDays || Math.ceil((bookingEnd - bookingStart) / (1000 * 60 * 60 * 24)) || 1,
      rentalTotal,
      depositTotal,
      grandTotal,
      status: 'active',
      gracePeriodDays: config.gracePeriodDays || 1,
      paymentMethod: paymentMethod || 'Credit Card',
      paymentStatus: 'paid',
      refundStatus: 'pending',
      deliveryAddress: deliveryAddress || {},
      notes: notes || '',
    });

    const populatedRental = await Rental.findById(rental._id).populate('user', 'name email phone');

    res.status(201).json({
      success: true,
      message: `Payment of $${grandTotal} successfully processed. Security deposit of $${depositTotal} is held in escrow.`,
      data: populatedRental,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process rental return & calculate security deposit refund vs late penalty with grace period
// @route   POST /api/rentals/:id/return
// @access  Private
exports.processRentalReturn = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id);
    const config = await getSystemConfig();

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: `Rental booking not found with ID ${req.params.id}`,
      });
    }

    if (rental.status === 'returned' || rental.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This rental booking has already been returned and processed.',
      });
    }

    // Determine actual return date
    const returnDate = req.body.returnDate ? new Date(req.body.returnDate) : new Date();
    const scheduledEnd = new Date(rental.endDate);
    const gracePeriodDays = config.gracePeriodDays !== undefined ? config.gracePeriodDays : 1;
    const deadlineWithGrace = new Date(scheduledEnd.getTime() + gracePeriodDays * 86400000);

    // Compute late penalty considering grace period
    const isOverdue = returnDate.getTime() > deadlineWithGrace.getTime();
    let lateDays = 0;
    let penaltyAmount = 0;
    let refundedDepositAmount = rental.depositTotal;
    let refundStatus = 'full_refunded';

    if (isOverdue) {
      lateDays = Math.ceil((returnDate.getTime() - deadlineWithGrace.getTime()) / 86400000);
      const feePerDay = config.lateFeePerDay || 20;
      const rawPenalty = lateDays * feePerDay;

      // Penalty is deducted from deposit (capped at total deposit)
      penaltyAmount = Math.min(rawPenalty, rental.depositTotal);
      refundedDepositAmount = Math.max(0, rental.depositTotal - penaltyAmount);
      refundStatus = refundedDepositAmount > 0 ? 'partial_refunded' : 'forfeited';
    }

    // Restock all items
    for (const item of rental.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: 1 },
      });
    }

    // Update rental record
    rental.status = 'returned';
    rental.returnedAt = returnDate;
    rental.isLate = isOverdue;
    rental.lateDays = lateDays;
    rental.gracePeriodDays = gracePeriodDays;
    rental.penaltyAmount = penaltyAmount;
    rental.accruedPenalty = 0;
    rental.refundedDepositAmount = refundedDepositAmount;
    rental.refundStatus = refundStatus;
    rental.refundTransactionId = 'REF-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    await rental.save();

    const populated = await Rental.findById(rental._id).populate('user', 'name email phone');

    res.status(200).json({
      success: true,
      message: isOverdue
        ? `Return processed: ${lateDays} days overdue beyond ${gracePeriodDays}d grace period. $${penaltyAmount} deducted from deposit. $${refundedDepositAmount} refunded.`
        : `On-time return confirmed (within ${gracePeriodDays}d grace period)! Full deposit of $${refundedDepositAmount} refunded.`,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get complete JSON invoice breakdown for a rental
// @route   GET /api/rentals/:id/invoice
// @access  Private
exports.getRentalInvoice = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name category specifications');

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: 'Rental booking not found',
      });
    }

    const invoice = {
      invoiceNumber: rental.invoiceNumber,
      transactionId: rental.transactionId,
      issueDate: rental.createdAt,
      status: rental.status,
      customer: {
        name: rental.user?.name || 'Resident Tenant',
        email: rental.user?.email || 'tenant@leaseify.com',
        phone: rental.user?.phone || '+1 (555) 000-0000',
        deliveryNotes: rental.notes,
      },
      rentalPeriod: {
        startDate: rental.startDate,
        endDate: rental.endDate,
        totalDays: rental.totalDays,
        returnedAt: rental.returnedAt || null,
        isLate: rental.isLate,
        lateDays: rental.lateDays,
        gracePeriodDays: rental.gracePeriodDays,
      },
      items: rental.items.map((i) => ({
        name: i.name,
        pricePerDay: i.pricePerDay,
        days: i.days,
        subtotal: i.subtotal,
        deposit: i.deposit,
      })),
      accounting: {
        rentalSubtotal: rental.rentalTotal,
        depositCharged: rental.depositTotal,
        grandTotalPaid: rental.grandTotal,
        penaltyDeducted: rental.penaltyAmount,
        depositRefunded: rental.refundedDepositAmount,
        refundStatus: rental.refundStatus,
        refundTransactionId: rental.refundTransactionId,
        netCustomerExpense: rental.rentalTotal + rental.penaltyAmount,
      },
      payment: {
        method: rental.paymentMethod,
        status: rental.paymentStatus,
      },
    };

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's own rentals (or all rentals for Admin) with auto-overdue sync
// @route   GET /api/rentals
// @access  Private
exports.getRentals = async (req, res, next) => {
  try {
    // Automatically sweep and flag overdue rentals on fetch
    await syncOverdueRentals();

    let query = {};
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const rentals = await Rental.find(query)
      .populate('user', 'name email phone avatar')
      .populate('items.product', 'name images category')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rentals.length,
      data: rentals,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single rental booking by ID
// @route   GET /api/rentals/:id
// @access  Private
exports.getRentalById = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('user', 'name email phone avatar')
      .populate('items.product');

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: `Rental record not found with ID ${req.params.id}`,
      });
    }

    if (req.user.role !== 'admin' && rental.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this rental booking',
      });
    }

    res.status(200).json({
      success: true,
      data: rental,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update rental status directly
// @route   PUT /api/rentals/:id/status
// @access  Private
exports.updateRentalStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: `Rental booking not found with ID ${req.params.id}`,
      });
    }

    if ((status === 'returned' || status === 'cancelled') && rental.status !== status) {
      for (const item of rental.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: 1 },
        });
      }
    }

    rental.status = status;
    await rental.save();

    res.status(200).json({
      success: true,
      data: rental,
    });
  } catch (err) {
    next(err);
  }
};
