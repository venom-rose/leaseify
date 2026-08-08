const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'customer'],
    default: 'customer'
  },
  email: {
    type: String,
    required: [true, 'User email is required'],
    unique: true,
    lowercase: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
