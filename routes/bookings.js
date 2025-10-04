const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Guest = require('../models/Guest');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/bookings
// @desc    Get all bookings with filtering and pagination
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']),
  query('checkIn').optional().isISO8601(),
  query('checkOut').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.checkIn) filter.checkIn = { $gte: new Date(req.query.checkIn) };
    if (req.query.checkOut) filter.checkOut = { $lte: new Date(req.query.checkOut) };

    const bookings = await Booking.find(filter)
      .populate('guest', 'firstName lastName email phone')
      .populate('room', 'roomNumber roomType pricePerNight')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('guest')
      .populate('room')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private
router.post('/', auth, [
  body('guest').isMongoId().withMessage('Valid guest ID is required'),
  body('room').isMongoId().withMessage('Valid room ID is required'),
  body('checkIn').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOut').isISO8601().withMessage('Valid check-out date is required'),
  body('numberOfGuests.adults').isInt({ min: 1 }).withMessage('At least 1 adult is required'),
  body('numberOfGuests.children').optional().isInt({ min: 0 }),
  body('numberOfGuests.infants').optional().isInt({ min: 0 }),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { guest, room, checkIn, checkOut, numberOfGuests, totalAmount, specialRequests, source } = req.body;

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    if (checkInDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
    }

    // Check if room exists and is available
    const roomData = await Room.findById(room);
    if (!roomData) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (roomData.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Room is not available'
      });
    }

    // Check if guest exists
    const guestData = await Guest.findById(guest);
    if (!guestData) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    // Check for overlapping bookings
    const overlappingBooking = await Booking.findOne({
      room,
      status: { $in: ['confirmed', 'checked_in'] },
      $or: [
        {
          checkIn: { $lt: checkOutDate },
          checkOut: { $gt: checkInDate }
        }
      ]
    });

    if (overlappingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Room is already booked for the selected dates'
      });
    }

    // Create booking
    const booking = new Booking({
      guest,
      room,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      numberOfGuests,
      totalAmount,
      specialRequests,
      source: source || 'website',
      createdBy: req.user._id
    });

    await booking.save();

    // Update room status
    roomData.status = 'occupied';
    await roomData.save();

    // Populate the booking data for response
    await booking.populate([
      { path: 'guest', select: 'firstName lastName email phone' },
      { path: 'room', select: 'roomNumber roomType pricePerNight' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking
// @access  Private
router.put('/:id', auth, [
  body('checkIn').optional().isISO8601(),
  body('checkOut').optional().isISO8601(),
  body('status').optional().isIn(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']),
  body('specialRequests').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking
    const updateData = { ...req.body };
    updateData.lastModifiedBy = req.user._id;

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'guest', select: 'firstName lastName email phone' },
      { path: 'room', select: 'roomNumber roomType pricePerNight' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'lastModifiedBy', select: 'firstName lastName' }
    ]);

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: { booking: updatedBooking }
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/bookings/:id/check-in
// @desc    Check in guest
// @access  Private
router.put('/:id/check-in', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed bookings can be checked in'
      });
    }

    booking.status = 'checked_in';
    booking.checkInTime = new Date();
    booking.lastModifiedBy = req.user._id;

    await booking.save();

    res.json({
      success: true,
      message: 'Guest checked in successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/bookings/:id/check-out
// @desc    Check out guest
// @access  Private
router.put('/:id/check-out', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'checked_in') {
      return res.status(400).json({
        success: false,
        message: 'Only checked-in guests can be checked out'
      });
    }

    booking.status = 'checked_out';
    booking.checkOutTime = new Date();
    booking.lastModifiedBy = req.user._id;

    await booking.save();

    // Update room status to available
    await Room.findByIdAndUpdate(booking.room, { status: 'available' });

    res.json({
      success: true,
      message: 'Guest checked out successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put('/:id/cancel', auth, [
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (['checked_out', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a booking that is already checked out or cancelled'
      });
    }

    booking.status = 'cancelled';
    booking.cancellationDate = new Date();
    booking.cancellationReason = req.body.reason || 'No reason provided';
    booking.lastModifiedBy = req.user._id;

    await booking.save();

    // Update room status to available
    await Room.findByIdAndUpdate(booking.room, { status: 'available' });

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;