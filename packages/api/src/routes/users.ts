import express from 'express';
import { authenticate, requireRole } from '../middleware/jwt';
import { prisma } from '../config/prisma';
import { UserRole } from '../types';

const router = express.Router();

// Get all users (ADMIN only) - supports ?role=AGENT filter
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
 try {
 const { role } = req.query;

 const users = await prisma.user.findMany({
 where: role ? { role: role as UserRole } : undefined,
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
