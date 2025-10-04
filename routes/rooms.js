const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Room = require('../models/Room');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/rooms
// @desc    Get all rooms with filtering and pagination
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('roomType').optional().isIn(['single', 'double', 'suite', 'deluxe', 'presidential']),
  query('status').optional().isIn(['available', 'occupied', 'maintenance', 'cleaning', 'out_of_order']),
  query('floor').optional().isInt({ min: 1, max: 50 }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 })
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
    if (req.query.roomType) filter.roomType = req.query.roomType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.floor) filter.floor = req.query.floor;
    if (req.query.minPrice || req.query.maxPrice) {
      filter.pricePerNight = {};
      if (req.query.minPrice) filter.pricePerNight.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.pricePerNight.$lte = parseFloat(req.query.maxPrice);
    }

    const rooms = await Room.find(filter)
      .sort({ roomNumber: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Room.countDocuments(filter);

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get room by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: { room }
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private (Admin/Manager only)
router.post('/', auth, authorize('admin', 'manager'), [
  body('roomNumber').notEmpty().withMessage('Room number is required'),
  body('roomType').isIn(['single', 'double', 'suite', 'deluxe', 'presidential']).withMessage('Invalid room type'),
  body('floor').isInt({ min: 1, max: 50 }).withMessage('Floor must be between 1 and 50'),
  body('capacity').isInt({ min: 1, max: 10 }).withMessage('Capacity must be between 1 and 10'),
  body('pricePerNight').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('bedType').optional().isIn(['single', 'double', 'queen', 'king', 'twin', 'sofa_bed']),
  body('size').optional().isFloat({ min: 0 }).withMessage('Size must be a positive number')
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

    const roomData = req.body;
    
    // Check if room number already exists
    const existingRoom = await Room.findOne({ roomNumber: roomData.roomNumber });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Room number already exists'
      });
    }

    const room = new Room(roomData);
    await room.save();

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { room }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/rooms/:id
// @desc    Update room
// @access  Private (Admin/Manager only)
router.put('/:id', auth, authorize('admin', 'manager'), [
  body('roomType').optional().isIn(['single', 'double', 'suite', 'deluxe', 'presidential']),
  body('floor').optional().isInt({ min: 1, max: 50 }),
  body('capacity').optional().isInt({ min: 1, max: 10 }),
  body('pricePerNight').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['available', 'occupied', 'maintenance', 'cleaning', 'out_of_order'])
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

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: { room }
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete room
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/rooms/:id/status
// @desc    Update room status
// @access  Private
router.put('/:id/status', auth, [
  body('status').isIn(['available', 'occupied', 'maintenance', 'cleaning', 'out_of_order']).withMessage('Invalid status'),
  body('notes').optional().isString()
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

    const { status, notes } = req.body;
    const updateData = { status };

    if (notes) {
      updateData.$push = {
        maintenanceNotes: {
          note: notes,
          reportedBy: req.user._id
        }
      };
    }

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      message: 'Room status updated successfully',
      data: { room }
    });
  } catch (error) {
    console.error('Update room status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/rooms/available/search
// @desc    Search available rooms for booking
// @access  Private
router.get('/available/search', auth, [
  query('checkIn').isISO8601().withMessage('Check-in date must be valid'),
  query('checkOut').isISO8601().withMessage('Check-out date must be valid'),
  query('guests').optional().isInt({ min: 1 }).withMessage('Number of guests must be positive'),
  query('roomType').optional().isIn(['single', 'double', 'suite', 'deluxe', 'presidential'])
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

    const { checkIn, checkOut, guests, roomType } = req.query;
    
    // Build filter for available rooms
    const filter = {
      status: 'available',
      capacity: { $gte: parseInt(guests) || 1 }
    };

    if (roomType) filter.roomType = roomType;

    // TODO: Add logic to check for existing bookings that overlap with the requested dates
    // This would require checking the Booking model for conflicts

    const rooms = await Room.find(filter).sort({ pricePerNight: 1 });

    res.json({
      success: true,
      data: { rooms },
      searchCriteria: {
        checkIn,
        checkOut,
        guests: guests || 1,
        roomType: roomType || 'any'
      }
    });
  } catch (error) {
    console.error('Search available rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;