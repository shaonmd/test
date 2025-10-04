const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online', 'mobile_payment']
  },
  paymentType: {
    type: String,
    enum: ['deposit', 'full_payment', 'partial_payment', 'refund', 'additional_charge'],
    default: 'full_payment'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  cardDetails: {
    lastFourDigits: String,
    cardType: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    routingNumber: String
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  notes: String,
  receiptNumber: String,
  refundReason: String,
  refundProcessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundProcessedAt: Date
}, {
  timestamps: true
});

// Index for efficient queries
paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ guest: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ processedAt: -1 });
paymentSchema.index({ transactionId: 1 });

// Pre-save middleware to generate payment number
paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.paymentNumber) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentNumber = `PAY${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);