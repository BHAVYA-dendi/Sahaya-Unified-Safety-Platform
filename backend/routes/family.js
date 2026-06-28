const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const FamilyMember = require('../models/FamilyMember');
const auth = require('../middleware/auth');

// @route   POST /api/family
// @desc    Add family member
// @access  Private
router.post('/', [
  auth,
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['child', 'elderly']).withMessage('Type must be child or elderly')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, type, age, gender, photo,
      schoolName, safeZoneAddress, safeZoneLat, safeZoneLng,
      healthConditions, medications, caregiverId
    } = req.body;

    const familyMember = new FamilyMember({
      parent: req.user.id,
      name,
      type,
      age,
      gender,
      photo,
      schoolName,
      safeZoneAddress,
      safeZoneLat,
      safeZoneLng,
      healthConditions,
      medications,
      caregiverId,
      status: 'safe'
    });

    await familyMember.save();

    res.status(201).json({
      success: true,
      familyMember,
      message: 'Family member added successfully'
    });
  } catch (error) {
    console.error('Add family member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/family
// @desc    Get all family members
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const familyMembers = await FamilyMember.find({ 
      parent: req.user.id,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      familyMembers,
      count: familyMembers.length
    });
  } catch (error) {
    console.error('Get family members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/family/:id
// @desc    Get single family member
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const familyMember = await FamilyMember.findOne({
      _id: req.params.id,
      parent: req.user.id
    });

    if (!familyMember) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.json({
      success: true,
      familyMember
    });
  } catch (error) {
    console.error('Get family member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/family/:id
// @desc    Update family member
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const updates = req.body;
    delete updates._id;
    delete updates.parent;

    const familyMember = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, parent: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!familyMember) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.json({
      success: true,
      familyMember,
      message: 'Family member updated successfully'
    });
  } catch (error) {
    console.error('Update family member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/family/:id/location
// @desc    Update family member location
// @access  Private
router.put('/:id/location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const familyMember = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, parent: req.user.id },
      {
        $set: {
          'lastKnownLocation.lat': lat,
          'lastKnownLocation.lng': lng,
          'lastKnownLocation.updatedAt': new Date()
        }
      },
      { new: true }
    );

    if (!familyMember) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.json({
      success: true,
      familyMember,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/family/:id/status
// @desc    Update family member status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const familyMember = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, parent: req.user.id },
      { $set: { status } },
      { new: true }
    );

    if (!familyMember) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.json({
      success: true,
      familyMember,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/family/:id/activity
// @desc    Update family member activity (for children)
// @access  Private
router.put('/:id/activity', auth, async (req, res) => {
  try {
    const { steps, activeHours } = req.body;

    const familyMember = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, parent: req.user.id, type: 'child' },
      {
        $set: {
          todaySteps: steps,
          activeHours: activeHours
        }
      },
      { new: true }
    );

    if (!familyMember) {
      return res.status(404).json({ message: 'Family member not found or not a child' });
    }

    res.json({
      success: true,
      familyMember,
      message: 'Activity updated successfully'
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/family/:id
// @desc    Remove family member
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const familyMember = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, parent: req.user.id },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!familyMember) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.json({
      success: true,
      message: 'Family member removed successfully'
    });
  } catch (error) {
    console.error('Remove family member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
