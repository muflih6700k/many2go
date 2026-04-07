import express from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/jwt';
import { validate } from '../middleware/validate';

const router = express.Router();
router.use(authenticate, requireRole('AGENT', 'ADMIN'));

// Create reminder
router.post(
  '/',
  validate([
    body('leadId').isUUID().withMessage('Valid lead ID required'),
    body('note').trim().notEmpty().withMessage('Note is required'),
    body('dueAt').isISO8601().withMessage('Valid due date required'),
  ]),
  async (req, res) => {
    try {
      const { leadId, note, dueAt } = req.body;
      const agentId = req.user!.userId;

      const reminder = await prisma.reminder.create({
        data: {
          agentId,
          leadId,
          note,
          dueAt: new Date(dueAt),
        },
        include: {
          lead: {
            select: { id: true, status: true, customerId: true },
          },
        },
      });

      return res.status(201).json({ success: true, data: reminder });
    } catch (error) {
      console.error('Create reminder error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create reminder' } });
    }
  }
);

// Get reminders for agent
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ max: 100 }).toInt(),
    query('isDone').optional().isBoolean().toBoolean(),
  ]),
  async (req, res) => {
    try {
      const agentId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const isDone = req.query.isDone;
      const skip = (page - 1) * limit;

      const where: any = { agentId };
      if (isDone !== undefined) where.isDone = isDone;

      const [reminders, total] = await Promise.all([
        prisma.reminder.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { isDone: 'asc' },
            { dueAt: 'asc' },
          ],
          include: {
            lead: {
              include: {
                customer: { select: { id: true, name: true, email: true } },
              },
            },
          },
        }),
        prisma.reminder.count({ where }),
      ]);

      return res.json({
        success: true,
        data: reminders,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: skip + reminders.length < total,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get reminders error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reminders' } });
    }
  }
);

// Update reminder (mark done, edit note)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user!.userId;
    const { note, isDone, dueAt } = req.body;

    // Verify ownership
    const existing = await prisma.reminder.findFirst({
      where: { id, agentId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reminder not found' } });
    }

    const updateData: any = {};
    if (note !== undefined) updateData.note = note;
    if (isDone !== undefined) updateData.isDone = isDone;
    if (dueAt) updateData.dueAt = new Date(dueAt);

    const reminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return res.json({ success: true, data: reminder });
  } catch (error) {
    console.error('Update reminder error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update reminder' } });
  }
});

// Delete reminder
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user!.userId;

    const existing = await prisma.reminder.findFirst({
      where: { id, agentId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reminder not found' } });
    }

    await prisma.reminder.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Reminder deleted' } });
  } catch (error) {
    console.error('Delete reminder error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete reminder' } });
  }
});

export default router;
