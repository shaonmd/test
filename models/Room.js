const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  roomType: {
    type: String,
    required: true,
    enum: ['single', 'double', 'suite', 'deluxe', 'presidential']
  },
  floor: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  pricePerNight: {
    type: Number,
    required: true,
    min: 0
  },
  amenities: [{
    type: String,
    enum: [
      'wifi', 'tv', 'minibar', 'balcony', 'ocean_view', 'mountain_view',
      'city_view', 'air_conditioning', 'heating', 'safe', 'refrigerator',
      'microwave', 'coffee_maker', 'bathtub', 'shower', 'jacuzzi',
      'room_service', 'laundry_service', 'parking', 'gym_access', 'spa_access'
    ]
  }],
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'cleaning', 'out_of_order'],
    default: 'available'
  },
  description: {
    type: String,
    maxlength: 500
  },
  images: [{
    url: String,
    caption: String,
    isPrimary: { type: Boolean, default: false }
  }],
  size: {
    type: Number, // in square meters
    min: 0
  },
  bedType: {
    type: String,
    enum: ['single', 'double', 'queen', 'king', 'twin', 'sofa_bed'],
    default: 'double'
  },
  smokingAllowed: {
    type: Boolean,
    default: false
  },
  petFriendly: {
    type: Boolean,
    default: false
  },
  lastCleaned: {
    type: Date,
    default: Date.now
  },
  maintenanceNotes: [{
    note: String,
    date: { type: Date, default: Date.now },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
roomSchema.index({ roomType: 1, status: 1 });
roomSchema.index({ floor: 1 });
roomSchema.index({ pricePerNight: 1 });

module.exports = mongoose.model('Room', roomSchema);