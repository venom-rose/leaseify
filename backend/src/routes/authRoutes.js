const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyOtp,
  resendOtp,
  getMe,
  updateDetails,
  sendOtp,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/signup', register);
router.post('/send-otp', sendOtp);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);

module.exports = router;
