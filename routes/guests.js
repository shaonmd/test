const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Guest = require('../models/Guest');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/guests
// @desc    Get all guests with filtering and pagination
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('loyaltyTier').optional().isIn(['bronze', 'silver', 'gold', 'platinum']),
  query('vipStatus').optional().isBoolean()
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
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    if (req.query.loyaltyTier) {
      filter['loyaltyProgram.tier'] = req.query.loyaltyTier;
    }

    if (req.query.vipStatus !== undefined) {
      filter.vipStatus = req.query.vipStatus === 'true';
    }

    const guests = await Guest.find(filter)
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Guest.countDocuments(filter);

    res.json({
      success: true,
      data: {
        guests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/guests/:id
// @desc    Get guest by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    res.json({
      success: true,
      data: { guest }
    });
  } catch (error) {
    console.error('Get guest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/guests
// @desc    Create a new guest
// @access  Private
router.post('/', auth, [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('nationality').optional().isString(),
  body('passportNumber').optional().isString()
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

    const { firstName, lastName, email, phone, dateOfBirth, nationality, passportNumber, address, emergencyContact, preferences } = req.body;

    // Check if guest already exists
    const existingGuest = await Guest.findOne({ email });
    if (existingGuest) {
      return res.status(400).json({
        success: false,
        message: 'Guest already exists with this email'
      });
    }

    const guest = new Guest({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      nationality,
      passportNumber,
      address,
      emergencyContact,
      preferences
    });

    await guest.save();

    res.status(201).json({
      success: true,
      message: 'Guest created successfully',
      data: { guest }
    });
  } catch (error) {
    console.error('Create guest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/guests/:id
// @desc    Update guest
// @access  Private
router.put('/:id', auth, [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required')
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

    const guest = await Guest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    res.json({
      success: true,
      message: 'Guest updated successfully',
      data: { guest }
    });
  } catch (error) {
    console.error('Update guest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/guests/:id/loyalty
// @desc    Update guest loyalty program
// @access  Private (Manager/Admin only)
router.put('/:id/loyalty', auth, authorize('manager', 'admin'), [
  body('tier').isIn(['bronze', 'silver', 'gold', 'platinum']).withMessage('Invalid loyalty tier'),
  body('points').optional().isInt({ min: 0 }).withMessage('Points must be non-negative')
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

    const { tier, points } = req.body;
    const updateData = {
      'loyaltyProgram.tier': tier
    };

    if (points !== undefined) {
      updateData['loyaltyProgram.points'] = points;
    }

    const guest = await Guest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    res.json({
      success: true,
      message: 'Loyalty program updated successfully',
      data: { guest }
    });
  } catch (error) {
    console.error('Update loyalty error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/guests/:id/vip
// @desc    Toggle VIP status
// @access  Private (Manager/Admin only)
router.put('/:id/vip', auth, authorize('manager', 'admin'), [
  body('vipStatus').isBoolean().withMessage('VIP status must be boolean')
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

    const guest = await Guest.findByIdAndUpdate(
      req.params.id,
      { vipStatus: req.body.vipStatus },
      { new: true }
    );

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    res.json({
      success: true,
      message: `Guest ${req.body.vipStatus ? 'granted' : 'removed'} VIP status`,
      data: { guest }
    });
  } catch (error) {
    console.error('Toggle VIP status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/guests/:id/notes
// @desc    Add note to guest
// @access  Private
router.post('/:id/notes', auth, [
  body('note').notEmpty().withMessage('Note is required')
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

    const guest = await Guest.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: {
            note: req.body.note,
            addedBy: req.user._id
          }
        }
      },
      { new: true }
    );

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { guest }
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;