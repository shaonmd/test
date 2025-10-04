const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    required: true,
    unique: true
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  numberOfGuests: {
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, default: 0, min: 0 },
    infants: { type: Number, default: 0, min: 0 }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  specialRequests: String,
  source: {
    type: String,
    enum: ['website', 'phone', 'walk_in', 'travel_agent', 'booking_site'],
    default: 'website'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online']
  },
  cancellationPolicy: {
    type: String,
    enum: ['free', '24h', '48h', '72h', '7d', 'non_refundable'],
    default: '24h'
  },
  cancellationDate: Date,
  cancellationReason: String,
  refundAmount: {
    type: Number,
    default: 0
  },
  checkInTime: Date,
  checkOutTime: Date,
  earlyCheckIn: {
    type: Boolean,
    default: false
  },
  lateCheckOut: {
    type: Boolean,
    default: false
  },
  additionalCharges: [{
    description: String,
    amount: Number,
    date: { type: Date, default: Date.now }
  }],
  discounts: [{
    description: String,
    amount: Number,
    type: { type: String, enum: ['percentage', 'fixed'] }
  }],
  notes: [{
    note: String,
    date: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ guest: 1 });
bookingSchema.index({ room: 1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual for duration
bookingSchema.virtual('duration').get(function() {
  if (this.checkIn && this.checkOut) {
    return Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Pre-save middleware to generate booking number
bookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.bookingNumber) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingNumber = `BK${String(count + 1).padStart(6, '0')}`;
  }
  
  // Calculate balance
  this.balance = this.totalAmount - this.paidAmount;
  
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);