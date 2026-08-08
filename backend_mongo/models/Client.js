const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  contact: {
    type: String,
    required: [true, 'Contact details are required'],
    trim: true
  },
  activeBookings: {
    type: Number,
    default: 0,
    min: [0, 'Active bookings cannot be negative']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Client', ClientSchema);
