const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  nationality: {
    type: String,
    trim: true
  },
  passportNumber: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  preferences: {
    smoking: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false },
    specialRequests: String,
    dietaryRestrictions: String
  },
  loyaltyProgram: {
    memberId: String,
    tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    points: { type: Number, default: 0 }
  },
  vipStatus: {
    type: Boolean,
    default: false
  },
  notes: [{
    note: String,
    date: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  totalStays: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastStay: {
    type: Date
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  blacklistReason: String
}, {
  timestamps: true
});

// Index for efficient queries
guestSchema.index({ email: 1 });
guestSchema.index({ phone: 1 });
guestSchema.index({ lastName: 1, firstName: 1 });
guestSchema.index({ 'loyaltyProgram.memberId': 1 });

// Virtual for full name
guestSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Guest', guestSchema);