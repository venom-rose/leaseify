const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('../utils/emailService');

// Helper to generate a random 6-digit number string
const generateNumericOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to send token in response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      isVerified: user.isVerified,
    },
  });
};

// @desc    Register a new user (generates and sends OTP)
// @route   POST /api/auth/register
// @access  Public
// @desc    Send verification OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    // Delete any existing OTPs for this email
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Generate 6-digit numeric OTP
    const rawOtp = generateNumericOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Save hashed OTP to database
    await Otp.create({
      email: email.toLowerCase(),
      otp: rawOtp,
      expiresAt,
    });

    // Send OTP email
    await sendOtpEmail(email.toLowerCase(), rawOtp);

    res.status(200).json({
      success: true,
      message: 'Verification OTP has been sent to your email address.',
    });
  } catch (err) {
    next(err);
  }
};

// Aliasing register to sendOtp for routes compatibility
exports.register = exports.sendOtp;

// @desc    Verify OTP to activate account / register user
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, name, password, phone } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP code',
      });
    }

    // Find the latest active OTP for this email
    const activeOtp = await Otp.findOne({ email: email.toLowerCase() });
    if (!activeOtp) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or does not exist. Please request a new one.',
      });
    }

    // Code level expiration check
    if (new Date() > activeOtp.expiresAt) {
      await Otp.deleteMany({ email: email.toLowerCase() });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Match OTP
    const isMatch = await activeOtp.matchOtp(otp);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please try again.',
      });
    }

    // Clean up OTP
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Scenario A: Signup Details are provided, create the user
    if (name && password) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        if (existingUser.isVerified) {
          return res.status(400).json({
            success: false,
            message: 'An account with this email address already exists',
          });
        } else {
          // If user exists but is unverified (legacy/partial data), delete it first to recreate
          await User.deleteOne({ _id: existingUser._id });
        }
      }

      // Create new verified user
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: 'user',
        phone: phone || '',
        isVerified: true,
      });

      return sendTokenResponse(user, 201, res);
    }

    // Scenario B: Legacy/Verification only (find user and mark verified)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please complete registration.',
      });
    }

    user.isVerified = true;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOtp = async (req, res, next) => {
  try {
    let { email, userId } = req.body;

    if (!email && userId) {
      const user = await User.findById(userId);
      if (user) {
        email = user.email;
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address or user ID',
      });
    }

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    // Invalidate existing OTPs
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Generate fresh OTP
    const rawOtp = generateNumericOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({
      email: email.toLowerCase(),
      otp: rawOtp,
      expiresAt,
    });

    await sendOtpEmail(email.toLowerCase(), rawOtp);

    res.status(200).json({
      success: true,
      message: 'A fresh verification OTP has been sent to your email address.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user (checks if account is verified)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password',
      });
    }

    // Check for user and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // Verify account status
    if (!user.isVerified) {
      // Invalidate existing OTPs and auto-resend a fresh OTP for user convenience
      await Otp.deleteMany({ email: user.email });
      const rawOtp = generateNumericOtp();
      await Otp.create({
        email: user.email,
        otp: rawOtp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      });
      await sendOtpEmail(user.email, rawOtp);

      return res.status(400).json({
        success: false,
        message: 'Your email address is not verified yet. We have sent a fresh OTP verification code.',
        isUnverified: true,
        userId: user._id,
        email: user.email,
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone,
      avatar: req.body.avatar,
      emergencyContact: req.body.emergencyContact,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
