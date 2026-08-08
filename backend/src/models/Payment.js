const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lease',
      required: true,
    },
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
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['Rent', 'Deposit', 'Late Fee', 'Maintenance Fee', 'Utility'],
      default: 'Rent',
    },
    paymentMethod: {
      type: String,
      enum: ['Credit Card', 'Bank Transfer', 'Stripe', 'PayPal', 'Cash', 'Check'],
      default: 'Bank Transfer',
    },
    status: {
      type: String,
      enum: ['paid', 'pending', 'overdue', 'failed'],
      default: 'paid',
    },
    transactionId: {
      type: String,
      unique: true,
      default: () => 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    },
    receiptUrl: {
      type: String,
      default: '',
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

module.exports = mongoose.model('Payment', paymentSchema);
