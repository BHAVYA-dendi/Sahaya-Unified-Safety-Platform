const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phoneNumber').optional().isLength({ min: 10, max: 10 }).withMessage('Valid phone required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body;
    delete updates.password; // Don't update password here
    delete updates._id;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/user/portals
// @desc    Update user portals
// @access  Private
router.put('/portals', auth, async (req, res) => {
  try {
    const { portals, elderRole } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        $set: { 
          portals: portals || [],
          elderRole: elderRole || null
        } 
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      user,
      message: 'Portals updated successfully'
    });
  } catch (error) {
    console.error('Update portals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/user/emergency-contacts
// @desc    Update emergency contacts
// @access  Private
router.put('/emergency-contacts', auth, async (req, res) => {
  try {
    const { emergencyContacts } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { emergencyContacts: emergencyContacts || [] } },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      user,
      message: 'Emergency contacts updated successfully'
    });
  } catch (error) {
    console.error('Update contacts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/user/photos
// @desc    Update profile/Aadhaar photos
// @access  Private
router.put('/photos', auth, async (req, res) => {
  try {
    const { profilePhoto, aadhaarPhoto } = req.body;

    const updates = {};
    if (profilePhoto) updates.profilePhoto = profilePhoto;
    if (aadhaarPhoto) updates.aadhaarPhoto = aadhaarPhoto;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      user,
      message: 'Photos updated successfully'
    });
  } catch (error) {
    console.error('Update photos error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/user
// @desc    Delete user account
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });
    
    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
