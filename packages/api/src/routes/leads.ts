import express from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/jwt';
import { validate } from '../middleware/validate';
const LeadStatusValues = ['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'CLOSED'];

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create lead (any authenticated user) - auto assigns to agent with fewest leads
router.post(
 '/',
 validate([body('phone').optional().trim(), body('notes').optional().trim(), body('name').optional().trim(), body('customerName').optional().trim()]),
 async (req, res) => {
 try {
 const { user } = req;
 const { phone, notes, name, customerName, source, email } = req.body;

 // Get the customer name from either field
 const leadName = name || customerName;

 // Find agent with fewest active leads (round-robin)
 const agents = await prisma.user.findMany({
 where: { role: 'AGENT' },
 });

 const leadCounts = await Promise.all(
 agents.map(async (agent) => {
 const count = await prisma.lead.count({
 where: { agentId: agent.id }
 });
 return { agent, count };
 })
 );

 const leastBusy = leadCounts.sort(
 (a, b) => a.count - b.count
)[0];

 const agentId = leastBusy?.agent.id;

 // Update customer name if provided and user is creating their own lead
 if (leadName && user?.userId) {
 await prisma.user.update({
 where: { id: user.userId },
 data: { name: leadName },
 });
 }

 // Also update email if provided
 if (email && user?.userId) {
 await prisma.user.update({
 where: { id: user.userId },
 data: { email: email.toLowerCase() },
 });
 }

 const lead = await prisma.lead.create({
 data: {
 customerId: user!.userId,
 name: leadName || null,
 phone: phone || null,
 notes: notes || null,
 agentId: agentId,
 callStatus: 'PENDING',
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

// Get follow-ups for today (AGENT or ADMIN)
router.get(
 '/followups',
 requireRole('AGENT', 'ADMIN'),
 async (req, res) => {
 try {
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 const leads = await prisma.lead.findMany({
 where: {
 callStatus: {
 in: ['CALL_BACK', 'FUTURE_FOLLOWUP', 'CM_BUSY_CALLBACK']
 },
 followUpDate: {
 lte: today
 }
 },
 orderBy: { followUpDate: 'asc' },
 include: {
 customer: { select: { id: true, name: true, email: true } },
 agent: { select: { id: true, name: true, email: true } },
 },
 });

 return res.json({ success: true, data: leads });
 } catch (error) {
 console.error('Get followups error:', error);
 return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch followups' } });
 }
 }
);

// Update lead (AGENT or ADMIN only for assignment/status)
router.patch(
 '/:id',
 requireRole('AGENT', 'ADMIN'),
 async (req, res) => {
 try {
 const { id } = req.params;
 const updateData: any = {};

 // Standard fields
 const standardFields = ['status', 'agentId', 'notes', 'phone', 'callStatus', 'callDate', 'callTime',
 'followUpDate', 'followUpTime', 'followUpNote',
 'cmNumber', 'destination', 'travelMonth', 'travelDate', 'returnDate',
 'daysPlanned', 'adults', 'kids', 'kidsAge',
 'mealsplan', 'hotelCategory', 'budget', 'travelFrom',
 'passportStatus', 'lastVacation', 'remarks', 'outcome'];

 standardFields.forEach(field => {
 if (req.body[field] !== undefined) {
 updateData[field] = req.body[field];
 }
 });

 // Boolean fields
 const booleanFields = ['whatsappCreated', 'itineraryShared', 'flightCostsSent', 'quoteSent'];
 booleanFields.forEach(field => {
 if (req.body[field] !== undefined) {
 updateData[field] = req.body[field];
 }
 });

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
