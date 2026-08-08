const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL: auto-delete when expiresAt is reached
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash OTP before saving (same as password hashing for security)
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
  next();
});

// Compare plain OTP with hashed OTP
otpSchema.methods.matchOtp = async function (plainOtp) {
  return await bcrypt.compare(plainOtp, this.otp);
};

module.exports = mongoose.model('Otp', otpSchema);
