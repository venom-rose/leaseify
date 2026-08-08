const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: { type: String, required: true },
        pricePerDay: { type: Number, required: true },
        securityDeposit: { type: Number, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        days: { type: Number, required: true },
        subtotal: { type: Number, required: true },
        deposit: { type: Number, required: true },
        image: { type: String, default: '' },
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
    },
    rentalTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    depositTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'overdue', 'completed', 'cancelled', 'returned'],
      default: 'active',
    },
    accruedPenalty: {
      type: Number,
      default: 0,
    },
    gracePeriodDays: {
      type: Number,
      default: 1,
    },
    gracePeriodApplied: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ['Credit Card', 'Bank Transfer', 'Stripe', 'PayPal', 'Cash'],
      default: 'Credit Card',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'refunded'],
      default: 'paid',
    },
    transactionId: {
      type: String,
      unique: true,
      default: () => 'RNT-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    },
    invoiceNumber: {
      type: String,
      default: () => 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    },

    // Return & Security Deposit Refund Tracking
    returnedAt: {
      type: Date,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateDays: {
      type: Number,
      default: 0,
    },
    penaltyAmount: {
      type: Number,
      default: 0,
    },
    refundedDepositAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'full_refunded', 'partial_refunded', 'forfeited', 'not_applicable'],
      default: 'pending',
    },
    refundTransactionId: {
      type: String,
      default: '',
    },

    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Rental', rentalSchema);
