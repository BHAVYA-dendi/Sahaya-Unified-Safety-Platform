const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
  // Parent/Guardian User
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Member Details
  name: { type: String, required: true },
  type: { type: String, enum: ['child', 'elderly'], required: true },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  
  // Photo
  photo: { type: String, default: '' },
  
  // For Children
  schoolName: { type: String },
  safeZoneAddress: { type: String },
  safeZoneLat: { type: Number },
  safeZoneLng: { type: Number },
  
  // For Elderly
  healthConditions: { type: String },
  medications: { type: String },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Current Status
  lastKnownLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  status: { 
    type: String, 
    enum: ['safe', 'alert', 'unknown'], 
    default: 'unknown' 
  },
  
  // Activity (for children)
  todaySteps: { type: Number, default: 0 },
  activeHours: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
