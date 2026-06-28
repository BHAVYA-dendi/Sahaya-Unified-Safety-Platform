const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const SOSAlert = require('../models/SOSAlert');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/sos/alert
// @desc    Create SOS alert
// @access  Private
router.post('/alert', [
  auth,
  body('latitude').isNumeric().withMessage('Latitude is required'),
  body('longitude').isNumeric().withMessage('Longitude is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, locationAccuracy, message, hasRecording, contactsNotified } = req.body;

    // Create SOS alert
    const sosAlert = new SOSAlert({
      user: req.user.id,
      latitude,
      longitude,
      locationAccuracy,
      message: message || `SOS Alert from ${req.user.firstName} ${req.user.lastName}`,
      hasRecording: hasRecording || false,
      contactsNotified: contactsNotified || [],
      status: 'active'
    });

    await sosAlert.save();

    // Get user with emergency contacts
    const user = await User.findById(req.user.id);

    res.status(201).json({
      success: true,
      sosAlert,
      emergencyContacts: user.emergencyContacts,
      message: 'SOS alert created successfully'
    });
  } catch (error) {
    console.error('SOS alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sos/alerts
// @desc    Get user's SOS alert history
// @access  Private
router.get('/alerts', auth, async (req, res) => {
  try {
    const alerts = await SOSAlert.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sos/active
// @desc    Get active SOS alerts
// @access  Private
router.get('/active', auth, async (req, res) => {
  try {
    const activeAlerts = await SOSAlert.find({ 
      user: req.user.id,
      status: 'active'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      alerts: activeAlerts,
      count: activeAlerts.length
    });
  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/sos/resolve/:id
// @desc    Resolve an SOS alert
// @access  Private
router.put('/resolve/:id', auth, async (req, res) => {
  try {
    const { resolutionNotes } = req.body;

    const sosAlert = await SOSAlert.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: req.user.id,
          resolutionNotes
        }
      },
      { new: true }
    );

    if (!sosAlert) {
      return res.status(404).json({ message: 'SOS alert not found' });
    }

    res.json({
      success: true,
      sosAlert,
      message: 'SOS alert resolved successfully'
    });
  } catch (error) {
    console.error('Resolve SOS error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/sos/cancel/:id
// @desc    Cancel an SOS alert
// @access  Private
router.put('/cancel/:id', auth, async (req, res) => {
  try {
    const sosAlert = await SOSAlert.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        $set: {
          status: 'cancelled',
          resolvedAt: new Date()
        }
      },
      { new: true }
    );

    if (!sosAlert) {
      return res.status(404).json({ message: 'SOS alert not found' });
    }

    res.json({
      success: true,
      sosAlert,
      message: 'SOS alert cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel SOS error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/sos/recording/:id
// @desc    Update recording URL
// @access  Private
router.put('/recording/:id', auth, async (req, res) => {
  try {
    const { recordingUrl } = req.body;

    const sosAlert = await SOSAlert.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        $set: {
          recordingUrl,
          hasRecording: true
        }
      },
      { new: true }
    );

    if (!sosAlert) {
      return res.status(404).json({ message: 'SOS alert not found' });
    }

    res.json({
      success: true,
      sosAlert,
      message: 'Recording saved successfully'
    });
  } catch (error) {
    console.error('Recording update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
