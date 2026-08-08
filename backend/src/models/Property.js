const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a property title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Please specify property type'],
      enum: ['Apartment', 'Single Family Home', 'Condo', 'Townhouse', 'Studio', 'Commercial'],
      default: 'Apartment',
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'USA' },
    },
    rentAmount: {
      type: Number,
      required: [true, 'Please specify monthly rent amount'],
      min: [0, 'Rent cannot be negative'],
    },
    securityDeposit: {
      type: Number,
      default: 0,
    },
    bedrooms: {
      type: Number,
      required: [true, 'Please specify number of bedrooms'],
      default: 1,
    },
    bathrooms: {
      type: Number,
      required: [true, 'Please specify number of bathrooms'],
      default: 1,
    },
    areaSqFt: {
      type: Number,
      required: [true, 'Please specify area in sq ft'],
    },
    status: {
      type: String,
      enum: ['available', 'rented', 'maintenance', 'reserved'],
      default: 'available',
    },
    amenities: {
      type: [String],
      default: ['Air Conditioning', 'High Speed Internet', 'Parking', 'In-unit Laundry'],
    },
    images: {
      type: [String],
      default: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
      ],
    },
    yearBuilt: {
      type: Number,
    },
    petFriendly: {
      type: Boolean,
      default: true,
    },
    currentTenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

module.exports = mongoose.model('Property', propertySchema);
