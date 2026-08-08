const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    monthlyRent: {
      type: Number,
      required: true,
    },
    securityDeposit: {
      type: Number,
      required: true,
    },
    paymentFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'annually'],
      default: 'monthly',
    },
    paymentDueDay: {
      type: Number,
      default: 1, // 1st of every month
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'expired', 'terminated'],
      default: 'active',
    },
    terms: {
      type: String,
      default: 'Standard residential lease agreement terms apply.',
    },
    signedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Lease', leaseSchema);
