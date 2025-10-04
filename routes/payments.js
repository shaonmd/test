const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/payments
// @desc    Get all payments with filtering and pagination
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded']),
  query('paymentMethod').optional().isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online', 'mobile_payment']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
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
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    
    if (req.query.startDate || req.query.endDate) {
      filter.processedAt = {};
      if (req.query.startDate) filter.processedAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.processedAt.$lte = new Date(req.query.endDate);
    }

    const payments = await Payment.find(filter)
      .populate('booking', 'bookingNumber checkIn checkOut')
      .populate('guest', 'firstName lastName email')
      .populate('processedBy', 'firstName lastName')
      .sort({ processedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking')
      .populate('guest')
      .populate('processedBy', 'firstName lastName')
      .populate('refundProcessedBy', 'firstName lastName');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/payments
// @desc    Create a new payment
// @access  Private
router.post('/', auth, [
  body('booking').isMongoId().withMessage('Valid booking ID is required'),
  body('guest').isMongoId().withMessage('Valid guest ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('paymentMethod').isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online', 'mobile_payment']).withMessage('Invalid payment method'),
  body('paymentType').optional().isIn(['deposit', 'full_payment', 'partial_payment', 'refund', 'additional_charge']),
  body('currency').optional().isString()
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

    const { booking, guest, amount, paymentMethod, paymentType, currency, cardDetails, bankDetails, notes } = req.body;

    // Verify booking exists
    const bookingData = await Booking.findById(booking);
    if (!bookingData) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify guest exists
    const guestData = await Booking.findById(guest);
    if (!guestData) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    const payment = new Payment({
      booking,
      guest,
      amount,
      paymentMethod,
      paymentType: paymentType || 'full_payment',
      currency: currency || 'USD',
      cardDetails,
      bankDetails,
      notes,
      processedBy: req.user._id,
      status: 'completed' // For now, assume all payments are completed
    });

    await payment.save();

    // Update booking payment status
    const totalPaid = await Payment.aggregate([
      { $match: { booking: bookingData._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const paidAmount = totalPaid.length > 0 ? totalPaid[0].total : 0;
    const balance = bookingData.totalAmount - paidAmount;

    let paymentStatus = 'pending';
    if (paidAmount >= bookingData.totalAmount) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    await Booking.findByIdAndUpdate(booking, {
      paidAmount,
      balance,
      paymentStatus
    });

    // Populate payment data for response
    await payment.populate([
      { path: 'booking', select: 'bookingNumber checkIn checkOut totalAmount' },
      { path: 'guest', select: 'firstName lastName email' },
      { path: 'processedBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/payments/:id/refund
// @desc    Process refund
// @access  Private (Manager/Admin only)
router.put('/:id/refund', auth, authorize('manager', 'admin'), [
  body('reason').notEmpty().withMessage('Refund reason is required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be positive')
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

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    const refundAmount = req.body.amount || payment.amount;

    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed original payment amount'
      });
    }

    payment.status = 'refunded';
    payment.refundReason = req.body.reason;
    payment.refundProcessedBy = req.user._id;
    payment.refundProcessedAt = new Date();

    await payment.save();

    // Update booking payment status
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      const totalPaid = await Payment.aggregate([
        { $match: { booking: booking._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const paidAmount = totalPaid.length > 0 ? totalPaid[0].total : 0;
      const balance = booking.totalAmount - paidAmount;

      let paymentStatus = 'pending';
      if (paidAmount >= booking.totalAmount) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      }

      await Booking.findByIdAndUpdate(booking._id, {
        paidAmount,
        balance,
        paymentStatus
      });
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/payments/summary/daily
// @desc    Get daily payment summary
// @access  Private (Manager/Admin only)
router.get('/summary/daily', auth, authorize('manager', 'admin'), [
  query('date').optional().isISO8601().withMessage('Valid date is required')
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

    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const summary = await Payment.aggregate([
      {
        $match: {
          processedAt: { $gte: startOfDay, $lte: endOfDay },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalAmount = summary.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalCount = summary.reduce((sum, item) => sum + item.count, 0);

    res.json({
      success: true,
      data: {
        date: startOfDay.toISOString().split('T')[0],
        summary,
        totals: {
          count: totalCount,
          amount: totalAmount
        }
      }
    });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;