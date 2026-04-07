import express from 'express';
import { requireRole } from '../middleware/jwt';
import { prisma } from '../config/prisma';

const router = express.Router();

// Get all users (ADMIN only)
router.get('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            customerLeads: true,
            itineraries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } });
  }
});

// Get all agents (for lead assignment)
router.get('/agents', requireRole('ADMIN', 'AGENT'), async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: agents });
  } catch (error) {
    console.error('Get agents error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch agents' } });
  }
});

export default router;
