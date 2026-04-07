import express from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/jwt';
import { validate } from '../middleware/validate';
import { BookingStatus } from '../types';

const router = express.Router();
router.use(authenticate);

// Create booking
router.post(
  '/',
  validate([body('itineraryId').isUUID().withMessage('Valid itinerary ID required')]),
  async (req, res) => {
    try {
      const { itineraryId } = req.body;
      const userId = req.user!.userId;

      // Verify itinerary exists
      const itinerary = await prisma.itinerary.findUnique({
        where: { id: itineraryId },
      });

      if (!itinerary) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } });
      }

      const booking = await prisma.booking.create({
        data: {
          itineraryId,
          status: 'PENDING',
          paidAmount: 0,
        },
        include: {
          itinerary: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      return res.status(201).json({ success: true, data: booking });
    } catch (error) {
      console.error('Create booking error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create booking' } });
    }
  }
);

// Get bookings with pagination
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ max: 100 }).toInt(),
    query('status').optional().isIn(Object.values(BookingStatus)),
  ]),
  async (req, res) => {
    try {
      const { user } = req;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as BookingStatus | undefined;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;

      // Filter by user's itineraries (customers) or all if admin
      if (user?.role === 'CUSTOMER') {
        where.itinerary = { userId: user.userId };
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            itinerary: {
              include: {
                _count: { select: { bookings: true } },
              },
            },
            revenues: true,
          },
        }),
        prisma.booking.count({ where }),
      ]);

      return res.json({
        success: true,
        data: bookings,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: skip + bookings.length < total,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch bookings' } });
    }
  }
);

// Update booking (ADMIN only for status/payment)
router.patch(
  '/:id',
  requireRole('ADMIN', 'AGENT'),
  validate([
    body('status').optional().isIn(Object.values(BookingStatus)),
    body('paidAmount').optional().isFloat({ min: 0 }),
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, paidAmount } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (paidAmount !== undefined) updateData.paidAmount = paidAmount;

      const booking = await prisma.booking.update({
        where: { id },
        data: updateData,
        include: {
          itinerary: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          revenues: true,
        },
      });

      return res.json({ success: true, data: booking });
    } catch (error) {
      console.error('Update booking error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update booking' } });
    }
  }
);

export default router;
