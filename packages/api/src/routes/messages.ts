import express from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../config/prisma';
import { authenticate } from '../middleware/jwt';
import { validate } from '../middleware/validate';

const router = express.Router();
router.use(authenticate);

// Send message
router.post(
  '/',
  validate([
    body('recipientId').isUUID(),
    body('body').trim().notEmpty().withMessage('Message body required'),
  ]),
  async (req, res) => {
    try {
      const { recipientId, body } = req.body;
      const senderId = req.user!.userId;

      if (senderId === recipientId) {
        return res.status(400).json({ success: false, error: { code: 'INVALID', message: 'Cannot message yourself' } });
      }

      const message = await prisma.message.create({
        data: {
          senderId,
          recipientId,
          body,
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          recipient: { select: { id: true, name: true, email: true } },
        },
      });

      return res.status(201).json({ success: true, data: message });
    } catch (error) {
      console.error('Create message error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' } });
    }
  }
);

// Get messages (conversations)
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientId: userId },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Group by conversation partner
    const conversations = new Map();
    messages.forEach((msg) => {
      const partnerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, {
          partner: msg.senderId === userId ? msg.recipient : msg.sender,
          lastMessage: msg,
          unreadCount: msg.senderId !== userId && !msg.readAt ? 1 : 0,
        });
      } else if (!msg.readAt && msg.senderId !== userId) {
        const conv = conversations.get(partnerId);
        conv.unreadCount++;
      }
    });

    return res.json({
      success: true,
      data: Array.from(conversations.values()),
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch conversations' } });
  }
});

// Get messages with specific user
router.get(
  '/:userId',
  validate([query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ max: 100 })]),
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const partnerId = req.params.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: {
            OR: [
              { senderId: userId, recipientId: partnerId },
              { senderId: partnerId, recipientId: userId },
            ],
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true, email: true } },
            recipient: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.message.count({
          where: {
            OR: [
              { senderId: userId, recipientId: partnerId },
              { senderId: partnerId, recipientId: userId },
            ],
          },
        }),
      ]);

      // Mark messages as read
      await prisma.message.updateMany({
        where: {
          recipientId: userId,
          senderId: partnerId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      return res.json({
        success: true,
        data: messages.reverse(), // oldest first
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: skip + messages.length < total,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get messages error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch messages' } });
    }
  }
);

export default router;
