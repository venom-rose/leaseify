const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required'],
    min: [0, 'Price per day cannot be negative']
  },
  availability: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);
