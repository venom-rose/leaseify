const Booking = require('../models/Booking');

// @desc    Get all bookings (with populated User and Product)
// @route   GET /api/bookings
// @access  Public
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email role')
      .populate('productId', 'name category pricePerDay availability')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Public
exports.createBooking = async (req, res) => {
  try {
    const { userId, productId, startDate, endDate, status } = req.body;
    const booking = await Booking.create({
      userId,
      productId,
      startDate,
      endDate,
      status: status || 'PENDING'
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('userId', 'name email')
      .populate('productId', 'name pricePerDay');

    res.status(201).json({ success: true, data: populatedBooking });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
