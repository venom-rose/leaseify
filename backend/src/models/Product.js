const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      maxlength: [120, 'Product name cannot exceed 120 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: ['Furniture', 'Appliances', 'Electronics', 'Tools', 'Fitness', 'Home Decor', 'Other'],
      default: 'Furniture',
    },
    pricePerDay: {
      type: Number,
      required: [true, 'Please specify the daily rental price'],
      min: [0, 'Daily price cannot be negative'],
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, 'Deposit cannot be negative'],
    },
    location: {
      type: String,
      default: 'Main Facility / Warehouse',
      trim: true,
    },
    stockQuantity: {
      type: Number,
      default: 1,
      min: [0, 'Stock cannot be negative'],
    },
    description: {
      type: String,
      default: function () {
        return `${this.name} (${this.category}) available for daily rental.`;
      },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    images: {
      type: [String],
      default: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
      ],
    },
    features: {
      type: [String],
      default: [],
    },
    specifications: {
      brand: { type: String, default: '' },
      model: { type: String, default: '' },
      condition: { type: String, enum: ['Brand New', 'Like New', 'Excellent', 'Good'], default: 'Brand New' },
      dimensions: { type: String, default: '' },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
