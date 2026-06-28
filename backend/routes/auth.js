const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phoneNumber').isLength({ min: 10, max: 10 }).withMessage('Valid 10-digit phone required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be 8+ characters'),
  body('aadhaarNumber').isLength({ min: 12, max: 12 }).withMessage('Valid 12-digit Aadhaar required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName, lastName, dob, gender, profilePhoto,
      houseNo, street, city, state, pinCode, phoneNumber, email, password,
      aadhaarNumber, aadhaarPhoto, medicalInfo,
      emergencyContacts, children, elderly, portals, elderRole
    } = req.body;

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { phoneNumber }, { aadhaarNumber }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email, phone, or Aadhaar' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      firstName, lastName, dob, gender, profilePhoto,
      houseNo, street, city, state, pinCode, phoneNumber, email,
      password: hashedPassword,
      aadhaarNumber, aadhaarPhoto, medicalInfo,
      emergencyContacts: emergencyContacts || [],
      children: children || [],
      elderly: elderly || [],
      portals: portals || [],
      elderRole,
      isActive: true
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        houseNo: user.houseNo,
        street: user.street,
        city: user.city,
        state: user.state,
        pinCode: user.pinCode,
        profilePhoto: user.profilePhoto,
        aadhaarNumber: user.aadhaarNumber,
        aadhaarPhoto: user.aadhaarPhoto,
        medicalInfo: user.medicalInfo,
        emergencyContacts: user.emergencyContacts,
        children: user.children,
        elderly: user.elderly,
        portals: user.portals,
        elderRole: user.elderRole,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        houseNo: user.houseNo,
        street: user.street,
        city: user.city,
        state: user.state,
        pinCode: user.pinCode,
        profilePhoto: user.profilePhoto,
        aadhaarNumber: user.aadhaarNumber,
        aadhaarPhoto: user.aadhaarPhoto,
        medicalInfo: user.medicalInfo,
        emergencyContacts: user.emergencyContacts,
        children: user.children,
        elderly: user.elderly,
        portals: user.portals,
        elderRole: user.elderRole,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
