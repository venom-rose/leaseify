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
    // Status tracking: booked, picked, returned, late (plus legacy active, overdue, completed)
    status: {
      type: String,
      enum: ['booked', 'picked', 'returned', 'late', 'active', 'overdue', 'completed', 'cancelled', 'pending'],
      default: 'booked',
    },
    
    // --- PICKUP WORKFLOW FIELDS ---
    scheduledPickupDate: {
      type: Date,
      default: function () {
        return this.startDate || new Date();
      },
    },
    pickupLocation: {
      type: String,
      default: 'Main City Center Hub (Counter #1)',
    },
    pickedAt: {
      type: Date,
    },
    pickupVerificationCode: {
      type: String,
      default: () => 'PKP-' + Math.floor(100000 + Math.random() * 900000),
    },
    pickedBy: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      idType: { type: String, default: 'Government ID' },
      idNumber: { type: String, default: '' },
    },
    pickupNotes: {
      type: String,
      default: '',
    },

    // --- RETURN & INSPECTION WORKFLOW FIELDS ---
    returnedAt: {
      type: Date,
    },
    returnVerificationCode: {
      type: String,
      default: () => 'RTN-' + Math.floor(100000 + Math.random() * 900000),
    },
    itemCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'minor_damage', 'severe_damage'],
      default: 'excellent',
    },
    conditionNotes: {
      type: String,
      default: '',
    },
    damagePenalty: {
      type: Number,
      default: 0,
      min: 0,
    },

    // --- LATE RETURN & PENALTY TRACKING ---
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

    // Payment & Identification
    paymentMethod: {
      type: String,
      enum: ['Credit Card', 'Bank Transfer', 'Stripe', 'PayPal', 'Cash', 'UPI', 'Net Banking'],
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
