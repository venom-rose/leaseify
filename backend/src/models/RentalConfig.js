const mongoose = require('mongoose');

const rentalConfigSchema = new mongoose.Schema(
  {
    lateFeePerDay: {
      type: Number,
      required: true,
      default: 20,
      min: [0, 'Late fee cannot be negative'],
    },
    gracePeriodDays: {
      type: Number,
      required: true,
      default: 1,
      min: [0, 'Grace period cannot be negative'],
    },
    autoOverdueCheck: {
      type: Boolean,
      default: true,
    },
    feeCalculationType: {
      type: String,
      enum: ['flat_rate', 'daily_rate_multiplier'],
      default: 'flat_rate',
    },
    dailyRateMultiplier: {
      type: Number,
      default: 1.5,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RentalConfig', rentalConfigSchema);
