import express from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/jwt';
import { validate } from '../middleware/validate';
import { ItineraryStatus } from '../types';
import { generateItineraryPDF } from '../services/pdfService';

const router = express.Router();
router.use(authenticate);

// Create itinerary
router.post(
  '/',
  validate([
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('days').isArray({ min: 1 }).withMessage('At least one day required'),
  ]),
  async (req, res) => {
    try {
      const { title, days } = req.body;
      const userId = req.user!.userId;

      const itinerary = await prisma.itinerary.create({
        data: {
          userId,
          title,
          days: days as any,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return res.status(201).json({ success: true, data: itinerary });
    } catch (error) {
      console.error('Create itinerary error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create itinerary' } });
    }
  }
);

// Get itineraries with pagination
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ max: 100 }).toInt(),
  ]),
  async (req, res) => {
    try {
      const { user } = req;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      
      // Non-admins only see their own
      if (user?.role !== 'ADMIN') {
        where.userId = user?.userId;
      }

      const [itineraries, total] = await Promise.all([
        prisma.itinerary.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            _count: { select: { bookings: true } },
          },
        }),
        prisma.itinerary.count({ where }),
      ]);

      return res.json({
        success: true,
        data: itineraries,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: skip + itineraries.length < total,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get itineraries error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch itineraries' } });
    }
  }
);

// Update itinerary status (ADMIN only for finalization)
router.patch(
  '/:id',
  validate([
    body('title').optional().trim(),
    body('status').optional().isIn(Object.values(ItineraryStatus)),
    body('pdfUrl').optional().trim(),
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, status, pdfUrl } = req.body;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Check if user owns itinerary or is admin
      const existing = await prisma.itinerary.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } });
      }

      if (existing.userId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
      }

      const updateData: any = {};
      if (title) updateData.title = title;
      if (status) updateData.status = status;
      if (pdfUrl) updateData.pdfUrl = pdfUrl;

      const itinerary = await prisma.itinerary.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return res.json({ success: true, data: itinerary });
    } catch (error) {
      console.error('Update itinerary error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update itinerary' } });
    }
  }
);

// Generate PDF for itinerary
router.post(
  '/:id/pdf',
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Check if user owns itinerary or is agent/admin
      const itinerary = await prisma.itinerary.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!itinerary) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } });
      }

      // CUSTOMER can only access own, AGENT/ADMIN can access all
      if (user.role === 'CUSTOMER' && itinerary.userId !== user.userId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to access this itinerary' } });
      }

      const pdfUrl = await generateItineraryPDF(id);
      
      return res.json({ 
        success: true, 
        data: { url: pdfUrl } 
      });
    } catch (error) {
      console.error('Generate PDF error:', error);
      return res.status(500).json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate PDF' } 
      });
    }
  }
);

export default router;
