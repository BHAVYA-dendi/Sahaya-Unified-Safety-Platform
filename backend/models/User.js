const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relation: { type: String, required: true },
  phone: { type: String, required: true }
});

const userSchema = new mongoose.Schema({
  // Basic Details
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  profilePhoto: { type: String, default: '' },
  
  // Address & Contact
  houseNo: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Identity Verification
  aadhaarNumber: { type: String, required: true, unique: true },
  aadhaarPhoto: { type: String, default: '' },
  medicalInfo: { type: String, default: '' },
  
  // Emergency Contacts
  emergencyContacts: [emergencyContactSchema],
  
  // Family Members
  children: [{
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    type: { type: String, default: 'child' }
  }],
  elderly: [{
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    type: { type: String, default: 'elderly' }
  }],
  
  // Portal Selection
  portals: [{ type: String, enum: ['women', 'child', 'disaster', 'elderly', 'health'] }],
  elderRole: { type: String, enum: ['caregiver', 'self'], default: null },
  
  // Status
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
