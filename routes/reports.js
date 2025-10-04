const express = require('express');
const { query, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const Guest = require('../models/Guest');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports/occupancy
// @desc    Get occupancy report
// @access  Private (Manager/Admin only)
router.get('/occupancy', auth, authorize('manager', 'admin'), [
  query('startDate').isISO8601().withMessage('Start date is required'),
  query('endDate').isISO8601().withMessage('End date is required'),
  query('groupBy').optional().isIn(['daily', 'weekly', 'monthly'])
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

    const { startDate, endDate, groupBy = 'daily' } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get total rooms
    const totalRooms = await Room.countDocuments();

    // Get occupancy data
    const occupancyData = await Booking.aggregate([
      {
        $match: {
          checkIn: { $lte: end },
          checkOut: { $gte: start },
          status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'daily' ? '%Y-%m-%d' : 
                      groupBy === 'weekly' ? '%Y-%U' : '%Y-%m',
              date: '$checkIn'
            }
          },
          occupiedRooms: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const report = occupancyData.map(item => ({
      period: item._id,
      occupiedRooms: item.occupiedRooms,
      totalRooms,
      occupancyRate: ((item.occupiedRooms / totalRooms) * 100).toFixed(2),
      revenue: item.revenue
    }));

    res.json({
      success: true,
      data: {
        report,
        summary: {
          totalRooms,
          averageOccupancy: report.length > 0 ? 
            (report.reduce((sum, item) => sum + parseFloat(item.occupancyRate), 0) / report.length).toFixed(2) : 0,
          totalRevenue: report.reduce((sum, item) => sum + item.revenue, 0)
        },
        period: { startDate, endDate, groupBy }
      }
    });
  } catch (error) {
    console.error('Get occupancy report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/revenue
// @desc    Get revenue report
// @access  Private (Manager/Admin only)
router.get('/revenue', auth, authorize('manager', 'admin'), [
  query('startDate').isISO8601().withMessage('Start date is required'),
  query('endDate').isISO8601().withMessage('End date is required'),
  query('groupBy').optional().isIn(['daily', 'weekly', 'monthly'])
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

    const { startDate, endDate, groupBy = 'daily' } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get revenue from payments
    const revenueData = await Payment.aggregate([
      {
        $match: {
          processedAt: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'daily' ? '%Y-%m-%d' : 
                      groupBy === 'weekly' ? '%Y-%U' : '%Y-%m',
              date: '$processedAt'
            }
          },
          totalRevenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          paymentMethods: {
            $push: {
              method: '$paymentMethod',
              amount: '$amount'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get revenue by room type
    const revenueByRoomType = await Payment.aggregate([
      {
        $match: {
          processedAt: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking',
          foreignField: '_id',
          as: 'bookingData'
        }
      },
      { $unwind: '$bookingData' },
      {
        $lookup: {
          from: 'rooms',
          localField: 'bookingData.room',
          foreignField: '_id',
          as: 'roomData'
        }
      },
      { $unwind: '$roomData' },
      {
        $group: {
          _id: '$roomData.roomType',
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        revenueData,
        revenueByRoomType,
        summary: {
          totalRevenue: revenueData.reduce((sum, item) => sum + item.totalRevenue, 0),
          totalPayments: revenueData.reduce((sum, item) => sum + item.paymentCount, 0),
          averagePayment: revenueData.length > 0 ? 
            revenueData.reduce((sum, item) => sum + item.totalRevenue, 0) / 
            revenueData.reduce((sum, item) => sum + item.paymentCount, 0) : 0
        },
        period: { startDate, endDate, groupBy }
      }
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/guests
// @desc    Get guest analytics report
// @access  Private (Manager/Admin only)
router.get('/guests', auth, authorize('manager', 'admin'), [
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

    const { startDate, endDate } = req.query;
    const matchFilter = {};

    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Guest statistics
    const guestStats = await Guest.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalGuests: { $sum: 1 },
          vipGuests: { $sum: { $cond: ['$vipStatus', 1, 0] } },
          blacklistedGuests: { $sum: { $cond: ['$isBlacklisted', 1, 0] } },
          averageStays: { $avg: '$totalStays' },
          averageSpent: { $avg: '$totalSpent' }
        }
      }
    ]);

    // Loyalty program distribution
    const loyaltyDistribution = await Guest.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$loyaltyProgram.tier',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top guests by spending
    const topSpenders = await Guest.find(matchFilter)
      .sort({ totalSpent: -1 })
      .limit(10)
      .select('firstName lastName email totalSpent totalStays loyaltyProgram.tier');

    // Guest nationality distribution
    const nationalityDistribution = await Guest.aggregate([
      { $match: { ...matchFilter, nationality: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$nationality',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        guestStats: guestStats[0] || {
          totalGuests: 0,
          vipGuests: 0,
          blacklistedGuests: 0,
          averageStays: 0,
          averageSpent: 0
        },
        loyaltyDistribution,
        topSpenders,
        nationalityDistribution,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Get guest report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/dashboard
// @desc    Get dashboard summary
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Today's check-ins
    const todaysCheckIns = await Booking.countDocuments({
      checkIn: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'checked_in'] }
    });

    // Today's check-outs
    const todaysCheckOuts = await Booking.countDocuments({
      checkOut: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['checked_in', 'checked_out'] }
    });

    // Current occupancy
    const currentOccupancy = await Booking.countDocuments({
      checkIn: { $lte: endOfDay },
      checkOut: { $gte: startOfDay },
      status: { $in: ['confirmed', 'checked_in'] }
    });

    // Total rooms
    const totalRooms = await Room.countDocuments();

    // Available rooms
    const availableRooms = await Room.countDocuments({ status: 'available' });

    // Today's revenue
    const todaysRevenue = await Payment.aggregate([
      {
        $match: {
          processedAt: { $gte: startOfDay, $lte: endOfDay },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Pending bookings
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });

    // VIP guests
    const vipGuests = await Guest.countDocuments({ vipStatus: true });

    res.json({
      success: true,
      data: {
        todaysCheckIns,
        todaysCheckOuts,
        currentOccupancy,
        totalRooms,
        availableRooms,
        occupancyRate: totalRooms > 0 ? ((currentOccupancy / totalRooms) * 100).toFixed(2) : 0,
        todaysRevenue: todaysRevenue.length > 0 ? todaysRevenue[0].total : 0,
        pendingBookings,
        vipGuests
      }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;