import express from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/jwt';
import { validate } from '../middleware/validate';

const router = express.Router();
router.use(authenticate, requireRole('AGENT', 'ADMIN'));

// Create revenue entry
router.post(
  '/',
  validate([
    body('bookingId').isUUID(),
    body('amount').isFloat({ min: 0 }),
  ]),
  async (req, res) => {
    try {
      const { bookingId, amount } = req.body;
      const agentId = req.user!.userId;

      const revenue = await prisma.revenue.create({
        data: {
          agentId,
          bookingId,
          amount,
        },
        include: {
          booking: {
            include: {
              itinerary: {
                include: {
                  user: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      });

      return res.status(201).json({ success: true, data: revenue });
    } catch (error) {
      console.error('Create revenue error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create revenue entry' } });
    }
  }
);

// Get revenue
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ max: 100 }),
  ]),
  async (req, res) => {
    try {
      const user = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const where: any = {};
      // Agents only see their own revenue
      if (user.role === 'AGENT') {
        where.agentId = user.userId;
      }

      const [revenues, total, totalRevenue] = await Promise.all([
        prisma.revenue.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            agent: { select: { id: true, name: true, email: true } },
            booking: {
              include: {
                itinerary: {
                  include: {
                    user: { select: { name: true } },
                  },
                },
              },
            },
          },
        }),
        prisma.revenue.count({ where }),
        prisma.revenue.aggregate({
          where,
          _sum: { amount: true },
        }),
      ]);

      return res.json({
        success: true,
        data: revenues,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: skip + revenues.length < total,
          hasPrevPage: page > 1,
          totalRevenue: totalRevenue._sum.amount || 0,
        },
      });
    } catch (error) {
      console.error('Get revenue error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch revenue' } });
    }
  }
);

export default router;
