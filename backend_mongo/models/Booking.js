const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID reference is required']
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID reference is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED'],
    default: 'PENDING'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', BookingSchema);
