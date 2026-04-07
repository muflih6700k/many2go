import express from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/jwt';
import { validate } from '../middleware/validate';
const LeadStatusValues = ['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'CLOSED'];

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create lead (any authenticated user)
router.post(
  '/',
  validate([body('notes').optional().trim()]),
  async (req, res) => {
    try {
      const { user } = req;
      const { notes } = req.body;

      const lead = await prisma.lead.create({
        data: {
          customerId: user!.userId,
          notes: notes || null,
        },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          agent: { select: { id: true, name: true, email: true } },
        },
      });

      return res.status(201).json({ success: true, data: lead });
    } catch (error) {
      console.error('Create lead error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create lead' } });
    }
  }
);

// Get leads with pagination
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ max: 100 }).toInt(),
    query('status').optional().isIn(LeadStatusValues),
  ]),
  async (req, res) => {
    try {
      const { user } = req;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const skip = (page - 1) * limit;

      // Build where clause based on role
      const where: any = {};
      if (status) where.status = status;
      
      // Customers only see their own leads
      if (user?.role === 'CUSTOMER') {
        where.customerId = user.userId;
      }

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true, email: true } },
            agent: { select: { id: true, name: true, email: true } },
            _count: { select: { reminders: true } },
          },
        }),
        prisma.lead.count({ where }),
      ]);

      return res.json({
        success: true,
        data: leads,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: skip + leads.length < total,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get leads error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch leads' } });
    }
  }
);

// Update lead (AGENT or ADMIN only for assignment/status)
router.patch(
  '/:id',
  requireRole('AGENT', 'ADMIN'),
  validate([
    body('status').optional().isIn(LeadStatusValues),
    body('agentId').optional().isUUID(),
    body('notes').optional().trim(),
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData: any = {};

      if (req.body.status) updateData.status = req.body.status;
      if (req.body.agentId) updateData.agentId = req.body.agentId;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;

      const lead = await prisma.lead.update({
        where: { id },
        data: updateData,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          agent: { select: { id: true, name: true, email: true } },
        },
      });

      return res.json({ success: true, data: lead });
    } catch (error) {
      console.error('Update lead error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update lead' } });
    }
  }
);

export default router;
