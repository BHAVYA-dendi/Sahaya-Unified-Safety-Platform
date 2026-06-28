const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Location
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  locationAccuracy: { type: Number },
  
  // Alert Details
  status: { 
    type: String, 
    enum: ['active', 'resolved', 'cancelled'], 
    default: 'active' 
  },
  message: { type: String, default: '' },
  
  // Recording
  recordingUrl: { type: String, default: '' },
  hasRecording: { type: Boolean, default: false },
  
  // Contacts Notified
  contactsNotified: [{ 
    name: String, 
    phone: String, 
    notifiedAt: { type: Date, default: Date.now }
  }],
  
  // Resolution
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('SOSAlert', sosAlertSchema);
